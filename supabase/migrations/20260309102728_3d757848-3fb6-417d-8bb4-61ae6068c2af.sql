
-- Trigger: notify on shipment status change
CREATE OR REPLACE FUNCTION public.notify_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _title text;
  _message text;
  _type text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    _type := 'shipment_update';
    _title := 'Shipment ' || COALESCE(NEW.shipment_ref, NEW.id::text) || ' — ' || initcap(replace(NEW.status, '_', ' '));
    _message := 'Status changed from ' || initcap(replace(OLD.status, '_', ' ')) || ' to ' || initcap(replace(NEW.status, '_', ' '));

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      NEW.user_id,
      _title,
      _message,
      _type,
      jsonb_build_object('shipment_id', NEW.id, 'shipment_ref', NEW.shipment_ref, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_shipment_status
AFTER UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_status_change();

-- Trigger: notify on new document uploaded
CREATE OR REPLACE FUNCTION public.notify_on_document_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ship_ref text;
BEGIN
  SELECT shipment_ref INTO _ship_ref FROM public.shipments WHERE id = NEW.shipment_id;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    NEW.user_id,
    'Document Ready: ' || initcap(replace(NEW.doc_type, '_', ' ')),
    initcap(replace(NEW.doc_type, '_', ' ')) || ' is now available for shipment ' || COALESCE(_ship_ref, NEW.shipment_id::text),
    'document_ready',
    jsonb_build_object('shipment_id', NEW.shipment_id, 'document_id', NEW.id, 'doc_type', NEW.doc_type)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_document_ready
AFTER INSERT ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_document_ready();

-- Trigger: notify on payment status change
CREATE OR REPLACE FUNCTION public.notify_on_payment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ship_ref text;
  _title text;
  _message text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT s.shipment_ref INTO _ship_ref
    FROM public.shipments s WHERE s.id = NEW.shipment_id;

    IF NEW.status = 'completed' OR NEW.status = 'succeeded' THEN
      _title := 'Payment Received — $' || NEW.amount || ' ' || NEW.currency;
      _message := 'Payment of $' || NEW.amount || ' ' || NEW.currency || ' has been confirmed for shipment ' || COALESCE(_ship_ref, COALESCE(NEW.shipment_id::text, 'N/A'));
    ELSE
      _title := 'Payment Update — ' || initcap(NEW.status);
      _message := 'Payment status changed to ' || initcap(NEW.status) || ' for $' || NEW.amount || ' ' || NEW.currency;
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      NEW.user_id,
      _title,
      _message,
      'payment',
      jsonb_build_object('shipment_id', NEW.shipment_id, 'payment_id', NEW.id, 'amount', NEW.amount, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_payment_update
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_payment_update();

-- Trigger: notify on new tracking event
CREATE OR REPLACE FUNCTION public.notify_on_tracking_event()
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

  IF _user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    _user_id,
    'Tracking: ' || NEW.milestone,
    COALESCE(NEW.milestone, '') || COALESCE(' at ' || NEW.location, '') || ' — ' || COALESCE(_ship_ref, NEW.shipment_id::text),
    'tracking_update',
    jsonb_build_object('shipment_id', NEW.shipment_id, 'milestone', NEW.milestone, 'location', NEW.location)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_tracking_event
AFTER INSERT ON public.tracking_events
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_tracking_event();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
