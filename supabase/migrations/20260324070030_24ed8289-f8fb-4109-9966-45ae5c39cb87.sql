
-- Extend shipment_rates with buy-rate tracking fields
ALTER TABLE public.shipment_rates
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS carrier_rate_id uuid REFERENCES public.carrier_rates(id),
  ADD COLUMN IF NOT EXISTS origin_port text,
  ADD COLUMN IF NOT EXISTS destination_port text,
  ADD COLUMN IF NOT EXISTS mode text DEFAULT 'ocean',
  ADD COLUMN IF NOT EXISTS base_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_buy_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_time_days integer,
  ADD COLUMN IF NOT EXISTS snapshot_taken_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trade_lane text,
  ADD COLUMN IF NOT EXISTS service_level text DEFAULT 'standard';

-- Extend pricing_outputs with platform profit fields
ALTER TABLE public.pricing_outputs
  ADD COLUMN IF NOT EXISTS carrier_buy_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_retained_profit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS network_share numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_share numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collaboration_share numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sell_price numeric DEFAULT 0;

-- Extend carrier_rates for better filtering
ALTER TABLE public.carrier_rates
  ADD COLUMN IF NOT EXISTS trade_lane text,
  ADD COLUMN IF NOT EXISTS service_level text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS free_time_days integer;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_carrier_rates_lane ON public.carrier_rates(origin_port, destination_port, mode);
CREATE INDEX IF NOT EXISTS idx_carrier_rates_validity ON public.carrier_rates(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_shipment_rates_company ON public.shipment_rates(company_id);
