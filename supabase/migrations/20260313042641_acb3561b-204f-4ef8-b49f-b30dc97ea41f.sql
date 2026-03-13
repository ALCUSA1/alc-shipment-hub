
-- =============================================
-- 1. SHIPMENT MILESTONES TABLE
-- =============================================
CREATE TABLE public.shipment_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  milestone_key text NOT NULL,
  milestone_label text NOT NULL,
  milestone_order integer NOT NULL,
  event_date timestamp with time zone,
  is_completed boolean NOT NULL DEFAULT false,
  completed_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(shipment_id, milestone_key)
);

ALTER TABLE public.shipment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage milestones through shipment" ON public.shipment_milestones
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = shipment_milestones.shipment_id AND shipments.user_id = auth.uid()));

CREATE POLICY "Admins can manage all milestones" ON public.shipment_milestones
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. SHIPMENT CUTOFFS TABLE (system-controlled)
-- =============================================
CREATE TABLE public.shipment_cutoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  cutoff_type text NOT NULL, -- 'document', 'port', 'cy', 'si', 'vgm', 'erd'
  cutoff_datetime timestamp with time zone,
  source text NOT NULL DEFAULT 'estimated', -- 'carrier_feed', 'manual_admin', 'estimated', 'calculated'
  is_estimated boolean NOT NULL DEFAULT true,
  notes text,
  set_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(shipment_id, cutoff_type)
);

ALTER TABLE public.shipment_cutoffs ENABLE ROW LEVEL SECURITY;

-- Customers can only READ cutoffs
CREATE POLICY "Users can view cutoffs through shipment" ON public.shipment_cutoffs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = shipment_cutoffs.shipment_id AND shipments.user_id = auth.uid()));

-- Admins can manage all cutoffs
CREATE POLICY "Admins can manage all cutoffs" ON public.shipment_cutoffs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. CONTAINER COMMODITIES TABLE
-- =============================================
CREATE TABLE public.container_commodities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid NOT NULL REFERENCES public.containers(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  line_sequence integer NOT NULL DEFAULT 1,
  commodity_description text,
  schedule_b_number text,
  hts_code text,
  hs_code text,
  quantity numeric,
  unit_of_measure text,
  gross_weight_kg numeric,
  net_weight_kg numeric,
  value_usd numeric,
  vin_product_number text,
  hazardous boolean NOT NULL DEFAULT false,
  country_of_manufacture text,
  export_info_code text,
  license_number text,
  license_code text,
  eccn text,
  df_indicator text, -- 'D' domestic, 'F' foreign, 'M' mixed
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.container_commodities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage container commodities through shipment" ON public.container_commodities
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = container_commodities.shipment_id AND shipments.user_id = auth.uid()));

CREATE POLICY "Admins can manage all container commodities" ON public.container_commodities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Truckers can view container commodities" ON public.container_commodities
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'trucker'::app_role));

-- =============================================
-- 4. SHIPMENT RATES TABLE
-- =============================================
CREATE TABLE public.shipment_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  rate_basis_type text NOT NULL DEFAULT 'spot', -- 'contract', 'spot', 'tariff'
  carrier text,
  container_type text,
  container_count integer NOT NULL DEFAULT 1,
  rate_per_container numeric NOT NULL DEFAULT 0,
  total_freight numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  transit_days integer,
  contract_number text,
  valid_from date,
  valid_until date,
  surcharges jsonb DEFAULT '[]'::jsonb,
  markup_percent numeric DEFAULT 0,
  markup_amount numeric DEFAULT 0,
  is_selected boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage rates through shipment" ON public.shipment_rates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = shipment_rates.shipment_id AND shipments.user_id = auth.uid()));

CREATE POLICY "Admins can manage all rates" ON public.shipment_rates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
