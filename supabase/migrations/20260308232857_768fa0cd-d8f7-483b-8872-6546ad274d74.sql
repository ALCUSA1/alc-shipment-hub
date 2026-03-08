
-- Add trade-term fields to shipments
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS incoterms text DEFAULT NULL;

-- Add value and origin fields to cargo
ALTER TABLE public.cargo ADD COLUMN IF NOT EXISTS unit_value numeric DEFAULT NULL;
ALTER TABLE public.cargo ADD COLUMN IF NOT EXISTS total_value numeric DEFAULT NULL;
ALTER TABLE public.cargo ADD COLUMN IF NOT EXISTS country_of_origin text DEFAULT NULL;
