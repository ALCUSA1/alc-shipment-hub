
CREATE OR REPLACE FUNCTION public.derive_shipment_status_from_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _status text;
  _substatus text;
  _internal_code text;
  _category text;
  _classifier text;
BEGIN
  SELECT te.internal_event_code, cem.status_category, COALESCE(cem.internal_classifier, 'actual')
  INTO _internal_code, _category, _classifier
  FROM public.tracking_events te
  LEFT JOIN public.carrier_event_mappings cem
    ON cem.internal_code = te.internal_event_code
    AND cem.event_classifier_code = te.event_classifier_code
    AND cem.active = true
  WHERE te.shipment_id = NEW.shipment_id
    AND COALESCE(te.event_classifier_code, 'ACT') IN ('ACT', 'EST')
  ORDER BY te.event_date DESC, te.created_at DESC
  LIMIT 1;

  IF _internal_code IS NULL THEN
    RETURN NEW;
  END IF;

  IF _classifier = 'planned' THEN
    RETURN NEW;
  END IF;

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
$function$;
