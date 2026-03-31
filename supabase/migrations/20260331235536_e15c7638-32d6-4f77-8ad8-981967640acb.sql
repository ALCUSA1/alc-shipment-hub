
-- ============================================================
-- Issuance data model: issuance_records + issuance_response_codes
-- Plus schema extensions for issuance_id linkage
-- ============================================================

-- 1. issuance_response_codes (lookup table)
CREATE TABLE IF NOT EXISTS public.issuance_response_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  response_code text NOT NULL,
  response_name text,
  response_description text,
  status_category text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_issuance_response_codes_code ON public.issuance_response_codes(response_code);
CREATE INDEX idx_issuance_response_codes_carrier ON public.issuance_response_codes(alc_carrier_id);

ALTER TABLE public.issuance_response_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on issuance_response_codes"
  ON public.issuance_response_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. issuance_records
CREATE TABLE IF NOT EXISTS public.issuance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.shipments(id),
  booking_id uuid REFERENCES public.bookings(id),
  shipping_instruction_id uuid REFERENCES public.shipping_instructions(id),
  transport_document_id uuid REFERENCES public.transport_documents(id),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  issuance_reference text,
  issuance_status text DEFAULT 'pending',
  issuance_response_code text,
  issuance_response_message text,
  ebill_identifier text,
  ebill_platform text,
  issuance_requested_at timestamptz,
  issuance_completed_at timestamptz,
  issuer_name text,
  receiver_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_issuance_records_reference ON public.issuance_records(issuance_reference);
CREATE INDEX idx_issuance_records_ebill ON public.issuance_records(ebill_identifier);
CREATE INDEX idx_issuance_records_carrier ON public.issuance_records(alc_carrier_id);
CREATE INDEX idx_issuance_records_status ON public.issuance_records(issuance_status);
CREATE INDEX idx_issuance_records_completed ON public.issuance_records(issuance_completed_at);
CREATE INDEX idx_issuance_records_td ON public.issuance_records(transport_document_id);
CREATE INDEX idx_issuance_records_shipment ON public.issuance_records(shipment_id);

ALTER TABLE public.issuance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on issuance_records"
  ON public.issuance_records FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Add issuance_id to shipments
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS issuance_id uuid REFERENCES public.issuance_records(id);

-- 4. Add issuance_id to shipment_references
ALTER TABLE public.shipment_references ADD COLUMN IF NOT EXISTS issuance_id uuid REFERENCES public.issuance_records(id);

-- 5. Add issuance_id to documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS issuance_id uuid REFERENCES public.issuance_records(id);

-- 6. Add issuance_id to shipment_parties
ALTER TABLE public.shipment_parties ADD COLUMN IF NOT EXISTS issuance_id uuid REFERENCES public.issuance_records(id);

-- Updated_at triggers
CREATE TRIGGER set_updated_at_issuance_records BEFORE UPDATE ON public.issuance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_issuance_response_codes BEFORE UPDATE ON public.issuance_response_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
