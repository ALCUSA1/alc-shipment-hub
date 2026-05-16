-- 1) Restrict blocked_email_domains SELECT to admins
DROP POLICY IF EXISTS "Authenticated users can read blocked email domains" ON public.blocked_email_domains;

CREATE POLICY "Admins can read blocked email domains"
ON public.blocked_email_domains
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2) Remove admin_alerts from realtime publication (if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_alerts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.admin_alerts';
  END IF;
END $$;