
-- Add company_type to distinguish customer, consignee, trucking companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS company_type text NOT NULL DEFAULT 'customer';

-- Add comment for clarity
COMMENT ON COLUMN public.companies.company_type IS 'customer, consignee, trucking';
