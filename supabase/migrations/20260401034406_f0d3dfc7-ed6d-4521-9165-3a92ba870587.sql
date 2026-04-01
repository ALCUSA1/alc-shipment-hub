
-- ═══════════════════════════════════════════════
-- DCSA eBL Surrender API v3.0 — Tables
-- ═══════════════════════════════════════════════

-- 1. surrender_requests
CREATE TABLE public.surrender_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.shipments(id),
  booking_id uuid REFERENCES public.bookings(id),
  shipping_instruction_id uuid REFERENCES public.shipping_instructions(id),
  transport_document_id uuid REFERENCES public.transport_documents(id),
  issuance_id uuid REFERENCES public.issuance_records(id),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  surrender_request_reference text,
  transport_document_reference text,
  transport_document_sub_reference text,
  surrender_request_code text,
  reason_code text,
  comments text,
  surrender_status_internal text DEFAULT 'draft',
  request_submitted_at timestamptz,
  callback_received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_surrender_requests_carrier ON public.surrender_requests(alc_carrier_id);
CREATE INDEX idx_surrender_requests_shipment ON public.surrender_requests(shipment_id);
CREATE INDEX idx_surrender_requests_td ON public.surrender_requests(transport_document_id);
CREATE INDEX idx_surrender_requests_ref ON public.surrender_requests(surrender_request_reference);
CREATE INDEX idx_surrender_requests_td_ref ON public.surrender_requests(transport_document_reference);
CREATE INDEX idx_surrender_requests_code ON public.surrender_requests(surrender_request_code);
CREATE INDEX idx_surrender_requests_reason ON public.surrender_requests(reason_code);
CREATE INDEX idx_surrender_requests_status ON public.surrender_requests(surrender_status_internal);

CREATE TRIGGER set_surrender_requests_updated BEFORE UPDATE ON public.surrender_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. surrender_endorsement_chain
CREATE TABLE public.surrender_endorsement_chain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surrender_request_id uuid NOT NULL REFERENCES public.surrender_requests(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  sequence_number int NOT NULL DEFAULT 0,
  action_datetime timestamptz,
  action_code text,
  actor_ebl_platform text,
  actor_party_name text,
  actor_party_code text,
  actor_code_list_provider text,
  actor_code_list_name text,
  actor_tax_reference_type text,
  actor_tax_reference_country text,
  actor_tax_reference_value text,
  recipient_ebl_platform text,
  recipient_party_name text,
  recipient_party_code text,
  recipient_code_list_provider text,
  recipient_code_list_name text,
  recipient_tax_reference_type text,
  recipient_tax_reference_country text,
  recipient_tax_reference_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_surrender_endorsement_req ON public.surrender_endorsement_chain(surrender_request_id);

CREATE TRIGGER set_surrender_endorsement_updated BEFORE UPDATE ON public.surrender_endorsement_chain
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. surrender_responses
CREATE TABLE public.surrender_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surrender_request_id uuid NOT NULL REFERENCES public.surrender_requests(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  surrender_response_code text,
  surrender_response_message text,
  response_status_internal text,
  callback_received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_surrender_responses_req ON public.surrender_responses(surrender_request_id);
CREATE INDEX idx_surrender_responses_code ON public.surrender_responses(surrender_response_code);

CREATE TRIGGER set_surrender_responses_updated BEFORE UPDATE ON public.surrender_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. surrender_errors
CREATE TABLE public.surrender_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surrender_request_id uuid NOT NULL REFERENCES public.surrender_requests(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  error_code text,
  property_name text,
  property_value text,
  json_path text,
  error_code_text text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_surrender_errors_req ON public.surrender_errors(surrender_request_id);

CREATE TRIGGER set_surrender_errors_updated BEFORE UPDATE ON public.surrender_errors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. surrender_code_mappings
CREATE TABLE public.surrender_code_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  code_type text NOT NULL,
  external_code text NOT NULL,
  external_name text,
  internal_status text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_surrender_code_carrier ON public.surrender_code_mappings(alc_carrier_id);
CREATE INDEX idx_surrender_code_type ON public.surrender_code_mappings(code_type);
CREATE INDEX idx_surrender_code_ext ON public.surrender_code_mappings(external_code);

CREATE TRIGGER set_surrender_code_mappings_updated BEFORE UPDATE ON public.surrender_code_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seed global code mappings ──
INSERT INTO public.surrender_code_mappings (alc_carrier_id, code_type, external_code, external_name, internal_status, description) VALUES
  (NULL, 'surrender_request_code', 'SREQ', 'Surrender Request', 'surrender_requested', 'Standard eBL surrender request'),
  (NULL, 'surrender_request_code', 'SWTP', 'Switch to Paper', 'switch_to_paper', 'Request to switch eBL to paper B/L'),
  (NULL, 'surrender_reason_code', 'AMENDMENT', 'Amendment', 'amendment_requested', 'Surrender for document amendment'),
  (NULL, 'surrender_reason_code', 'DELIVERY', 'Delivery', 'delivery_surrender_requested', 'Surrender for cargo delivery'),
  (NULL, 'surrender_reason_code', 'SWITCH', 'Switch to Paper', 'switch_to_paper', 'Surrender to switch to paper document'),
  (NULL, 'surrender_response_code', 'SURR', 'Surrendered', 'accepted', 'Surrender request accepted'),
  (NULL, 'surrender_response_code', 'SREJ', 'Surrender Rejected', 'rejected', 'Surrender request rejected'),
  (NULL, 'surrender_response_code', 'SCMP', 'Surrender Completed', 'completed', 'Surrender process completed'),
  (NULL, 'surrender_response_code', 'SPND', 'Surrender Pending', 'pending', 'Surrender request pending review');

-- ── RLS ──
ALTER TABLE public.surrender_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surrender_endorsement_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surrender_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surrender_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surrender_code_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view surrender_requests" ON public.surrender_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert surrender_requests" ON public.surrender_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update surrender_requests" ON public.surrender_requests FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view surrender_endorsement_chain" ON public.surrender_endorsement_chain FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert surrender_endorsement_chain" ON public.surrender_endorsement_chain FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view surrender_responses" ON public.surrender_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert surrender_responses" ON public.surrender_responses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view surrender_errors" ON public.surrender_errors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert surrender_errors" ON public.surrender_errors FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view surrender_code_mappings" ON public.surrender_code_mappings FOR SELECT TO authenticated USING (true);

-- Service role bypass for edge functions (all tables)
CREATE POLICY "Service role full access surrender_requests" ON public.surrender_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access surrender_endorsement_chain" ON public.surrender_endorsement_chain FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access surrender_responses" ON public.surrender_responses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access surrender_errors" ON public.surrender_errors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access surrender_code_mappings" ON public.surrender_code_mappings FOR ALL TO service_role USING (true) WITH CHECK (true);
