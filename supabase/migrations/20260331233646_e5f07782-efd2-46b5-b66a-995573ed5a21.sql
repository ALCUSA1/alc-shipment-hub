
-- =============================================
-- Transport Document Data Model Migration
-- =============================================

-- 1. shipping_instructions table
CREATE TABLE public.shipping_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.shipments(id),
  booking_id uuid REFERENCES public.bookings(id),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  shipping_instruction_reference text,
  shipping_instruction_status text DEFAULT 'received',
  transport_document_type_code text,
  issue_date date,
  amendment_number int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_si_reference ON public.shipping_instructions(shipping_instruction_reference);
CREATE INDEX idx_si_shipment ON public.shipping_instructions(shipment_id);
CREATE INDEX idx_si_booking ON public.shipping_instructions(booking_id);
CREATE INDEX idx_si_carrier ON public.shipping_instructions(alc_carrier_id);
ALTER TABLE public.shipping_instructions ENABLE ROW LEVEL SECURITY;

-- 2. transport_documents table
CREATE TABLE public.transport_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.shipments(id),
  booking_id uuid REFERENCES public.bookings(id),
  shipping_instruction_id uuid REFERENCES public.shipping_instructions(id),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  transport_document_reference text,
  transport_document_status text DEFAULT 'draft',
  transport_document_type_code text,
  bill_of_lading_number text,
  issue_date date,
  issue_location_id uuid REFERENCES public.alc_locations(id),
  shipped_on_board_date date,
  received_for_shipment_date date,
  declared_value numeric,
  declared_value_currency text,
  number_of_originals int,
  number_of_copies int,
  is_electronic boolean DEFAULT false,
  is_surrendered boolean DEFAULT false,
  freight_payment_term_code text,
  origin_charge_payment_term_code text,
  destination_charge_payment_term_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_td_reference ON public.transport_documents(transport_document_reference);
CREATE INDEX idx_td_bl_number ON public.transport_documents(bill_of_lading_number);
CREATE INDEX idx_td_status ON public.transport_documents(transport_document_status);
CREATE INDEX idx_td_issue_date ON public.transport_documents(issue_date);
CREATE INDEX idx_td_shipment ON public.transport_documents(shipment_id);
CREATE INDEX idx_td_carrier ON public.transport_documents(alc_carrier_id);
ALTER TABLE public.transport_documents ENABLE ROW LEVEL SECURITY;

-- 3. transport_document_consignment_items
CREATE TABLE public.transport_document_consignment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_document_id uuid NOT NULL REFERENCES public.transport_documents(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  consignment_item_number int,
  cargo_item_number int,
  description text,
  harmonized_system_code text,
  national_commodity_code text,
  package_quantity int,
  package_type_code text,
  gross_weight numeric,
  net_weight numeric,
  volume numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tdci_td ON public.transport_document_consignment_items(transport_document_id);
ALTER TABLE public.transport_document_consignment_items ENABLE ROW LEVEL SECURITY;

-- 4. transport_document_equipments
CREATE TABLE public.transport_document_equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_document_id uuid NOT NULL REFERENCES public.transport_documents(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id),
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  equipment_reference text,
  container_number text,
  iso_equipment_code text,
  equipment_type_code text,
  seal_number text,
  temperature_setting text,
  ventilation_setting text,
  humidity_setting text,
  overdimension_flag boolean DEFAULT false,
  dangerous_goods_flag boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tde_td ON public.transport_document_equipments(transport_document_id);
CREATE INDEX idx_tde_container ON public.transport_document_equipments(container_number);
ALTER TABLE public.transport_document_equipments ENABLE ROW LEVEL SECURITY;

-- 5. transport_document_charges
CREATE TABLE public.transport_document_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_document_id uuid NOT NULL REFERENCES public.transport_documents(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  charge_code text,
  charge_description text,
  amount numeric,
  currency_code text,
  payment_term_code text,
  calculation_basis text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tdc_td ON public.transport_document_charges(transport_document_id);
ALTER TABLE public.transport_document_charges ENABLE ROW LEVEL SECURITY;

-- 6. transport_document_instructions
CREATE TABLE public.transport_document_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_document_id uuid NOT NULL REFERENCES public.transport_documents(id) ON DELETE CASCADE,
  alc_carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  instruction_type text,
  instruction_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tdi_td ON public.transport_document_instructions(transport_document_id);
ALTER TABLE public.transport_document_instructions ENABLE ROW LEVEL SECURITY;

-- 7. Extend shipments with shipping_instruction_id and transport_document_id
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipping_instruction_id uuid REFERENCES public.shipping_instructions(id);
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS transport_document_id uuid REFERENCES public.transport_documents(id);

-- 8. Extend shipment_references with shipping_instruction_id and transport_document_id
ALTER TABLE public.shipment_references ADD COLUMN IF NOT EXISTS shipping_instruction_id uuid REFERENCES public.shipping_instructions(id);
ALTER TABLE public.shipment_references ADD COLUMN IF NOT EXISTS transport_document_id uuid REFERENCES public.transport_documents(id);

-- 9. Extend shipment_parties with shipping_instruction_id and transport_document_id
ALTER TABLE public.shipment_parties ADD COLUMN IF NOT EXISTS shipping_instruction_id uuid REFERENCES public.shipping_instructions(id);
ALTER TABLE public.shipment_parties ADD COLUMN IF NOT EXISTS transport_document_id uuid REFERENCES public.transport_documents(id);

-- 10. Extend cargo_details with transport_document_id and shipping_instruction_id
ALTER TABLE public.cargo_details ADD COLUMN IF NOT EXISTS transport_document_id uuid REFERENCES public.transport_documents(id);
ALTER TABLE public.cargo_details ADD COLUMN IF NOT EXISTS shipping_instruction_id uuid REFERENCES public.shipping_instructions(id);

-- 11. Extend transport_plans with shipping_instruction_id and transport_document_id
ALTER TABLE public.transport_plans ADD COLUMN IF NOT EXISTS shipping_instruction_id uuid REFERENCES public.shipping_instructions(id);
ALTER TABLE public.transport_plans ADD COLUMN IF NOT EXISTS transport_document_id uuid REFERENCES public.transport_documents(id);

-- 12. Extend documents with shipping_instruction_id and transport_document_id
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS shipping_instruction_id uuid REFERENCES public.shipping_instructions(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS transport_document_id uuid REFERENCES public.transport_documents(id);

-- RLS policies: allow authenticated users to read all normalized records
CREATE POLICY "Authenticated users can read shipping_instructions" ON public.shipping_instructions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read transport_documents" ON public.transport_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read td_consignment_items" ON public.transport_document_consignment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read td_equipments" ON public.transport_document_equipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read td_charges" ON public.transport_document_charges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read td_instructions" ON public.transport_document_instructions FOR SELECT TO authenticated USING (true);

-- Service role insert/update policies for edge functions
CREATE POLICY "Service role manages shipping_instructions" ON public.shipping_instructions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages transport_documents" ON public.transport_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages td_consignment_items" ON public.transport_document_consignment_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages td_equipments" ON public.transport_document_equipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages td_charges" ON public.transport_document_charges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages td_instructions" ON public.transport_document_instructions FOR ALL USING (true) WITH CHECK (true);
