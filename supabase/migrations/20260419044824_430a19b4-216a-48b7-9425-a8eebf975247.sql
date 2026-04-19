-- Company branding/identity settings (single-row config for ALC platform owner)
CREATE TABLE IF NOT EXISTS public.platform_company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL DEFAULT 'All Logistics Cargo, Inc.',
  short_name text DEFAULT 'ALC',
  tagline text,
  oti_number text,
  fmc_license text,
  ein text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'USA',
  phone text,
  fax text,
  email text,
  website text,
  logo_url text,
  invoice_footer_note text,
  invoice_payment_instructions text,
  bill_of_lading_footer_note text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_routing_number text,
  bank_swift text,
  bank_address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_company_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (used by document generation for everyone)
CREATE POLICY "Authenticated users can view platform settings"
ON public.platform_company_settings
FOR SELECT TO authenticated
USING (true);

-- Anonymous can also read (so public-facing docs / quotes work)
CREATE POLICY "Public can view active platform settings"
ON public.platform_company_settings
FOR SELECT TO anon
USING (is_active = true);

-- Only admins can modify
CREATE POLICY "Admins can insert platform settings"
ON public.platform_company_settings
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update platform settings"
ON public.platform_company_settings
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete platform settings"
ON public.platform_company_settings
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_platform_company_settings_updated_at
BEFORE UPDATE ON public.platform_company_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial row with the values visible on the uploaded HBL
INSERT INTO public.platform_company_settings (
  legal_name, short_name, oti_number, country, is_active
) VALUES (
  'All Logistics Cargo, Inc.', 'ALC', '020841NF', 'USA', true
)
ON CONFLICT DO NOTHING;