
-- Indexes (skip requested_by_user_id which doesn't exist, use user_id instead)

-- shipments
CREATE INDEX IF NOT EXISTS idx_shipments_company ON public.shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON public.shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_lifecycle ON public.shipments(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_shipments_type ON public.shipments(shipment_type);
CREATE INDEX IF NOT EXISTS idx_shipments_user ON public.shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_ops ON public.shipments(assigned_ops_user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_pricing_user ON public.shipments(assigned_pricing_user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_created ON public.shipments(created_at DESC);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_shipment ON public.documents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(doc_type);

-- tracking_events
CREATE INDEX IF NOT EXISTS idx_tracking_shipment ON public.tracking_events(shipment_id);

-- shipment_parties
CREATE INDEX IF NOT EXISTS idx_sp_shipment ON public.shipment_parties(shipment_id);
CREATE INDEX IF NOT EXISTS idx_sp_partner ON public.shipment_parties(partner_id);
CREATE INDEX IF NOT EXISTS idx_sp_role ON public.shipment_parties(role_type);

-- shipment_messages
CREATE INDEX IF NOT EXISTS idx_sm_shipment ON public.shipment_messages(shipment_id);
CREATE INDEX IF NOT EXISTS idx_sm_company ON public.shipment_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_sm_created ON public.shipment_messages(created_at DESC);

-- pricing
CREATE INDEX IF NOT EXISTS idx_ps_shipment ON public.pricing_scenarios(shipment_id);
CREATE INDEX IF NOT EXISTS idx_ps_company ON public.pricing_scenarios(company_id);
CREATE INDEX IF NOT EXISTS idx_ps_status ON public.pricing_scenarios(pricing_status);
CREATE INDEX IF NOT EXISTS idx_ps_selected ON public.pricing_scenarios(is_selected);
CREATE INDEX IF NOT EXISTS idx_pcl_scenario ON public.pricing_cost_lines(pricing_scenario_id);
CREATE INDEX IF NOT EXISTS idx_pcl_category ON public.pricing_cost_lines(cost_category);

-- approvals
CREATE INDEX IF NOT EXISTS idx_approvals_company ON public.approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON public.approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approvals_assigned ON public.approvals(assigned_to_user_id);

-- audit
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON public.notifications(created_at DESC);

-- financials & splits
CREATE INDEX IF NOT EXISTS idx_sf_shipment ON public.shipment_financials(shipment_id);
CREATE INDEX IF NOT EXISTS idx_rs_scenario ON public.revenue_splits(pricing_scenario_id);
CREATE INDEX IF NOT EXISTS idx_pr_company ON public.pricing_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_fcp_company ON public.fixed_cost_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_rsr_company ON public.revenue_split_rules(company_id);

-- Partial unique: only one selected pricing scenario per shipment
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_selected_scenario 
  ON public.pricing_scenarios(shipment_id) WHERE is_selected = true;

-- Auto updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Apply updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pricing_scenarios','pricing_cost_lines','pricing_outputs',
    'pricing_rules','fixed_cost_profiles','revenue_splits','revenue_split_rules',
    'shipment_services','shipment_messages'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I; CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t, t);
  END LOOP;
END; $$;
