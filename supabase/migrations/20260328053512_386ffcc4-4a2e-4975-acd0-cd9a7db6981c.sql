CREATE OR REPLACE FUNCTION public.validate_lifecycle_transition()
RETURNS trigger
LANGUAGE plpgsql
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