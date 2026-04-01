
ALTER TABLE public.carrier_event_mappings
  ADD COLUMN IF NOT EXISTS event_scope text DEFAULT 'shipment',
  ADD COLUMN IF NOT EXISTS event_classifier_code text,
  ADD COLUMN IF NOT EXISTS internal_classifier text;

ALTER TABLE public.carrier_event_mappings
  DROP CONSTRAINT IF EXISTS carrier_event_mappings_carrier_id_message_family_external_c_key;

ALTER TABLE public.carrier_event_mappings
  ADD CONSTRAINT carrier_event_mappings_carrier_family_code_classifier_key
  UNIQUE (carrier_id, message_family, external_code, event_classifier_code);

CREATE INDEX IF NOT EXISTS idx_carrier_event_mappings_classifier
  ON public.carrier_event_mappings (carrier_id, external_code, event_classifier_code)
  WHERE active = true;
