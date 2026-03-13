
-- 1. Add 'forwarder' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'forwarder';

-- 2. Create shipment_templates table
CREATE TABLE public.shipment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  shipment_type TEXT NOT NULL DEFAULT 'export',
  mode TEXT NOT NULL DEFAULT 'ocean',
  origin_port TEXT,
  destination_port TEXT,
  pickup_location TEXT,
  delivery_location TEXT,
  commodity TEXT,
  hs_code TEXT,
  container_type TEXT,
  container_count INTEGER DEFAULT 1,
  incoterm TEXT,
  special_instructions TEXT,
  parties JSONB DEFAULT '[]'::jsonb,
  cargo JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates" ON public.shipment_templates
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Create forwarder_customers table for forwarder-shipper relationships
CREATE TABLE public.forwarder_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forwarder_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  company_name TEXT,
  status TEXT NOT NULL DEFAULT 'invited',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forwarder_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Forwarders manage own customers" ON public.forwarder_customers
  FOR ALL TO authenticated
  USING (forwarder_user_id = auth.uid())
  WITH CHECK (forwarder_user_id = auth.uid());

CREATE POLICY "Customers can view their forwarder link" ON public.forwarder_customers
  FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid());

-- 4. Add updated_at trigger to new tables
CREATE TRIGGER update_shipment_templates_updated_at
  BEFORE UPDATE ON public.shipment_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forwarder_customers_updated_at
  BEFORE UPDATE ON public.forwarder_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
