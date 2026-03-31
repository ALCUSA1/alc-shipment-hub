
-- =============================================
-- MULTI-CARRIER BOOKING DATA MODEL
-- =============================================

-- 1. bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  carrier_booking_number text,
  booking_status text DEFAULT 'pending',
  booking_request_status text,
  booking_confirmation_status text,
  amendment_number int DEFAULT 0,
  booking_date timestamptz,
  receipt_type_at_origin text,
  delivery_type_at_destination text,
  service_contract_reference text,
  payment_term_code text,
  quotation_reference text,
  requested_equipment_count int DEFAULT 0,
  requested_container_count int DEFAULT 0,
  requested_commodity_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage bookings" ON public.bookings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (
    shipment_id IS NULL
    OR public.can_view_shipment(shipment_id)
  );

CREATE INDEX idx_bookings_carrier_booking_number ON public.bookings(carrier_booking_number);
CREATE INDEX idx_bookings_booking_status ON public.bookings(booking_status);
CREATE INDEX idx_bookings_alc_carrier_id ON public.bookings(alc_carrier_id);
CREATE INDEX idx_bookings_shipment_id ON public.bookings(shipment_id);

-- 2. booking_equipments table
CREATE TABLE IF NOT EXISTS public.booking_equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  equipment_type_code text,
  iso_equipment_code text,
  equipment_description text,
  quantity int DEFAULT 1,
  is_shipper_owned boolean DEFAULT false,
  temperature_setting text,
  ventilation_setting text,
  humidity_setting text,
  gross_weight numeric,
  volume numeric,
  dangerous_goods_flag boolean DEFAULT false,
  overdimension_flag boolean DEFAULT false,
  reefer_flag boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage booking_equipments" ON public.booking_equipments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view booking_equipments" ON public.booking_equipments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id
      AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
  ));

CREATE INDEX idx_booking_equipments_booking_id ON public.booking_equipments(booking_id);

-- 3. cargo_details table
CREATE TABLE IF NOT EXISTS public.cargo_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  cargo_line_number int DEFAULT 1,
  commodity_description text,
  hs_code text,
  package_count int,
  package_type_code text,
  gross_weight numeric,
  net_weight numeric,
  volume numeric,
  marks_and_numbers text,
  dangerous_goods_flag boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cargo_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage cargo_details" ON public.cargo_details FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view cargo_details" ON public.cargo_details FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id
      AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
  ));

CREATE INDEX idx_cargo_details_booking_id ON public.cargo_details(booking_id);
CREATE INDEX idx_cargo_details_hs_code ON public.cargo_details(hs_code);

-- 4. transport_plans table
CREATE TABLE IF NOT EXISTS public.transport_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  sequence_number int DEFAULT 1,
  transport_mode text,
  vessel_name text,
  voyage_number text,
  vessel_id uuid REFERENCES public.alc_vessels(id),
  load_location_id uuid REFERENCES public.alc_locations(id),
  discharge_location_id uuid REFERENCES public.alc_locations(id),
  place_of_receipt_location_id uuid REFERENCES public.alc_locations(id),
  place_of_delivery_location_id uuid REFERENCES public.alc_locations(id),
  planned_departure timestamptz,
  planned_arrival timestamptz,
  service_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage transport_plans" ON public.transport_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view transport_plans" ON public.transport_plans FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id
      AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
  ));

CREATE INDEX idx_transport_plans_booking_id ON public.transport_plans(booking_id);
CREATE INDEX idx_transport_plans_planned_departure ON public.transport_plans(planned_departure);

-- 5. booking_charges table
CREATE TABLE IF NOT EXISTS public.booking_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  charge_code text,
  charge_description text,
  amount numeric DEFAULT 0,
  currency_code text DEFAULT 'USD',
  payment_term_code text,
  calculation_basis text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage booking_charges" ON public.booking_charges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view booking_charges" ON public.booking_charges FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id
      AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
  ));

CREATE INDEX idx_booking_charges_booking_id ON public.booking_charges(booking_id);

-- 6. booking_instructions table
CREATE TABLE IF NOT EXISTS public.booking_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  instruction_type text,
  instruction_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage booking_instructions" ON public.booking_instructions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view booking_instructions" ON public.booking_instructions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id
      AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
  ));

CREATE INDEX idx_booking_instructions_booking_id ON public.booking_instructions(booking_id);

-- 7. Extend existing tables with booking_id

-- shipments: add booking_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shipments' AND column_name='booking_id') THEN
    ALTER TABLE public.shipments ADD COLUMN booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
    CREATE INDEX idx_shipments_booking_id ON public.shipments(booking_id);
  END IF;
END $$;

-- shipment_references: add booking_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shipment_references' AND column_name='booking_id') THEN
    ALTER TABLE public.shipment_references ADD COLUMN booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
    CREATE INDEX idx_shipment_references_booking_id ON public.shipment_references(booking_id);
  END IF;
END $$;

-- shipment_parties: add booking_id and source_message_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shipment_parties' AND column_name='booking_id') THEN
    ALTER TABLE public.shipment_parties ADD COLUMN booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
    CREATE INDEX idx_shipment_parties_booking_id ON public.shipment_parties(booking_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shipment_parties' AND column_name='source_message_id') THEN
    ALTER TABLE public.shipment_parties ADD COLUMN source_message_id uuid REFERENCES public.carrier_raw_messages(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shipment_parties' AND column_name='alc_carrier_id') THEN
    ALTER TABLE public.shipment_parties ADD COLUMN alc_carrier_id uuid REFERENCES public.alc_carriers(id);
  END IF;
END $$;

-- documents: add booking_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='documents' AND column_name='booking_id') THEN
    ALTER TABLE public.documents ADD COLUMN booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
    CREATE INDEX idx_documents_booking_id ON public.documents(booking_id);
  END IF;
END $$;

-- updated_at triggers
CREATE TRIGGER set_updated_at_bookings BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_booking_equipments BEFORE UPDATE ON public.booking_equipments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_cargo_details BEFORE UPDATE ON public.cargo_details FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_transport_plans BEFORE UPDATE ON public.transport_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_booking_charges BEFORE UPDATE ON public.booking_charges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_booking_instructions BEFORE UPDATE ON public.booking_instructions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
