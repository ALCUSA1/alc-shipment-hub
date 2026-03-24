
-- Pipeline deals: tracks Spark opportunities through the deal lifecycle
CREATE TABLE public.pipeline_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'opportunity',
  title text NOT NULL,
  company_name text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_type text NOT NULL DEFAULT 'shipment', -- shipment, capacity, partnership
  trade_lane text, -- e.g. "Shanghai → Los Angeles"
  origin text,
  destination text,
  volume text, -- e.g. "2x40HC"
  timeline text, -- e.g. "Apr 2026"
  carrier text,
  estimated_earnings numeric DEFAULT 0,
  confirmed_earnings numeric DEFAULT 0,
  paid_earnings numeric DEFAULT 0,
  deal_amount numeric DEFAULT 0,
  -- source linkage
  source_type text, -- 'rfq', 'feed_post', 'partnership', 'manual'
  source_id uuid, -- rfq_posts.id or feed_posts.id
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Earnings ledger: records each earnings event
CREATE TABLE public.earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.pipeline_deals(id) ON DELETE SET NULL,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  earning_type text NOT NULL DEFAULT 'shipment', -- shipment, referral, capacity
  description text NOT NULL,
  source_ref text, -- human-readable ref like "SHP-2026-041"
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending', -- pending, confirmed, paid
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User earnings balance (materialized summary)
CREATE TABLE public.earnings_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  available_balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  lifetime_earnings numeric NOT NULL DEFAULT 0,
  payment_method text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.pipeline_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_balance ENABLE ROW LEVEL SECURITY;

-- Pipeline deals: users see their own
CREATE POLICY "Users can view own pipeline deals" ON public.pipeline_deals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own pipeline deals" ON public.pipeline_deals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own pipeline deals" ON public.pipeline_deals FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own pipeline deals" ON public.pipeline_deals FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Earnings: users see their own
CREATE POLICY "Users can view own earnings" ON public.earnings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own earnings" ON public.earnings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Earnings balance: users see their own
CREATE POLICY "Users can view own balance" ON public.earnings_balance FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own balance" ON public.earnings_balance FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own balance" ON public.earnings_balance FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_pipeline_deals_updated_at BEFORE UPDATE ON public.pipeline_deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_earnings_balance_updated_at BEFORE UPDATE ON public.earnings_balance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for pipeline_deals
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_deals;
