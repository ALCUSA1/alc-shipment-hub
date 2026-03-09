
CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role app_role NOT NULL,
  company_name text,
  company_type text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.signup_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own requests" ON public.signup_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all requests" ON public.signup_requests
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
