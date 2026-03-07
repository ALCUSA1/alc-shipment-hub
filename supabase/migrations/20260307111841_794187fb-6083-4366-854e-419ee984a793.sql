
-- Enhance quotes table with margin, carrier rate reference, and approval fields
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS carrier_rate_id UUID REFERENCES public.carrier_rates(id),
  ADD COLUMN IF NOT EXISTS carrier_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_type TEXT DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS margin_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS origin_port TEXT,
  ADD COLUMN IF NOT EXISTS destination_port TEXT,
  ADD COLUMN IF NOT EXISTS container_type TEXT,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS transit_days INTEGER,
  ADD COLUMN IF NOT EXISTS approval_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Add cutoff dates to shipments table
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS cy_cutoff TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS si_cutoff TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vgm_cutoff TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS doc_cutoff TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_from_quote_id UUID REFERENCES public.quotes(id);

-- Allow public access to quotes by approval token (for customer-facing page)
CREATE POLICY "Public can view quotes by approval token"
ON public.quotes FOR SELECT
TO anon
USING (approval_token IS NOT NULL);
