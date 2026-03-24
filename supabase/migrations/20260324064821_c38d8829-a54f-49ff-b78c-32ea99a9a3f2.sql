
-- Fix conversations: restrict INSERT to authenticated users properly
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix edi_messages: keep service role behavior but restrict to admin
DROP POLICY IF EXISTS "Service role can manage all EDI messages" ON public.edi_messages;
CREATE POLICY "Admins can manage all EDI messages"
  ON public.edi_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
