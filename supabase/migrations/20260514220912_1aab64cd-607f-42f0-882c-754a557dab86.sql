
CREATE POLICY "Admins can view all company members"
ON public.company_members FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
