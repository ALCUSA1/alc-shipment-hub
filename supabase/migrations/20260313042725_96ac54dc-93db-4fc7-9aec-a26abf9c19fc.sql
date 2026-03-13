
-- =============================================
-- 5. AES FILINGS TABLE (comprehensive)
-- =============================================
CREATE TABLE public.aes_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  
  -- Filing header
  itn text,
  xtn text,
  filing_status text NOT NULL DEFAULT 'draft', -- draft, pending, submitted, accepted, rejected, amended
  filing_option text, -- direct, agent, routed
  compliance_alerts text[],
  date_of_exportation date,
  itn_created_date timestamp with time zone,
  itn_last_updated_date timestamp with time zone,
  
  -- EEI fields
  eei_required boolean DEFAULT true,
  eei_exemption_citation text, -- e.g. '30.37(a)'
  routed_export_transaction boolean DEFAULT false,
  
  -- USPPI (Principal Party in Interest)
  usppi_name text,
  usppi_address text,
  usppi_ein text,
  usppi_phone text,
  usppi_contact_name text,
  usppi_email text,
  
  -- Ultimate Consignee
  ultimate_consignee_name text,
  ultimate_consignee_address text,
  ultimate_consignee_type text, -- 'direct_consumer', 'government', 'reseller', 'other'
  
  -- Intermediate Consignee
  intermediate_consignee_name text,
  intermediate_consignee_address text,
  
  -- Authorized Agent
  authorized_agent_name text,
  authorized_agent_address text,
  authorized_agent_ein text,
  
  -- Related parties
  related_parties boolean DEFAULT false,
  
  -- Transport details
  transportation_ref_number text,
  equipment_numbers text[],
  seal_numbers text[],
  state_of_origin text, -- or FTZ number
  country_of_ultimate_destination text,
  method_of_transportation text, -- vessel, air, rail, truck
  exporting_carrier text,
  port_of_export text,
  port_of_unlading text,
  containerized boolean DEFAULT true,
  carrier_identification_code text,
  shipment_reference_number text,
  entry_number text,
  hazardous_materials boolean DEFAULT false,
  in_bond_code text,
  original_itn text,
  
  -- SLI-specific fields
  loading_pier text,
  country_of_manufacture text,
  special_instructions text,
  inability_to_deliver text, -- 'abandon', 'return_to_shipper', 'notify_shipper'
  forwarder_authorization_language text,
  shipper_certification_language text,
  title_of_shipper_representative text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.aes_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage aes filings through shipment" ON public.aes_filings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = aes_filings.shipment_id AND shipments.user_id = auth.uid()));

CREATE POLICY "Admins can manage all aes filings" ON public.aes_filings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 6. AES COMMODITY LINE ITEMS
-- =============================================
CREATE TABLE public.aes_commodity_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aes_filing_id uuid NOT NULL REFERENCES public.aes_filings(id) ON DELETE CASCADE,
  line_sequence integer NOT NULL DEFAULT 1,
  df_indicator text, -- 'D' domestic, 'F' foreign, 'M' mixed
  schedule_b_number text,
  hts_number text,
  commodity_description text,
  export_info_code text,
  license_number text,
  license_code text,
  eccn text,
  no_license_required boolean DEFAULT false,
  quantity numeric,
  unit_of_measure text,
  shipping_weight_kg numeric,
  vin_product_number text,
  vehicle_title_number text,
  value_usd numeric,
  tariff_code text,
  number_of_pieces integer,
  country_of_origin text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.aes_commodity_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage aes lines through filing" ON public.aes_commodity_lines
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM aes_filings af
    JOIN shipments s ON s.id = af.shipment_id
    WHERE af.id = aes_commodity_lines.aes_filing_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all aes lines" ON public.aes_commodity_lines
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 7. SLI DOCUMENTS TABLE
-- =============================================
CREATE TABLE public.sli_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  aes_filing_id uuid REFERENCES public.aes_filings(id),
  
  -- Shipper
  shipper_name text,
  shipper_address text,
  shipper_phone text,
  shipper_contact_person text,
  shipper_email text,
  shipper_representative_title text,
  exporter_ein text,
  
  -- Ultimate Consignee
  consignee_name text,
  consignee_address text,
  consignee_phone text,
  consignee_type text,
  
  -- Transaction
  related_parties boolean DEFAULT false,
  
  -- Shipment instruction fields
  carrier_ship_date date,
  point_state_of_origin text,
  country_of_ultimate_destination text,
  loading_pier text,
  method_of_transportation text,
  exporting_carrier text,
  port_of_export text,
  port_of_unloading text,
  containerized boolean DEFAULT true,
  shipper_reference_number text,
  hazardous_material boolean DEFAULT false,
  routed_export_transaction boolean DEFAULT false,
  country_of_manufacture text,
  special_instructions text,
  
  -- Inability to deliver
  inability_to_deliver text, -- 'abandon', 'return_to_shipper', 'notify_shipper'
  
  -- Authorization
  license_info text,
  eccn text,
  no_license_required boolean DEFAULT false,
  forwarder_authorization text,
  shipper_certification text,
  
  status text NOT NULL DEFAULT 'draft',
  generated_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sli_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sli through shipment" ON public.sli_documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = sli_documents.shipment_id AND shipments.user_id = auth.uid()));

CREATE POLICY "Admins can manage all sli documents" ON public.sli_documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 8. P&L AUDIT LOG
-- =============================================
CREATE TABLE public.shipment_pnl_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  financial_id uuid NOT NULL REFERENCES public.shipment_financials(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL,
  edited_at timestamp with time zone NOT NULL DEFAULT now(),
  field_name text NOT NULL,
  before_value text,
  after_value text,
  notes text
);

ALTER TABLE public.shipment_pnl_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pnl audit" ON public.shipment_pnl_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = shipment_pnl_audit_log.shipment_id AND shipments.user_id = auth.uid()));

CREATE POLICY "Admins can manage all pnl audit" ON public.shipment_pnl_audit_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own audit entries
CREATE POLICY "Users can insert pnl audit entries" ON public.shipment_pnl_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = shipment_pnl_audit_log.shipment_id AND shipments.user_id = auth.uid()));
