CREATE TABLE IF NOT EXISTS public.hlag_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  customer_identifier text NOT NULL,
  place_of_receipt text NOT NULL,
  place_of_delivery text NOT NULL,
  iso_equipment_code text,
  units integer DEFAULT 1,
  earliest_departure_date date,
  offer_id text,
  quotation_reference text,
  total_price numeric,
  currency text DEFAULT 'USD',
  transit_days integer,
  valid_until timestamptz,
  status text NOT NULL DEFAULT 'offered',
  is_simulated boolean DEFAULT false,
  raw_price_response jsonb,
  raw_quotation_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hlag_quotations_user ON public.hlag_quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_hlag_quotations_offer ON public.hlag_quotations(offer_id);
CREATE INDEX IF NOT EXISTS idx_hlag_quotations_shipment ON public.hlag_quotations(shipment_id);

ALTER TABLE public.hlag_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own hlag quotations"
  ON public.hlag_quotations FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own hlag quotations"
  ON public.hlag_quotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own hlag quotations"
  ON public.hlag_quotations FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access to hlag quotations"
  ON public.hlag_quotations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE TRIGGER set_hlag_quotations_updated_at
  BEFORE UPDATE ON public.hlag_quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();