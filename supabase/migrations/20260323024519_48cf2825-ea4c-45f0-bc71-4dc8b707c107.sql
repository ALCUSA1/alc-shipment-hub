
CREATE TABLE public.hs_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duty_rate TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  country_notes TEXT DEFAULT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hs_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own HS codes" ON public.hs_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own HS codes" ON public.hs_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own HS codes" ON public.hs_codes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own HS codes" ON public.hs_codes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_hs_codes_user_id ON public.hs_codes(user_id);
CREATE INDEX idx_hs_codes_code ON public.hs_codes(code);

CREATE TRIGGER update_hs_codes_updated_at BEFORE UPDATE ON public.hs_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
