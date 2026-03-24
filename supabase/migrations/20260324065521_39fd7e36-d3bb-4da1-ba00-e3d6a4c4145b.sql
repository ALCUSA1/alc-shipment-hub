
-- =============================================
-- Tasks table for workflow-generated follow-ups
-- =============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  shipment_id uuid REFERENCES public.shipments(id),
  entity_type text,
  entity_id uuid,
  title text NOT NULL,
  description text,
  assigned_to_user_id uuid REFERENCES auth.users(id),
  assigned_to_role text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  due_date timestamptz,
  completed_at timestamptz,
  completed_by_user_id uuid REFERENCES auth.users(id),
  created_by_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tasks_company ON public.tasks(company_id);
CREATE INDEX idx_tasks_shipment ON public.tasks(shipment_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);

CREATE POLICY "View company tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Manage company tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

-- =============================================
-- Workflow configuration table (admin-configurable)
-- =============================================
CREATE TABLE IF NOT EXISTS public.workflow_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  config_key text NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, config_key)
);

ALTER TABLE public.workflow_config ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_wc_company ON public.workflow_config(company_id);

CREATE POLICY "View company workflow config" ON public.workflow_config
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Manage workflow config" ON public.workflow_config
  FOR ALL TO authenticated
  USING (public.has_company_role(company_id, ARRAY['admin']) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_company_role(company_id, ARRAY['admin']) OR public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_set_updated_at ON public.tasks;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.workflow_config;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.workflow_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- Document requirements table (what docs are needed per shipment type/service)
-- =============================================
CREATE TABLE IF NOT EXISTS public.document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  shipment_type text,
  service_flag text,
  document_type text NOT NULL,
  required_at_stage text NOT NULL DEFAULT 'booked',
  is_mandatory boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View doc requirements" ON public.document_requirements
  FOR SELECT TO authenticated USING (
    company_id IS NULL 
    OR company_id = ANY(public.get_user_company_ids()) 
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Manage doc requirements" ON public.document_requirements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default document requirements (global, no company_id)
INSERT INTO public.document_requirements (shipment_type, document_type, required_at_stage, is_mandatory) VALUES
  ('FCL', 'commercial_invoice', 'booked', true),
  ('FCL', 'packing_list', 'booked', true),
  ('FCL', 'bill_of_lading', 'in_transit', true),
  ('LCL', 'commercial_invoice', 'booked', true),
  ('LCL', 'packing_list', 'booked', true),
  ('LCL', 'bill_of_lading', 'in_transit', true),
  ('Air', 'commercial_invoice', 'booked', true),
  ('Air', 'packing_list', 'booked', true),
  ('Air', 'air_waybill', 'in_transit', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.document_requirements (service_flag, document_type, required_at_stage, is_mandatory) VALUES
  ('customs_clearance', 'customs_declaration', 'booked', true),
  ('insurance', 'insurance_certificate', 'booked', true),
  ('dangerous_goods', 'fumigation_certificate', 'booked', true)
ON CONFLICT DO NOTHING;
