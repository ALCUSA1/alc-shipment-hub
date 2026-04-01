
-- Extend bookings table with DCSA lifecycle columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS carrier_booking_request_reference text,
  ADD COLUMN IF NOT EXISTS amended_booking_status text,
  ADD COLUMN IF NOT EXISTS submission_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS updated_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS booking_request_created_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS booking_request_updated_datetime timestamptz,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS invoice_payable_at text,
  ADD COLUMN IF NOT EXISTS expected_departure_date date,
  ADD COLUMN IF NOT EXISTS expected_arrival_date date,
  ADD COLUMN IF NOT EXISTS transport_document_type_code text,
  ADD COLUMN IF NOT EXISTS is_partial_load_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_export_declaration_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_import_license_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS communication_channel_code text,
  ADD COLUMN IF NOT EXISTS is_equipment_substitution_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vessel_imo_number text,
  ADD COLUMN IF NOT EXISTS pre_carriage_mode text,
  ADD COLUMN IF NOT EXISTS dcsa_version text;

CREATE INDEX IF NOT EXISTS idx_bookings_carrier_request_ref ON public.bookings (carrier_booking_request_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_amended_status ON public.bookings (amended_booking_status);

-- booking_parties
CREATE TABLE IF NOT EXISTS public.booking_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  party_function text NOT NULL,
  party_name text NOT NULL,
  address_line_1 text,
  address_line_2 text,
  city text,
  state_region text,
  postal_code text,
  country_code text,
  tax_id text,
  contact_name text,
  contact_email text,
  contact_phone text,
  identifying_codes jsonb,
  is_to_be_notified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_parties_booking ON public.booking_parties (booking_id);
CREATE INDEX idx_booking_parties_function ON public.booking_parties (party_function);

ALTER TABLE public.booking_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read booking_parties" ON public.booking_parties FOR SELECT TO authenticated USING (true);

-- booking_locations
CREATE TABLE IF NOT EXISTS public.booking_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  location_type text NOT NULL,
  location_id uuid REFERENCES public.alc_locations(id),
  un_location_code text,
  facility_code text,
  facility_code_list_provider text,
  address_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_locations_booking ON public.booking_locations (booking_id);
CREATE INDEX idx_booking_locations_type ON public.booking_locations (location_type);

ALTER TABLE public.booking_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read booking_locations" ON public.booking_locations FOR SELECT TO authenticated USING (true);

-- booking_commodities
CREATE TABLE IF NOT EXISTS public.booking_commodities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  commodity_type text,
  commodity_subreference text,
  description_of_goods text,
  hs_code text,
  weight numeric,
  weight_unit text DEFAULT 'KGM',
  volume numeric,
  volume_unit text DEFAULT 'MTQ',
  number_of_packages integer,
  package_code text,
  package_name_on_bl text,
  export_license_required boolean DEFAULT false,
  export_license_expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_commodities_booking ON public.booking_commodities (booking_id);
CREATE INDEX idx_booking_commodities_hs ON public.booking_commodities (hs_code);

ALTER TABLE public.booking_commodities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read booking_commodities" ON public.booking_commodities FOR SELECT TO authenticated USING (true);

-- updated_at triggers
CREATE TRIGGER set_booking_parties_updated_at BEFORE UPDATE ON public.booking_parties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_booking_locations_updated_at BEFORE UPDATE ON public.booking_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_booking_commodities_updated_at BEFORE UPDATE ON public.booking_commodities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
