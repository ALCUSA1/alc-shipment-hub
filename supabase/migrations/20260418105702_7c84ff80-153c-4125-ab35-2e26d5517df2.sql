-- Table for blocked email domains
CREATE TABLE public.blocked_email_domains (
  domain text PRIMARY KEY,
  added_at timestamptz NOT NULL DEFAULT now(),
  note text
);

ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can read — needed for client-side validation pre-signup
CREATE POLICY "Anyone can read blocked email domains"
ON public.blocked_email_domains
FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can insert blocked domains"
ON public.blocked_email_domains
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blocked domains"
ON public.blocked_email_domains
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blocked domains"
ON public.blocked_email_domains
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seed common free email providers
INSERT INTO public.blocked_email_domains (domain, note) VALUES
  ('gmail.com', 'Free provider'),
  ('googlemail.com', 'Free provider'),
  ('yahoo.com', 'Free provider'),
  ('ymail.com', 'Free provider'),
  ('rocketmail.com', 'Free provider'),
  ('hotmail.com', 'Free provider'),
  ('hotmail.co.uk', 'Free provider'),
  ('outlook.com', 'Free provider'),
  ('live.com', 'Free provider'),
  ('msn.com', 'Free provider'),
  ('aol.com', 'Free provider'),
  ('icloud.com', 'Free provider'),
  ('me.com', 'Free provider'),
  ('mac.com', 'Free provider'),
  ('protonmail.com', 'Free provider'),
  ('proton.me', 'Free provider'),
  ('pm.me', 'Free provider'),
  ('gmx.com', 'Free provider'),
  ('gmx.net', 'Free provider'),
  ('gmx.de', 'Free provider'),
  ('mail.com', 'Free provider'),
  ('yandex.com', 'Free provider'),
  ('yandex.ru', 'Free provider'),
  ('zoho.com', 'Free provider'),
  ('tutanota.com', 'Free provider'),
  ('tuta.io', 'Free provider'),
  ('fastmail.com', 'Free provider'),
  ('hey.com', 'Free provider'),
  ('qq.com', 'Free provider'),
  ('163.com', 'Free provider'),
  ('126.com', 'Free provider'),
  ('sina.com', 'Free provider'),
  ('naver.com', 'Free provider'),
  ('hanmail.net', 'Free provider'),
  ('daum.net', 'Free provider'),
  ('web.de', 'Free provider'),
  ('t-online.de', 'Free provider'),
  ('free.fr', 'Free provider'),
  ('orange.fr', 'Free provider'),
  ('laposte.net', 'Free provider'),
  ('libero.it', 'Free provider'),
  ('hushmail.com', 'Free provider'),
  ('inbox.com', 'Free provider'),
  ('rediffmail.com', 'Free provider'),
  ('btinternet.com', 'Free provider'),
  ('sbcglobal.net', 'Free provider'),
  ('comcast.net', 'Free provider'),
  ('verizon.net', 'Free provider'),
  ('cox.net', 'Free provider'),
  ('att.net', 'Free provider'),
  ('mail.ru', 'Free provider'),
  ('bk.ru', 'Free provider'),
  ('list.ru', 'Free provider')
ON CONFLICT (domain) DO NOTHING;

-- Helper to check if an email's domain is blocked
CREATE OR REPLACE FUNCTION public.is_blocked_email_domain(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_email_domains
    WHERE domain = lower(split_part(_email, '@', 2))
  )
$$;

-- Update handle_new_user to reject blocked domains
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _requested_role text;
BEGIN
  -- Block free/personal email providers
  IF public.is_blocked_email_domain(NEW.email) THEN
    RAISE EXCEPTION 'Please use your business email address. Free email providers (e.g. gmail.com, hotmail.com, outlook.com) are not accepted.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Insert profile (existing behavior)
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-assign role from signup metadata
  _requested_role := NEW.raw_user_meta_data ->> 'requested_role';

  IF _requested_role IN ('viewer', 'forwarder', 'trucker', 'warehouse', 'driver') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _requested_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;