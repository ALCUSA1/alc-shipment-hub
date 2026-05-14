
CREATE OR REPLACE FUNCTION public.can_manage_carrier_rates()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.company_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role::text = 'pricing_manager'
    )
$$;

CREATE TABLE public.carrier_rate_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_code text NOT NULL,
  file_name text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  valid_from date,
  valid_to date,
  notes text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_carrier_rate_uploads_carrier ON public.carrier_rate_uploads(carrier_code, created_at DESC);

CREATE TABLE public.carrier_manual_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES public.carrier_rate_uploads(id) ON DELETE CASCADE,
  carrier_code text NOT NULL,
  trade text,
  rate_group text,
  cargo_type text,
  receipt text,
  pol text,
  pod text,
  delivery text,
  svc_mode text,
  currency text DEFAULT 'USD',
  rate_20sd numeric,
  rate_40sd numeric,
  rate_40hc numeric,
  surcharges text,
  amendment text,
  valid_from date,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_carrier_manual_rates_carrier ON public.carrier_manual_rates(carrier_code);
CREATE INDEX idx_carrier_manual_rates_lane ON public.carrier_manual_rates(carrier_code, pol, pod);

ALTER TABLE public.carrier_rate_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_manual_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage carrier_rate_uploads" ON public.carrier_rate_uploads
  FOR ALL USING (public.can_manage_carrier_rates()) WITH CHECK (public.can_manage_carrier_rates());

CREATE POLICY "Manage carrier_manual_rates" ON public.carrier_manual_rates
  FOR ALL USING (public.can_manage_carrier_rates()) WITH CHECK (public.can_manage_carrier_rates());
