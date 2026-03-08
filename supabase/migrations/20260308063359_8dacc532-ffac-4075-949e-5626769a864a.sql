
-- Create admin_alerts table for platform-wide critical alerts
CREATE TABLE public.admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL DEFAULT 'info',
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  message text NOT NULL,
  source_table text,
  source_id uuid,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view alerts
CREATE POLICY "Admins can view all alerts"
  ON public.admin_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update alerts (resolve)
CREATE POLICY "Admins can update alerts"
  ON public.admin_alerts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow triggers/service role to insert
CREATE POLICY "Service can insert alerts"
  ON public.admin_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;

-- Trigger: EDI message errors
CREATE OR REPLACE FUNCTION public.alert_on_edi_error()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'error' AND (OLD IS NULL OR OLD.status <> 'error') THEN
    INSERT INTO public.admin_alerts (alert_type, severity, title, message, source_table, source_id, metadata)
    VALUES (
      'edi_error',
      'critical',
      'EDI Processing Error',
      'EDI message ' || COALESCE(NEW.message_ref, NEW.id::text) || ' for carrier ' || NEW.carrier || ' failed: ' || COALESCE(NEW.error_message, 'Unknown error'),
      'edi_messages',
      NEW.id,
      jsonb_build_object('carrier', NEW.carrier, 'message_type', NEW.message_type, 'direction', NEW.direction)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_edi_error_alert
  AFTER INSERT OR UPDATE ON public.edi_messages
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_edi_error();

-- Trigger: Payment failures
CREATE OR REPLACE FUNCTION public.alert_on_payment_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'failed' AND (OLD IS NULL OR OLD.status <> 'failed') THEN
    INSERT INTO public.admin_alerts (alert_type, severity, title, message, source_table, source_id, metadata)
    VALUES (
      'payment_failure',
      'critical',
      'Payment Failed',
      'Payment of $' || NEW.amount || ' ' || NEW.currency || ' failed for user ' || NEW.user_id::text,
      'payments',
      NEW.id,
      jsonb_build_object('amount', NEW.amount, 'currency', NEW.currency, 'user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_failure_alert
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_payment_failure();

-- Trigger: Stuck shipments (booked but no update in 7+ days)
-- This will be checked via a scheduled function, but we also alert on status regression
CREATE OR REPLACE FUNCTION public.alert_on_shipment_stuck()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Alert if shipment has been in 'booked' status and updated_at is old
  IF NEW.status = 'booked' AND NEW.updated_at < (now() - interval '7 days') AND OLD.updated_at = NEW.updated_at THEN
    INSERT INTO public.admin_alerts (alert_type, severity, title, message, source_table, source_id, metadata)
    VALUES (
      'stuck_shipment',
      'warning',
      'Stuck Shipment Detected',
      'Shipment ' || NEW.shipment_ref || ' has been in "booked" status for over 7 days without updates',
      'shipments',
      NEW.id,
      jsonb_build_object('shipment_ref', NEW.shipment_ref, 'status', NEW.status, 'user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shipment_stuck_alert
  AFTER UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.alert_on_shipment_stuck();
