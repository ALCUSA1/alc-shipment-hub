
-- =============================================
-- APPROVAL WORKFLOW
-- =============================================
CREATE TABLE public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  approval_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  assigned_to_user_id uuid REFERENCES auth.users(id),
  reason_note text,
  decision_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view approvals"
  ON public.approvals FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authorized users can manage approvals"
  ON public.approvals FOR ALL TO authenticated
  USING (public.get_company_role(auth.uid(), company_id) IN ('admin', 'pricing_manager', 'operations_manager'));

-- =============================================
-- REVENUE SPLITS
-- =============================================
CREATE TABLE public.revenue_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_scenario_id uuid NOT NULL REFERENCES public.pricing_scenarios(id) ON DELETE CASCADE,
  split_type text NOT NULL DEFAULT 'none',
  margin_pool_amount numeric NOT NULL DEFAULT 0,
  platform_percent numeric NOT NULL DEFAULT 100,
  referral_percent numeric NOT NULL DEFAULT 0,
  collaboration_percent numeric NOT NULL DEFAULT 0,
  network_percent numeric NOT NULL DEFAULT 0,
  platform_amount numeric NOT NULL DEFAULT 0,
  referral_amount numeric NOT NULL DEFAULT 0,
  collaboration_amount numeric NOT NULL DEFAULT 0,
  network_amount numeric NOT NULL DEFAULT 0,
  retained_platform_profit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pricing_scenario_id)
);

ALTER TABLE public.revenue_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via pricing scenario"
  ON public.revenue_splits FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pricing_scenarios ps
    WHERE ps.id = pricing_scenario_id
    AND public.is_company_member(auth.uid(), ps.company_id)
  ));

-- Revenue split rules (company defaults)
CREATE TABLE public.revenue_split_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shipment_type text,
  split_type text NOT NULL,
  default_platform_percent numeric NOT NULL DEFAULT 100,
  default_referral_percent numeric NOT NULL DEFAULT 0,
  default_collaboration_percent numeric NOT NULL DEFAULT 0,
  minimum_platform_retained_profit numeric,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_split_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view split rules"
  ON public.revenue_split_rules FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can manage split rules"
  ON public.revenue_split_rules FOR ALL TO authenticated
  USING (public.get_company_role(auth.uid(), company_id) IN ('admin', 'pricing_manager'));

-- =============================================
-- SHIPMENT MESSAGES (context-scoped)
-- =============================================
CREATE TABLE public.shipment_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id),
  message_body text NOT NULL,
  attachment_json jsonb,
  visibility_scope text NOT NULL DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view shipment messages"
  ON public.shipment_messages FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can send shipment messages"
  ON public.shipment_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id) AND sender_user_id = auth.uid());

-- Enable realtime for shipment messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_messages;
