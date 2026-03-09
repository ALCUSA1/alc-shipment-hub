
-- Exchange rates table for multi-currency support
CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'USD',
  target_currency text NOT NULL,
  rate numeric NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base_currency, target_currency, effective_date)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view exchange rates"
ON public.exchange_rates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage exchange rates"
ON public.exchange_rates FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_exchange_rates_updated_at
BEFORE UPDATE ON public.exchange_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
