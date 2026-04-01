
-- ═══════════════════════════════════════════════════
-- 1. Extend bookings table with remaining DCSA fields
-- ═══════════════════════════════════════════════════

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_status_internal text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS contract_quotation_reference text,
  ADD COLUMN IF NOT EXISTS carrier_service_name text,
  ADD COLUMN IF NOT EXISTS carrier_service_code text,
  ADD COLUMN IF NOT EXISTS universal_service_reference text,
  ADD COLUMN IF NOT EXISTS carrier_export_voyage_number text,
  ADD COLUMN IF NOT EXISTS universal_export_voyage_reference text,
  ADD COLUMN IF NOT EXISTS vessel_name text,
  ADD COLUMN IF NOT EXISTS freight_payment_term_code text,
  ADD COLUMN IF NOT EXISTS inco_terms text,
  ADD COLUMN IF NOT EXISTS transport_document_reference text,
  ADD COLUMN IF NOT EXISTS booking_channel_reference text,
  ADD COLUMN IF NOT EXISTS export_declaration_reference text,
  ADD COLUMN IF NOT EXISTS declared_value numeric,
  ADD COLUMN IF NOT EXISTS declared_value_currency text,
  ADD COLUMN IF NOT EXISTS expected_arrival_at_place_of_delivery_start_date date,
  ADD COLUMN IF NOT EXISTS expected_arrival_at_place_of_delivery_end_date date,
  ADD COLUMN IF NOT EXISTS cargo_movement_type_at_origin text,
  ADD COLUMN IF NOT EXISTS cargo_movement_type_at_destination text,
  ADD COLUMN IF NOT EXISTS invoice_payable_at_location_id uuid REFERENCES public.alc_locations(id),
  ADD COLUMN IF NOT EXISTS place_of_bl_issue_location_id uuid REFERENCES public.alc_locations(id);

CREATE INDEX IF NOT EXISTS idx_bookings_carrier_id ON public.bookings (alc_carrier_id);
CREATE INDEX IF NOT EXISTS idx_bookings_shipment_id ON public.bookings (shipment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_status_internal ON public.bookings (booking_status_internal);

-- ═══════════════════════════════════════════════════
-- 2. Rebuild booking_parties
-- ═══════════════════════════════════════════════════

DROP TABLE IF EXISTS public.booking_parties CASCADE;

CREATE TABLE public.booking_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.shipments(id),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  party_role text NOT NULL,
  party_name text NOT NULL,
  party_reference text,
  unlocation_code text,
  address_line1 text,
  address_line2 text,
  city text,
  state_region text,
  postal_code text,
  country_code text,
  contact_name text,
  contact_email text,
  contact_phone text,
  code_list_provider text,
  party_code text,
  tax_reference_type text,
  tax_reference_value text,
  purchase_order_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_parties_booking_id ON public.booking_parties (booking_id);
ALTER TABLE public.booking_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read booking_parties" ON public.booking_parties FOR SELECT TO authenticated USING (true);
CREATE TRIGGER set_booking_parties_ts BEFORE UPDATE ON public.booking_parties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════
-- 3. Rebuild booking_locations
-- ═══════════════════════════════════════════════════

DROP TABLE IF EXISTS public.booking_locations CASCADE;

CREATE TABLE public.booking_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.shipments(id),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  location_id uuid REFERENCES public.alc_locations(id),
  location_type_code text NOT NULL,
  location_name_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_locations_booking_id ON public.booking_locations (booking_id);
ALTER TABLE public.booking_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read booking_locations" ON public.booking_locations FOR SELECT TO authenticated USING (true);
CREATE TRIGGER set_booking_locations_ts BEFORE UPDATE ON public.booking_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════
-- 4. Extend booking_equipments
-- ═══════════════════════════════════════════════════

ALTER TABLE public.booking_equipments
  ADD COLUMN IF NOT EXISTS shipment_id uuid REFERENCES public.shipments(id),
  ADD COLUMN IF NOT EXISTS is_non_operating_reefer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tare_weight_value numeric,
  ADD COLUMN IF NOT EXISTS tare_weight_unit text,
  ADD COLUMN IF NOT EXISTS cargo_gross_weight_value numeric,
  ADD COLUMN IF NOT EXISTS cargo_gross_weight_unit text,
  ADD COLUMN IF NOT EXISTS equipment_reference_type text,
  ADD COLUMN IF NOT EXISTS equipment_reference_value text,
  ADD COLUMN IF NOT EXISTS empty_pickup_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS empty_pickup_location_id uuid REFERENCES public.alc_locations(id),
  ADD COLUMN IF NOT EXISTS container_positioning_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS container_positioning_location_id uuid REFERENCES public.alc_locations(id),
  ADD COLUMN IF NOT EXISTS units integer DEFAULT 1;

-- ═══════════════════════════════════════════════════
-- 5. Rebuild booking_commodities
-- ═══════════════════════════════════════════════════

DROP TABLE IF EXISTS public.booking_commodities CASCADE;

CREATE TABLE public.booking_commodities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_equipment_id uuid REFERENCES public.booking_equipments(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.shipments(id),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  commodity_sub_reference text,
  commodity_type text,
  hs_code text,
  cargo_gross_weight_value numeric,
  cargo_gross_weight_unit text DEFAULT 'KGM',
  cargo_gross_volume_value numeric,
  cargo_gross_volume_unit text DEFAULT 'MTQ',
  cargo_net_weight_value numeric,
  cargo_net_weight_unit text,
  cargo_net_volume_value numeric,
  cargo_net_volume_unit text,
  package_code text,
  number_of_packages integer,
  package_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_commodities_equip ON public.booking_commodities (booking_equipment_id);
CREATE INDEX idx_booking_commodities_booking ON public.booking_commodities (booking_id);
ALTER TABLE public.booking_commodities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read booking_commodities" ON public.booking_commodities FOR SELECT TO authenticated USING (true);
CREATE TRIGGER set_booking_commodities_ts BEFORE UPDATE ON public.booking_commodities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════
-- 6. Create booking_customs_references
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.booking_customs_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.shipments(id),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  customs_reference_type text NOT NULL,
  country_code text,
  reference_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_customs_refs_booking ON public.booking_customs_references (booking_id);
ALTER TABLE public.booking_customs_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read booking_customs_references" ON public.booking_customs_references FOR SELECT TO authenticated USING (true);
CREATE TRIGGER set_booking_customs_refs_ts BEFORE UPDATE ON public.booking_customs_references FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════
-- 7. Create booking_notifications
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  notification_id text,
  notification_type text,
  notification_source text,
  notification_time timestamptz,
  booking_status text,
  amended_booking_status text,
  carrier_booking_request_reference text,
  carrier_booking_reference text,
  subscription_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_notif_booking ON public.booking_notifications (booking_id);
CREATE INDEX idx_booking_notif_req_ref ON public.booking_notifications (carrier_booking_request_reference);
CREATE INDEX idx_booking_notif_bk_ref ON public.booking_notifications (carrier_booking_reference);
ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read booking_notifications" ON public.booking_notifications FOR SELECT TO authenticated USING (true);
CREATE TRIGGER set_booking_notif_ts BEFORE UPDATE ON public.booking_notifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
