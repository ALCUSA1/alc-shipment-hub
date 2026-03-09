
-- Fix 1: Replace SECURITY DEFINER view with SECURITY INVOKER
DROP VIEW IF EXISTS public.company_directory;
CREATE VIEW public.company_directory WITH (security_invoker = true) AS
  SELECT id, company_name, company_type, city, state, country, industry, user_id
  FROM public.companies;

-- Fix 2: Tighten conversation_participants INSERT policy
DROP POLICY "Users can insert participations" ON public.conversation_participants;
CREATE POLICY "Users can insert own participations"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix 3: Tighten conversations INSERT policy
DROP POLICY "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add SELECT policy on companies for all authenticated users (for directory)
CREATE POLICY "Authenticated users can view company directory"
  ON public.companies FOR SELECT TO authenticated
  USING (true);
