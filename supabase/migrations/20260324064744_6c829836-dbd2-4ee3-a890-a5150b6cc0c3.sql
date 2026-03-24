
-- Fix quotes: anon policy should require a specific token match, not just IS NOT NULL
DROP POLICY IF EXISTS "Public can view quotes by approval token" ON public.quotes;
CREATE POLICY "Public can view quotes by specific approval token"
  ON public.quotes FOR SELECT TO anon
  USING (
    approval_token IS NOT NULL
    AND approval_token::text = current_setting('request.headers', true)::json->>'x-approval-token'
  );

-- Fix carrier_payment_profiles: restrict SELECT to admins only (sensitive financial data)
DROP POLICY IF EXISTS "Authenticated users can view carrier profiles" ON public.carrier_payment_profiles;
CREATE POLICY "Admins can view carrier payment profiles"
  ON public.carrier_payment_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix partnership_requests: restrict SELECT to involved parties only
DROP POLICY IF EXISTS "Anyone authenticated can view partnerships" ON public.partnership_requests;
CREATE POLICY "Users can view own partnership requests"
  ON public.partnership_requests FOR SELECT TO authenticated
  USING (
    requester_user_id = auth.uid()
    OR target_company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
  );
