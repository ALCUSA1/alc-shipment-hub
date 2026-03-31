
-- ============================================================
-- MULTI-CARRIER OCEAN FREIGHT DATA MODEL
-- Layer 1: Raw carrier intake
-- Layer 2: Canonical normalized ALC
-- Layer 3: Display (views on normalized tables)
-- ============================================================

-- 1. carriers – master list of shipping lines
CREATE TABLE public.alc_carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_code text NOT NULL UNIQUE,
  carrier_name text NOT NULL,
  mode text NOT NULL DEFAULT 'ocean',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. carrier_connections – API connection settings per carrier
CREATE TABLE public.carrier_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.alc_carriers(id) ON DELETE CASCADE,
  environment text NOT NULL DEFAULT 'production',
  integration_type text NOT NULL DEFAULT 'rest_api',
  base_url text,
  auth_type text NOT NULL DEFAULT 'api_key',
  credential_key_name text,
  status text NOT NULL DEFAULT 'active',
  last_success_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. carrier_raw_messages – exact raw API payloads (untouched)
CREATE TABLE public.carrier_raw_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.alc_carriers(id) ON DELETE CASCADE,
  source_channel text NOT NULL DEFAULT 'api',
  message_family text NOT NULL,
  message_type text NOT NULL,
  external_reference text,
  payload_format text NOT NULL DEFAULT 'json',
  request_payload_json jsonb,
  response_payload_json jsonb,
  headers_json jsonb,
  http_status int,
  processing_status text NOT NULL DEFAULT 'pending',
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. integration_jobs – transformation job tracking
CREATE TABLE public.integration_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_message_id uuid NOT NULL REFERENCES public.carrier_raw_messages(id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.alc_carriers(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  job_status text NOT NULL DEFAULT 'pending',
  attempt_count int NOT NULL DEFAULT 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. carrier_event_mappings – map carrier event codes to internal ALC codes
CREATE TABLE public.carrier_event_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.alc_carriers(id) ON DELETE CASCADE,
  message_family text NOT NULL,
  external_code text NOT NULL,
  external_name text,
  internal_code text NOT NULL,
  internal_name text NOT NULL,
  status_category text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carrier_id, message_family, external_code)
);

-- 6. locations – normalized ports, terminals, inland locations
CREATE TABLE public.alc_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unlocode text,
  facility_code text,
  location_name text,
  city text,
  state text,
  country text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_alc_locations_unlocode ON public.alc_locations(unlocode) WHERE unlocode IS NOT NULL;

-- 7. vessels – vessel master data
CREATE TABLE public.alc_vessels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid REFERENCES public.alc_carriers(id) ON DELETE SET NULL,
  vessel_name text NOT NULL,
  imo_number text,
  mmsi text,
  operator_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_alc_vessels_imo ON public.alc_vessels(imo_number) WHERE imo_number IS NOT NULL;

-- 8. Add carrier_id to existing shipments table
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS alc_carrier_id uuid REFERENCES public.alc_carriers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_reference_type text,
  ADD COLUMN IF NOT EXISTS primary_reference_value text,
  ADD COLUMN IF NOT EXISTS current_substatus text,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS origin_location_id uuid REFERENCES public.alc_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pol_location_id uuid REFERENCES public.alc_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pod_location_id uuid REFERENCES public.alc_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_location_id uuid REFERENCES public.alc_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS atd timestamptz,
  ADD COLUMN IF NOT EXISTS ata timestamptz;

-- 9. shipment_references – multiple references per shipment
CREATE TABLE public.shipment_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.alc_carriers(id) ON DELETE SET NULL,
  reference_type text NOT NULL,
  reference_value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  source_message_id uuid REFERENCES public.carrier_raw_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Add carrier columns to existing containers table
ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS alc_carrier_id uuid REFERENCES public.alc_carriers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipment_reference text,
  ADD COLUMN IF NOT EXISTS iso_equipment_code text,
  ADD COLUMN IF NOT EXISTS equipment_size_type text;

-- 11. Add carrier columns to existing tracking_events table
ALTER TABLE public.tracking_events
  ADD COLUMN IF NOT EXISTS alc_carrier_id uuid REFERENCES public.alc_carriers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raw_message_id uuid REFERENCES public.carrier_raw_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_scope text DEFAULT 'shipment',
  ADD COLUMN IF NOT EXISTS external_event_code text,
  ADD COLUMN IF NOT EXISTS external_event_name text,
  ADD COLUMN IF NOT EXISTS internal_event_code text,
  ADD COLUMN IF NOT EXISTS internal_event_name text,
  ADD COLUMN IF NOT EXISTS event_classifier_code text,
  ADD COLUMN IF NOT EXISTS event_created_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.alc_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transport_call_id uuid,
  ADD COLUMN IF NOT EXISTS vessel_id uuid REFERENCES public.alc_vessels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_payload_json jsonb;

-- 12. transport_calls – vessel/voyage/port call movement
CREATE TABLE public.transport_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.alc_carriers(id) ON DELETE SET NULL,
  vessel_id uuid REFERENCES public.alc_vessels(id) ON DELETE SET NULL,
  voyage_number text,
  transport_call_sequence int,
  location_id uuid REFERENCES public.alc_locations(id) ON DELETE SET NULL,
  facility_code text,
  planned_arrival timestamptz,
  planned_departure timestamptz,
  actual_arrival timestamptz,
  actual_departure timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK from tracking_events.transport_call_id -> transport_calls
ALTER TABLE public.tracking_events
  ADD CONSTRAINT tracking_events_transport_call_fk
  FOREIGN KEY (transport_call_id) REFERENCES public.transport_calls(id) ON DELETE SET NULL;

