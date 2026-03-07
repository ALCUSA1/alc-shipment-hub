
-- Function to sync demurrage charges into shipment_financials
CREATE OR REPLACE FUNCTION public.sync_demurrage_to_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _ship_ref text;
  _desc text;
BEGIN
  -- Get user_id and shipment_ref from the shipment
  SELECT s.user_id, s.shipment_ref INTO _user_id, _ship_ref
  FROM public.shipments s WHERE s.id = NEW.shipment_id;

  IF _user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build description
  _desc := initcap(replace(NEW.charge_type, '_', ' '));
  IF NEW.container_number IS NOT NULL THEN
    _desc := _desc || ' — ' || NEW.container_number;
  END IF;
  IF NEW.carrier IS NOT NULL THEN
    _desc := _desc || ' (' || NEW.carrier || ')';
  END IF;

  -- Upsert into shipment_financials using demurrage charge id as a stable key via invoice_ref
  INSERT INTO public.shipment_financials (
    shipment_id, user_id, entry_type, category, description, amount, currency, vendor, invoice_ref, date
  ) VALUES (
    NEW.shipment_id,
    _user_id,
    'cost',
    'demurrage_detention',
    _desc,
    NEW.total_amount,
    NEW.currency,
    NEW.carrier,
    'DD-' || NEW.id,
    COALESCE(NEW.start_date, CURRENT_DATE)
  )
  ON CONFLICT (id) DO NOTHING;

  -- Since we can't conflict on invoice_ref (no unique constraint), update if exists
  UPDATE public.shipment_financials
  SET amount = NEW.total_amount,
      description = _desc,
      currency = NEW.currency,
      vendor = NEW.carrier,
      date = COALESCE(NEW.start_date, CURRENT_DATE),
      updated_at = now()
  WHERE invoice_ref = 'DD-' || NEW.id
    AND shipment_id = NEW.shipment_id;

  -- If no row was updated, insert
  IF NOT FOUND THEN
    INSERT INTO public.shipment_financials (
      shipment_id, user_id, entry_type, category, description, amount, currency, vendor, invoice_ref, date
    ) VALUES (
      NEW.shipment_id,
      _user_id,
      'cost',
      'demurrage_detention',
      _desc,
      NEW.total_amount,
      NEW.currency,
      NEW.carrier,
      'DD-' || NEW.id,
      COALESCE(NEW.start_date, CURRENT_DATE)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on demurrage_charges for insert and update
CREATE TRIGGER sync_demurrage_financials
AFTER INSERT OR UPDATE ON public.demurrage_charges
FOR EACH ROW
EXECUTE FUNCTION public.sync_demurrage_to_financials();

-- Also handle deletion: remove the corresponding financial entry
CREATE OR REPLACE FUNCTION public.remove_demurrage_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.shipment_financials
  WHERE invoice_ref = 'DD-' || OLD.id
    AND shipment_id = OLD.shipment_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER remove_demurrage_financials
AFTER DELETE ON public.demurrage_charges
FOR EACH ROW
EXECUTE FUNCTION public.remove_demurrage_financial();
