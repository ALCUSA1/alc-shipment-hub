
-- =============================================
-- 1. COMPANY MEMBERS (multi-tenant RBAC)
-- =============================================
CREATE TYPE public.company_role AS ENUM (
  'admin', 'pricing_manager', 'operations_manager', 'sales_manager',
  'customer_user', 'finance_user', 'partner_user', 'viewer'
);

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role company_role NOT NULL DEFAULT 'viewer',
  title text,
  is_active boolean NOT NULL DEFAULT true,
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Security definer to check company membership
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.get_company_role(_user_id uuid, _company_id uuid)
RETURNS company_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.company_members
  WHERE user_id = _user_id AND company_id = _company_id AND is_active = true
  LIMIT 1
$$;

-- RLS: members can see their own company's members
CREATE POLICY "Members can view own company members"
  ON public.company_members FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can manage company members"
  ON public.company_members FOR ALL TO authenticated
  USING (public.get_company_role(auth.uid(), company_id) = 'admin');

-- =============================================
-- 2. EXTEND SHIPMENTS TABLE
-- =============================================
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS priority_level text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS capacity_condition text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS competition_level text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS customer_type_snapshot text,
  ADD COLUMN IF NOT EXISTS is_first_shipment boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_ops_user_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_pricing_user_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- =============================================
-- 3. SHIPMENT SERVICES
-- =============================================
CREATE TABLE public.shipment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  customs_clearance boolean NOT NULL DEFAULT false,
  trucking boolean NOT NULL DEFAULT false,
  warehousing boolean NOT NULL DEFAULT false,
  insurance boolean NOT NULL DEFAULT false,
  special_handling boolean NOT NULL DEFAULT false,
  additional_services_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shipment_id)
);

ALTER TABLE public.shipment_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shipment services"
  ON public.shipment_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND s.user_id = auth.uid()));