-- 13. Add carrier columns to existing documents table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS alc_carrier_id uuid REFERENCES public.alc_carriers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_reference text,
  ADD COLUMN IF NOT EXISTS source_message_id uuid REFERENCES public.carrier_raw_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb;

-- 14. seals – container seal information
CREATE TABLE public.container_seals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid NOT NULL REFERENCES public.containers(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.alc_carriers(id) ON DELETE SET NULL,
  seal_number text NOT NULL,
  seal_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- carrier_raw_messages
CREATE INDEX idx_crm_carrier ON public.carrier_raw_messages(carrier_id);
CREATE INDEX idx_crm_status ON public.carrier_raw_messages(processing_status);
CREATE INDEX idx_crm_received ON public.carrier_raw_messages(received_at DESC);
CREATE INDEX idx_crm_external_ref ON public.carrier_raw_messages(external_reference) WHERE external_reference IS NOT NULL;

-- integration_jobs
CREATE INDEX idx_ij_status ON public.integration_jobs(job_status);
CREATE INDEX idx_ij_carrier ON public.integration_jobs(carrier_id);

-- carrier_event_mappings
CREATE INDEX idx_cem_carrier ON public.carrier_event_mappings(carrier_id);

-- shipments carrier fields
CREATE INDEX idx_shipments_alc_carrier ON public.shipments(alc_carrier_id) WHERE alc_carrier_id IS NOT NULL;
CREATE INDEX idx_shipments_primary_ref ON public.shipments(primary_reference_value) WHERE primary_reference_value IS NOT NULL;

-- shipment_references
CREATE INDEX idx_sr_shipment ON public.shipment_references(shipment_id);
CREATE INDEX idx_sr_ref_value ON public.shipment_references(reference_value);
CREATE INDEX idx_sr_ref_type_value ON public.shipment_references(reference_type, reference_value);

-- containers carrier fields
CREATE INDEX idx_containers_alc_carrier ON public.containers(alc_carrier_id) WHERE alc_carrier_id IS NOT NULL;

-- tracking_events carrier fields
CREATE INDEX idx_te_alc_carrier ON public.tracking_events(alc_carrier_id) WHERE alc_carrier_id IS NOT NULL;
CREATE INDEX idx_te_event_scope ON public.tracking_events(event_scope) WHERE event_scope IS NOT NULL;
CREATE INDEX idx_te_internal_code ON public.tracking_events(internal_event_code) WHERE internal_event_code IS NOT NULL;

-- transport_calls
CREATE INDEX idx_tc_shipment ON public.transport_calls(shipment_id);
CREATE INDEX idx_tc_vessel ON public.transport_calls(vessel_id) WHERE vessel_id IS NOT NULL;

-- alc_locations
CREATE INDEX idx_alc_loc_country ON public.alc_locations(country) WHERE country IS NOT NULL;

-- alc_vessels
CREATE INDEX idx_alc_vessels_carrier ON public.alc_vessels(carrier_id) WHERE carrier_id IS NOT NULL;

-- container_seals
CREATE INDEX idx_seals_container ON public.container_seals(container_id);

-- documents carrier fields
CREATE INDEX idx_docs_alc_carrier ON public.documents(alc_carrier_id) WHERE alc_carrier_id IS NOT NULL;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at_alc_carriers BEFORE UPDATE ON public.alc_carriers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_carrier_connections BEFORE UPDATE ON public.carrier_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_carrier_raw_messages BEFORE UPDATE ON public.carrier_raw_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_integration_jobs BEFORE UPDATE ON public.integration_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_carrier_event_mappings BEFORE UPDATE ON public.carrier_event_mappings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_alc_locations BEFORE UPDATE ON public.alc_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_alc_vessels BEFORE UPDATE ON public.alc_vessels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_shipment_references BEFORE UPDATE ON public.shipment_references FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_transport_calls BEFORE UPDATE ON public.transport_calls FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_container_seals BEFORE UPDATE ON public.container_seals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS – admin-only for carrier infrastructure tables
-- ============================================================
ALTER TABLE public.alc_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_raw_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_event_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alc_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alc_vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_seals ENABLE ROW LEVEL SECURITY;

-- Carriers/locations/vessels: readable by all authenticated
CREATE POLICY "Authenticated read alc_carriers" ON public.alc_carriers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read alc_locations" ON public.alc_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read alc_vessels" ON public.alc_vessels FOR SELECT TO authenticated USING (true);

-- Admin-only write for infrastructure tables
CREATE POLICY "Admin manage alc_carriers" ON public.alc_carriers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage carrier_connections" ON public.carrier_connections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage carrier_raw_messages" ON public.carrier_raw_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage integration_jobs" ON public.integration_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage carrier_event_mappings" ON public.carrier_event_mappings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage alc_locations" ON public.alc_locations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage alc_vessels" ON public.alc_vessels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Shipment-linked tables: viewable by shipment participants
CREATE POLICY "Shipment viewers read references" ON public.shipment_references FOR SELECT TO authenticated USING (public.can_view_shipment(shipment_id));
CREATE POLICY "Shipment viewers read transport_calls" ON public.transport_calls FOR SELECT TO authenticated USING (public.can_view_shipment(shipment_id));
CREATE POLICY "Shipment viewers read container_seals" ON public.container_seals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.containers c WHERE c.id = container_id AND public.can_view_shipment(c.shipment_id)));

-- Admin write for shipment-linked tables
CREATE POLICY "Admin manage shipment_references" ON public.shipment_references FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage transport_calls" ON public.transport_calls FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manage container_seals" ON public.container_seals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- SEED: Evergreen as first carrier
-- ============================================================
INSERT INTO public.alc_carriers (carrier_code, carrier_name, mode, status)
VALUES ('EGLV', 'Evergreen Line', 'ocean', 'active')
ON CONFLICT (carrier_code) DO NOTHING;
