-- Fix the auto_create_milestone_on_lifecycle function - tracking_events has no 'status' column
CREATE OR REPLACE FUNCTION public.auto_create_milestone_on_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _milestone text;
BEGIN
  IF OLD.lifecycle_stage IS NOT DISTINCT FROM NEW.lifecycle_stage THEN
    RETURN NEW;
  END IF;

  CASE NEW.lifecycle_stage
    WHEN 'pending_pricing' THEN _milestone := 'pricing_requested';
    WHEN 'quote_ready' THEN _milestone := 'pricing_completed';
    WHEN 'awaiting_approval' THEN _milestone := 'quote_submitted';
    WHEN 'booked' THEN _milestone := 'booking_confirmed';
    WHEN 'in_transit' THEN _milestone := 'departed';
    WHEN 'delivered' THEN _milestone := 'delivered';
    WHEN 'closed' THEN _milestone := 'closed';
    WHEN 'cancelled' THEN _milestone := 'cancelled';
    ELSE _milestone := NULL;
  END CASE;

  IF _milestone IS NOT NULL THEN
    INSERT INTO public.tracking_events (shipment_id, milestone, location, source, created_at)
    VALUES (NEW.id, _milestone, NULL, 'system', now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Now fix lifecycle_stage for all existing shipments
-- Disable lifecycle-related triggers to prevent cascading issues
ALTER TABLE public.shipments DISABLE TRIGGER trg_validate_lifecycle;
ALTER TABLE public.shipments DISABLE TRIGGER trg_auto_milestone;
ALTER TABLE public.shipments DISABLE TRIGGER trg_auto_notify_lifecycle;
ALTER TABLE public.shipments DISABLE TRIGGER trg_auto_tasks_lifecycle;
ALTER TABLE public.shipments DISABLE TRIGGER trg_log_lifecycle;

UPDATE public.shipments SET lifecycle_stage = 
  CASE status
    WHEN 'draft' THEN 'draft'
    WHEN 'pending_pricing' THEN 'pending_pricing'
    WHEN 'quote_ready' THEN 'quote_ready'
    WHEN 'awaiting_approval' THEN 'awaiting_approval'
    WHEN 'booked' THEN 'booked'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'arrived' THEN 'delivered'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'closed' THEN 'closed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'draft'
  END
WHERE lifecycle_stage IS DISTINCT FROM 
  CASE status
    WHEN 'draft' THEN 'draft'
    WHEN 'pending_pricing' THEN 'pending_pricing'
    WHEN 'quote_ready' THEN 'quote_ready'
    WHEN 'awaiting_approval' THEN 'awaiting_approval'
    WHEN 'booked' THEN 'booked'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'arrived' THEN 'delivered'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'closed' THEN 'closed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'draft'
  END;

UPDATE public.shipments SET status = 'delivered' WHERE status = 'arrived';

ALTER TABLE public.shipments ENABLE TRIGGER trg_validate_lifecycle;
ALTER TABLE public.shipments ENABLE TRIGGER trg_auto_milestone;
ALTER TABLE public.shipments ENABLE TRIGGER trg_auto_notify_lifecycle;
ALTER TABLE public.shipments ENABLE TRIGGER trg_auto_tasks_lifecycle;
ALTER TABLE public.shipments ENABLE TRIGGER trg_log_lifecycle;