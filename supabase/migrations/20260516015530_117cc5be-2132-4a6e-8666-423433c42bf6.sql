CREATE OR REPLACE FUNCTION public.validate_lifecycle_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _valid boolean := false;
BEGIN
  IF OLD.lifecycle_stage IS NOT DISTINCT FROM NEW.lifecycle_stage THEN
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_stage = 'cancelled' THEN
    RETURN NEW;
  END IF;

  CASE OLD.lifecycle_stage
    WHEN 'draft' THEN _valid := NEW.lifecycle_stage IN ('pending_pricing', 'cancelled');
    WHEN 'pending_pricing' THEN _valid := NEW.lifecycle_stage IN ('quote_ready', 'cancelled');
    WHEN 'quote_ready' THEN _valid := NEW.lifecycle_stage IN ('booked', 'pending_pricing', 'cancelled');
    WHEN 'booked' THEN _valid := NEW.lifecycle_stage IN ('in_transit', 'cancelled');
    WHEN 'in_transit' THEN _valid := NEW.lifecycle_stage IN ('delivered', 'cancelled');
    WHEN 'delivered' THEN _valid := NEW.lifecycle_stage IN ('closed');
    WHEN 'awaiting_approval' THEN _valid := NEW.lifecycle_stage IN ('booked', 'quote_ready', 'pending_pricing', 'cancelled');
    ELSE _valid := false;
  END CASE;

  IF NOT _valid THEN
    RAISE EXCEPTION 'Invalid lifecycle transition from % to %', OLD.lifecycle_stage, NEW.lifecycle_stage;
  END IF;

  RETURN NEW;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_events_shipment_milestone_source
  ON public.tracking_events (shipment_id, milestone, source)
  WHERE source = 'system';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_status') THEN
    CREATE TYPE public.company_status AS ENUM ('active', 'inactive', 'prospect', 'suspended');
  END IF;
END$$;