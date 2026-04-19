-- Replace permissive admin policies with role-restricted equivalents
DROP POLICY IF EXISTS "Admins can insert platform settings" ON public.platform_company_settings;
DROP POLICY IF EXISTS "Admins can update platform settings" ON public.platform_company_settings;
DROP POLICY IF EXISTS "Admins can delete platform settings" ON public.platform_company_settings;

CREATE POLICY "Admins manage platform settings - insert"
ON public.platform_company_settings
AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage platform settings - update"
ON public.platform_company_settings
AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage platform settings - delete"
ON public.platform_company_settings
AS RESTRICTIVE
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also add a permissive admin policy so the restrictive ones combine correctly
CREATE POLICY "Admins can write platform settings"
ON public.platform_company_settings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));