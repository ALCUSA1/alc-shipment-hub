-- Restrict blocked_email_domains SELECT to authenticated users only.
-- The is_blocked_email_domain() SECURITY DEFINER function continues to enforce blocking
-- during signup regardless of this policy.
DROP POLICY IF EXISTS "Anyone can read blocked email domains" ON public.blocked_email_domains;

CREATE POLICY "Authenticated users can read blocked email domains"
ON public.blocked_email_domains
FOR SELECT
TO authenticated
USING (true);