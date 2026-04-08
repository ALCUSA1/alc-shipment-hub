
-- Function to get all shipment IDs visible to the current user (own + linked via customer_user_links)
CREATE OR REPLACE FUNCTION public.get_customer_visible_shipment_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- User's own shipments
  SELECT id FROM public.shipments WHERE user_id = auth.uid()
  UNION
  -- Shipments linked via customer_user_links (forwarder created for customer)
  SELECT s.id FROM public.shipments s
  JOIN public.customer_user_links cul ON cul.customer_id = s.customer_id AND cul.company_id = s.company_id
  WHERE cul.user_id = auth.uid() AND s.customer_id IS NOT NULL
  UNION
  -- Shipments visible via company membership
  SELECT s.id FROM public.shipments s
  JOIN public.company_members cm ON cm.company_id = s.company_id
  WHERE cm.user_id = auth.uid() AND cm.is_active = true
$$;

-- Trigger function to notify linked customers when shipment is booked
CREATE OR REPLACE FUNCTION public.notify_customer_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cul record;
  _ref text;
BEGIN
  -- Only fire when lifecycle moves to 'booked'
  IF NEW.lifecycle_stage <> 'booked' OR OLD.lifecycle_stage = 'booked' THEN
    RETURN NEW;
  END IF;

  -- Only if shipment has a customer_id
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  _ref := COALESCE(NEW.shipment_ref, NEW.id::text);

  -- Notify all users linked to this customer
  FOR _cul IN
    SELECT cul.user_id FROM public.customer_user_links cul
    WHERE cul.customer_id = NEW.customer_id
      AND cul.company_id = NEW.company_id
      AND cul.user_id <> NEW.user_id  -- Don't notify the forwarder who booked it
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, severity, metadata)
    VALUES (
      _cul.user_id,
      'New Shipment Booked For You',
      'Shipment ' || _ref || ' from ' || COALESCE(NEW.origin_port, '') || ' to ' || COALESCE(NEW.destination_port, '') || ' has been booked on your behalf. You can now arrange trucking and other services.',
      'customer_booking',
      'info',
      jsonb_build_object(
        'shipment_id', NEW.id,
        'shipment_ref', _ref,
        'origin', NEW.origin_port,
        'destination', NEW.destination_port,
        'mode', NEW.mode
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach the trigger
CREATE TRIGGER trg_notify_customer_on_booking
  AFTER UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_on_booking();
