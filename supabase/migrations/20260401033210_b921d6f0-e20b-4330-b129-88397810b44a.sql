
-- 1. Create issuance_errors table
CREATE TABLE public.issuance_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issuance_record_id UUID REFERENCES public.issuance_records(id) ON DELETE CASCADE NOT NULL,
  alc_carrier_id UUID REFERENCES public.alc_carriers(id),
  source_message_id UUID REFERENCES public.carrier_raw_messages(id),
  error_code TEXT,
  property_name TEXT,
  property_value TEXT,
  json_path TEXT,
  error_code_text TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.issuance_errors ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_issuance_errors_issuance_record_id ON public.issuance_errors(issuance_record_id);
CREATE INDEX idx_issuance_errors_carrier_id ON public.issuance_errors(alc_carrier_id);

-- 2. Create issuance_response_code_mappings table
CREATE TABLE public.issuance_response_code_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alc_carrier_id UUID REFERENCES public.alc_carriers(id),
  external_response_code TEXT NOT NULL,
  external_response_name TEXT,
  internal_status TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.issuance_response_code_mappings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_issuance_response_mappings_carrier ON public.issuance_response_code_mappings(alc_carrier_id);
CREATE INDEX idx_issuance_response_mappings_code ON public.issuance_response_code_mappings(external_response_code);
CREATE UNIQUE INDEX idx_issuance_response_mappings_unique ON public.issuance_response_code_mappings(alc_carrier_id, external_response_code) WHERE alc_carrier_id IS NOT NULL;

-- 3. Add issuance_status_internal and transport_document_reference to issuance_records if not present
ALTER TABLE public.issuance_records
  ADD COLUMN IF NOT EXISTS issuance_status_internal TEXT,
  ADD COLUMN IF NOT EXISTS transport_document_reference TEXT,
  ADD COLUMN IF NOT EXISTS response_received_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_issuance_records_td_ref ON public.issuance_records(transport_document_reference);
CREATE INDEX IF NOT EXISTS idx_issuance_records_status_internal ON public.issuance_records(issuance_status_internal);

-- 4. Seed default carrier-agnostic mappings (null carrier_id = global defaults)
INSERT INTO public.issuance_response_code_mappings (alc_carrier_id, external_response_code, external_response_name, internal_status, description) VALUES
  (NULL, 'ISSU', 'Issued', 'issued', 'eBL has been successfully issued'),
  (NULL, 'REJE', 'Rejected', 'rejected', 'eBL issuance was rejected'),
  (NULL, 'PEND', 'Pending', 'pending', 'eBL issuance is pending processing'),
  (NULL, 'FAIL', 'Failed', 'failed', 'eBL issuance failed due to an error')
ON CONFLICT DO NOTHING;

-- 5. RLS policies for service role and authenticated users
CREATE POLICY "Service role full access on issuance_errors" ON public.issuance_errors FOR ALL USING (true);
CREATE POLICY "Service role full access on issuance_response_code_mappings" ON public.issuance_response_code_mappings FOR ALL USING (true);

-- 6. Triggers for updated_at
CREATE TRIGGER set_updated_at_issuance_errors BEFORE UPDATE ON public.issuance_errors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_issuance_response_code_mappings BEFORE UPDATE ON public.issuance_response_code_mappings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
