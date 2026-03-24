
-- Create link tables first
CREATE TABLE IF NOT EXISTS public.customer_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, customer_id, company_id)
);

CREATE TABLE IF NOT EXISTS public.partner_user_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id, company_id)
);

ALTER TABLE public.customer_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_user_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cul_user ON public.customer_user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_cul_customer ON public.customer_user_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_cul_company ON public.customer_user_links(company_id);
CREATE INDEX IF NOT EXISTS idx_pul_user ON public.partner_user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_pul_partner ON public.partner_user_links(partner_id);
CREATE INDEX IF NOT EXISTS idx_pul_company ON public.partner_user_links(company_id);

-- Add missing columns to shipments
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.companies(id);

-- Add missing columns to shipment_parties
ALTER TABLE public.shipment_parties ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.companies(id);
ALTER TABLE public.shipment_parties ADD COLUMN IF NOT EXISTS role_type text;
ALTER TABLE public.shipment_parties ADD COLUMN IF NOT EXISTS assigned_by_user_id uuid REFERENCES auth.users(id);

-- Now create helper functions that reference these tables
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(company_id), '{}')
  FROM public.company_members
  WHERE user_id = auth.uid() AND is_active = true
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_company_id uuid, _allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = auth.uid()
      AND company_id = _company_id
      AND is_active = true
      AND role::text = ANY(_allowed_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_shipment(_shipment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.company_members cm ON cm.company_id = s.company_id
    WHERE s.id = _shipment_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.customer_user_links cul ON cul.customer_id = s.customer_id AND cul.company_id = s.company_id
    WHERE s.id = _shipment_id
      AND cul.user_id = auth.uid()
      AND s.customer_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.shipment_parties sp
    JOIN public.partner_user_links pul ON pul.partner_id = sp.partner_id
    WHERE sp.shipment_id = _shipment_id
      AND pul.user_id = auth.uid()
      AND sp.partner_id IS NOT NULL
  )
  OR public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.can_edit_shipment(_shipment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.company_members cm ON cm.company_id = s.company_id
    WHERE s.id = _shipment_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
      AND cm.role IN ('admin', 'pricing_manager', 'operations_manager', 'sales_manager')
  )
  OR public.has_role(auth.uid(), 'admin')
$$;

-- Link table RLS
CREATE POLICY "Company members manage customer links" ON public.customer_user_links
  FOR ALL TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()))
  WITH CHECK (company_id = ANY(public.get_user_company_ids()));

CREATE POLICY "Company members manage partner links" ON public.partner_user_links
  FOR ALL TO authenticated
  USING (company_id = ANY(public.get_user_company_ids()))
  WITH CHECK (company_id = ANY(public.get_user_company_ids()));
