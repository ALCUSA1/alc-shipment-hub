
-- Trigger: notify user when a new shipment_charge is inserted
CREATE OR REPLACE FUNCTION public.notify_on_new_charge()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid;
  _ship_ref text;
BEGIN
  SELECT s.user_id, s.shipment_ref INTO _user_id, _ship_ref
  FROM public.shipments s WHERE s.id = NEW.shipment_id;

  IF _user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    _user_id,
    'New Charge: ' || initcap(replace(NEW.charge_type, '_', ' ')) || ' — $' || NEW.amount || ' ' || NEW.currency,
    NEW.description || ' has been applied to shipment ' || COALESCE(_ship_ref, NEW.shipment_id::text) || '.',
    'charge',
    jsonb_build_object('shipment_id', NEW.shipment_id, 'charge_id', NEW.id, 'amount', NEW.amount, 'currency', NEW.currency, 'charge_type', NEW.charge_type)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_new_charge
  AFTER INSERT ON public.shipment_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_charge();

-- Add payment tracking columns to shipment_charges
ALTER TABLE public.shipment_charges ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.shipment_charges ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id);
