
-- AI-generated match recommendations
CREATE TABLE public.ai_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type text NOT NULL DEFAULT 'shipment', -- shipment, partner, capacity, high_earning
  title text NOT NULL,
  trade_lane text,
  origin text,
  destination text,
  deal_type text DEFAULT 'shipment', -- shipment, capacity, partnership
  estimated_earnings numeric DEFAULT 0,
  match_score numeric DEFAULT 0, -- 0-100
  reason text, -- why this was matched
  source_type text, -- rfq, feed_post, company, shipment
  source_id uuid,
  status text NOT NULL DEFAULT 'active', -- active, engaged, saved, dismissed
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User feedback on matches for learning
CREATE TABLE public.ai_match_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.ai_matches(id) ON DELETE CASCADE,
  feedback text NOT NULL, -- relevant, not_interested
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ai_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_match_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own matches" ON public.ai_matches FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own matches" ON public.ai_matches FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own matches" ON public.ai_matches FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own matches" ON public.ai_matches FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users view own feedback" ON public.ai_match_feedback FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own feedback" ON public.ai_match_feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_ai_matches_updated_at BEFORE UPDATE ON public.ai_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
