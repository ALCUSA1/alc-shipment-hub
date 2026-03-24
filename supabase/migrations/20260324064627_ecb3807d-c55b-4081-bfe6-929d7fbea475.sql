
-- =============================================
-- PRICING ENGINE TABLES
-- =============================================

-- Pricing rules per company/shipment type
CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shipment_type text NOT NULL,
  minimum_margin_percent numeric NOT NULL DEFAULT 6,
  target_margin_percent numeric NOT NULL DEFAULT 8,
  stretch_margin_percent numeric NOT NULL DEFAULT 10,
  urgency_standard_adjustment numeric NOT NULL DEFAULT 0,
  urgency_priority_adjustment numeric NOT NULL DEFAULT 2,
  urgency_urgent_adjustment numeric NOT NULL DEFAULT 4,
  capacity_loose_adjustment numeric NOT NULL DEFAULT -2,
  capacity_normal_adjustment numeric NOT NULL DEFAULT 0,
  capacity_tight_adjustment numeric NOT NULL DEFAULT 3,
  competition_high_adjustment numeric NOT NULL DEFAULT -2,
  competition_normal_adjustment numeric NOT NULL DEFAULT 0,
  competition_low_adjustment numeric NOT NULL DEFAULT 3,
  high_volume_customer_adjustment numeric NOT NULL DEFAULT -2,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view pricing rules"
  ON public.pricing_rules FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Pricing managers can manage pricing rules"
  ON public.pricing_rules FOR ALL TO authenticated
  USING (public.get_company_role(auth.uid(), company_id) IN ('admin', 'pricing_manager'));

-- Fixed cost profiles
CREATE TABLE public.fixed_cost_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_name text NOT NULL DEFAULT 'Default',
  monthly_software_cost numeric NOT NULL DEFAULT 0,
  monthly_team_cost numeric NOT NULL DEFAULT 0,
  monthly_office_cost numeric NOT NULL DEFAULT 0,
  monthly_marketing_cost numeric NOT NULL DEFAULT 0,
  monthly_tech_cost numeric NOT NULL DEFAULT 0,
  monthly_shipment_volume integer NOT NULL DEFAULT 1,
  fixed_cost_per_shipment numeric GENERATED ALWAYS AS (
    CASE WHEN monthly_shipment_volume > 0
      THEN (monthly_software_cost + monthly_team_cost + monthly_office_cost + monthly_marketing_cost + monthly_tech_cost) / monthly_shipment_volume
      ELSE 0
    END
  ) STORED,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_cost_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view fixed cost profiles"
  ON public.fixed_cost_profiles FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can manage fixed cost profiles"
  ON public.fixed_cost_profiles FOR ALL TO authenticated
  USING (public.get_company_role(auth.uid(), company_id) IN ('admin', 'pricing_manager', 'finance_user'));

-- Pricing scenarios (attached to shipments)
CREATE TABLE public.pricing_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scenario_name text NOT NULL DEFAULT 'Default',
  is_active boolean NOT NULL DEFAULT true,
  is_selected boolean NOT NULL DEFAULT false,
  pricing_status text NOT NULL DEFAULT 'draft',
  shipment_type text,
  base_margin_percent numeric,
  adjustment_percent numeric DEFAULT 0,
  final_margin_percent numeric,
  minimum_margin_percent numeric,
  stretch_margin_percent numeric,
  first_shipment_discount_amount numeric DEFAULT 0,
  manual_override boolean NOT NULL DEFAULT false,
  override_reason text,
  approved_by_user_id uuid,
  approved_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view pricing scenarios"
  ON public.pricing_scenarios FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can manage pricing scenarios"
  ON public.pricing_scenarios FOR ALL TO authenticated
  USING (public.get_company_role(auth.uid(), company_id) IN ('admin', 'pricing_manager', 'sales_manager'));

-- Pricing cost lines (itemized costs)
CREATE TABLE public.pricing_cost_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_scenario_id uuid NOT NULL REFERENCES public.pricing_scenarios(id) ON DELETE CASCADE,
  cost_category text NOT NULL,
  cost_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_cost_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via pricing scenario"
  ON public.pricing_cost_lines FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pricing_scenarios ps
    WHERE ps.id = pricing_scenario_id
    AND public.is_company_member(auth.uid(), ps.company_id)
  ));

-- Pricing outputs (calculated results)
CREATE TABLE public.pricing_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_scenario_id uuid NOT NULL REFERENCES public.pricing_scenarios(id) ON DELETE CASCADE,
  total_direct_cost numeric NOT NULL DEFAULT 0,
  total_variable_cost numeric NOT NULL DEFAULT 0,
  fixed_cost_per_shipment numeric NOT NULL DEFAULT 0,
  total_network_payout_cost numeric NOT NULL DEFAULT 0,
  true_total_cost numeric NOT NULL DEFAULT 0,
  break_even_price numeric NOT NULL DEFAULT 0,
  minimum_acceptable_sell_price numeric NOT NULL DEFAULT 0,
  recommended_sell_price numeric NOT NULL DEFAULT 0,
  stretch_sell_price numeric NOT NULL DEFAULT 0,
  gross_profit numeric NOT NULL DEFAULT 0,
  gross_margin_percent numeric NOT NULL DEFAULT 0,
  contribution_profit numeric NOT NULL DEFAULT 0,
  contribution_margin_percent numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  net_margin_percent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pricing_scenario_id)
);

ALTER TABLE public.pricing_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via pricing scenario"
  ON public.pricing_outputs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pricing_scenarios ps
    WHERE ps.id = pricing_scenario_id
    AND public.is_company_member(auth.uid(), ps.company_id)
  ));
