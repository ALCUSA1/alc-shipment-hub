
-- =============================================
-- MIGRATION: Comprehensive RLS policies
-- =============================================

-- Helper: check if shipment belongs to user's company
CREATE OR REPLACE FUNCTION public.shipment_company_id(_shipment_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.shipments WHERE id = _shipment_id
$$;

-- Helper: check pricing scenario's company
CREATE OR REPLACE FUNCTION public.scenario_company_id(_scenario_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.pricing_scenarios WHERE id = _scenario_id
$$;

-- ===== SHIPMENTS RLS =====
-- Drop existing policies first to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;
  DROP POLICY IF EXISTS "Users can create shipments" ON public.shipments;
  DROP POLICY IF EXISTS "Users can update own shipments" ON public.shipments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "View shipments via membership" ON public.shipments
  FOR SELECT TO authenticated
  USING (public.can_view_shipment(id));

CREATE POLICY "Create shipments in own company" ON public.shipments
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = ANY(public.get_user_company_ids())
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Update shipments with edit rights" ON public.shipments
  FOR UPDATE TO authenticated
  USING (public.can_edit_shipment(id) OR user_id = auth.uid());

-- ===== PRICING SCENARIOS RLS =====
DO $$ BEGIN
  DROP POLICY IF EXISTS "Company members view scenarios" ON public.pricing_scenarios;
  DROP POLICY IF EXISTS "Pricing roles manage scenarios" ON public.pricing_scenarios;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "View pricing scenarios" ON public.pricing_scenarios
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Manage pricing scenarios" ON public.pricing_scenarios
  FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Update pricing scenarios" ON public.pricing_scenarios
  FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

-- ===== PRICING COST LINES RLS =====
CREATE POLICY "View cost lines via scenario" ON public.pricing_cost_lines
  FOR SELECT TO authenticated
  USING (public.scenario_company_id(pricing_scenario_id) = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Manage cost lines" ON public.pricing_cost_lines
  FOR INSERT TO authenticated
  WITH CHECK (public.scenario_company_id(pricing_scenario_id) = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Update cost lines" ON public.pricing_cost_lines
  FOR UPDATE TO authenticated
  USING (public.scenario_company_id(pricing_scenario_id) = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Delete cost lines" ON public.pricing_cost_lines
  FOR DELETE TO authenticated
  USING (public.scenario_company_id(pricing_scenario_id) = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

-- ===== PRICING OUTPUTS RLS =====
CREATE POLICY "View pricing outputs" ON public.pricing_outputs
  FOR SELECT TO authenticated
  USING (public.scenario_company_id(pricing_scenario_id) = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Manage pricing outputs" ON public.pricing_outputs
  FOR ALL TO authenticated
  USING (public.scenario_company_id(pricing_scenario_id) = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.scenario_company_id(pricing_scenario_id) = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

-- ===== REVENUE SPLITS RLS =====
CREATE POLICY "View revenue splits" ON public.revenue_splits
  FOR SELECT TO authenticated
  USING (public.scenario_company_id(pricing_scenario_id) = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Manage revenue splits" ON public.revenue_splits
  FOR ALL TO authenticated
  USING (public.scenario_company_id(pricing_scenario_id) = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.scenario_company_id(pricing_scenario_id) = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

-- ===== PRICING RULES / FIXED COST PROFILES / REVENUE SPLIT RULES =====
-- Admin and pricing_manager only
CREATE POLICY "View pricing rules" ON public.pricing_rules
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Manage pricing rules" ON public.pricing_rules
  FOR ALL TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "View fixed cost profiles" ON public.fixed_cost_profiles
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Manage fixed cost profiles" ON public.fixed_cost_profiles
  FOR ALL TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "View revenue split rules" ON public.revenue_split_rules
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Manage revenue split rules" ON public.revenue_split_rules
  FOR ALL TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

-- ===== SHIPMENT SERVICES RLS =====
CREATE POLICY "View shipment services" ON public.shipment_services
  FOR SELECT TO authenticated
  USING (public.can_view_shipment(shipment_id));

CREATE POLICY "Manage shipment services" ON public.shipment_services
  FOR ALL TO authenticated
  USING (public.can_edit_shipment(shipment_id))
  WITH CHECK (public.can_edit_shipment(shipment_id));

-- ===== SHIPMENT MESSAGES RLS =====
DO $$ BEGIN
  DROP POLICY IF EXISTS "View messages for accessible shipments" ON public.shipment_messages;
  DROP POLICY IF EXISTS "Send messages to accessible shipments" ON public.shipment_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "View shipment messages" ON public.shipment_messages
  FOR SELECT TO authenticated
  USING (public.can_view_shipment(shipment_id));

CREATE POLICY "Send shipment messages" ON public.shipment_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.can_view_shipment(shipment_id) AND sender_user_id = auth.uid());

-- ===== NOTIFICATIONS RLS =====
-- Users see only their own notifications
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Own notifications only" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
