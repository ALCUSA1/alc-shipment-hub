
-- Function to derive shipment current_status and current_substatus from latest tracking event
CREATE OR REPLACE FUNCTION public.derive_shipment_status_from_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _status text;
  _substatus text;
  _internal_code text;
  _category text;
BEGIN
  -- Get the latest meaningful tracking event for this shipment
  SELECT te.internal_event_code, cem.status_category
  INTO _internal_code, _category
  FROM public.tracking_events te
  LEFT JOIN public.carrier_event_mappings cem
    ON cem.internal_code = te.internal_event_code AND cem.active = true
  WHERE te.shipment_id = NEW.shipment_id
  ORDER BY te.event_date DESC, te.created_at DESC
  LIMIT 1;

  IF _internal_code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map internal event codes to shipment status
  CASE _category
    WHEN 'booked' THEN _status := 'booked'; _substatus := _internal_code;
    WHEN 'departed' THEN _status := 'in_transit'; _substatus := _internal_code;
    WHEN 'in_transit' THEN _status := 'in_transit'; _substatus := _internal_code;
    WHEN 'arrived' THEN _status := 'in_transit'; _substatus := _internal_code;
    WHEN 'discharged' THEN _status := 'in_transit'; _substatus := 'discharged';
    WHEN 'delivered' THEN _status := 'delivered'; _substatus := _internal_code;
    WHEN 'gate_activity' THEN _status := COALESCE((SELECT status FROM shipments WHERE id = NEW.shipment_id), 'in_transit'); _substatus := _internal_code;
    ELSE _status := NULL; _substatus := _internal_code;
  END CASE;

  IF _status IS NOT NULL THEN
    UPDATE public.shipments
    SET current_substatus = _substatus
    WHERE id = NEW.shipment_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-derive status when tracking events are inserted
CREATE TRIGGER trg_derive_status_on_tracking_event
AFTER INSERT ON public.tracking_events
FOR EACH ROW
EXECUTE FUNCTION public.derive_shipment_status_from_events();

-- Container_id column on tracking_events needs FK if missing
-- (already exists per schema, skip)

-- Add index on tracking_events for status derivation queries
CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment_date ON public.tracking_events (shipment_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_container_seals_container ON public.container_seals (container_id);
CREATE INDEX IF NOT EXISTS idx_shipment_references_value ON public.shipment_references (reference_value);
CREATE INDEX IF NOT EXISTS idx_transport_calls_vessel ON public.transport_calls (vessel_id);
