
CREATE TABLE public.hs_code_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duty_rate TEXT DEFAULT NULL,
  special_rate TEXT DEFAULT NULL,
  unit_of_quantity TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  indent INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hs_code_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read HS code reference" ON public.hs_code_reference FOR SELECT USING (true);

CREATE INDEX idx_hs_code_ref_code ON public.hs_code_reference(code);
CREATE INDEX idx_hs_code_ref_description ON public.hs_code_reference USING gin(to_tsvector('english', description));
