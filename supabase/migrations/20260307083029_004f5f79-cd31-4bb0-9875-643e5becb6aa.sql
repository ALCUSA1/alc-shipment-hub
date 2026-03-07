
-- Company status enum
CREATE TYPE public.company_status AS ENUM ('prospect', 'pending_compliance', 'active', 'suspended', 'inactive');

-- Companies table (NVOCC customers)
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  trade_name text,
  status company_status NOT NULL DEFAULT 'prospect',
  
  -- FMC & Bond
  fmc_license_number text,
  fmc_license_status text,
  oti_bond_number text,
  oti_bond_amount numeric,
  oti_bond_surety text,
  fmc_license_expiry date,
  
  -- Tax & Registration
  ein text,
  duns_number text,
  w9_on_file boolean DEFAULT false,
  sam_registration text,
  sam_expiry date,
  
  -- Insurance
  cargo_insurance_provider text,
  cargo_insurance_policy text,
  cargo_insurance_expiry date,
  general_liability_provider text,
  general_liability_policy text,
  general_liability_expiry date,
  
  -- Credit & Billing
  credit_terms text DEFAULT 'prepaid',
  credit_limit numeric DEFAULT 0,
  payment_terms_days integer DEFAULT 0,
  billing_email text,
  billing_address text,
  
  -- General
  website text,
  industry text,
  address text,
  city text,
  state text,
  zip text,
  country text DEFAULT 'US',
  phone text,
  email text,
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Company contacts
CREATE TABLE public.company_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'general',
  title text,
  email text,
  phone text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Company compliance documents
CREATE TABLE public.company_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  doc_type text NOT NULL,
  doc_name text NOT NULL,
  file_url text,
  expiry_date date,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Company activity log
CREATE TABLE public.company_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own companies"
ON public.companies FOR ALL TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can manage contacts through company"
ON public.company_contacts FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM companies WHERE companies.id = company_contacts.company_id AND companies.user_id = auth.uid()
));

CREATE POLICY "Users can manage company documents"
ON public.company_documents FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM companies WHERE companies.id = company_documents.company_id AND companies.user_id = auth.uid()
));

CREATE POLICY "Users can manage company activities"
ON public.company_activities FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM companies WHERE companies.id = company_activities.company_id AND companies.user_id = auth.uid()
));

-- Updated_at triggers
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_documents_updated_at
  BEFORE UPDATE ON public.company_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add company_id to shipments for linking
ALTER TABLE public.shipments ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
