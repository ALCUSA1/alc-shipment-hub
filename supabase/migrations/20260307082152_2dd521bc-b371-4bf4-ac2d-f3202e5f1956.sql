
-- Carrier rates table for monthly shipping line pricing
CREATE TABLE public.carrier_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carrier text NOT NULL,
  origin_port text NOT NULL,
  destination_port text NOT NULL,
  container_type text NOT NULL,
  base_rate numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  transit_days integer,
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  surcharges jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.carrier_rates ENABLE ROW LEVEL SECURITY;

-- Rates are viewable by all authenticated users
CREATE POLICY "Authenticated users can view carrier rates"
ON public.carrier_rates FOR SELECT TO authenticated
USING (true);

-- Updated_at trigger
CREATE TRIGGER update_carrier_rates_updated_at
  BEFORE UPDATE ON public.carrier_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
