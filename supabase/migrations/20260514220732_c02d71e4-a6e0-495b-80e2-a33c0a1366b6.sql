
INSERT INTO public.companies (user_id, company_name, company_type, status)
SELECT DISTINCT ON (public.normalize_company_name(p.company_name))
  p.user_id,
  p.company_name,
  'customer',
  'prospect'::company_status
FROM public.profiles p
WHERE p.company_name IS NOT NULL
  AND trim(p.company_name) <> ''
  AND public.normalize_company_name(p.company_name) NOT IN (
    SELECT public.normalize_company_name(company_name) FROM public.companies
  )
ORDER BY public.normalize_company_name(p.company_name), p.created_at ASC;

INSERT INTO public.company_members (company_id, user_id, role, is_active, joined_at)
SELECT c.id, p.user_id, 'viewer'::company_role, true, now()
FROM public.profiles p
JOIN public.companies c
  ON public.normalize_company_name(c.company_name) = public.normalize_company_name(p.company_name)
WHERE p.company_name IS NOT NULL
  AND trim(p.company_name) <> ''
ON CONFLICT (company_id, user_id) DO NOTHING;

UPDATE public.profiles p
SET company_name = c.company_name
FROM public.company_members cm
JOIN public.companies c ON c.id = cm.company_id
WHERE cm.user_id = p.user_id
  AND cm.is_active = true
  AND (p.company_name IS NULL OR trim(p.company_name) = '');

CREATE OR REPLACE FUNCTION public.sync_profile_company_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _company_id uuid;
  _normalized text;
BEGIN
  IF NEW.company_name IS NULL OR trim(NEW.company_name) = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.company_name IS NOT DISTINCT FROM NEW.company_name THEN
    RETURN NEW;
  END IF;

  _normalized := public.normalize_company_name(NEW.company_name);

  SELECT id INTO _company_id
  FROM public.companies
  WHERE public.normalize_company_name(company_name) = _normalized
  LIMIT 1;

  IF _company_id IS NULL THEN
    INSERT INTO public.companies (user_id, company_name, company_type, status)
    VALUES (NEW.user_id, NEW.company_name, 'customer', 'prospect'::company_status)
    RETURNING id INTO _company_id;
  END IF;

  INSERT INTO public.company_members (company_id, user_id, role, is_active, joined_at)
  VALUES (_company_id, NEW.user_id, 'viewer'::company_role, true, now())
  ON CONFLICT (company_id, user_id) DO UPDATE SET is_active = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_company_link ON public.profiles;
CREATE TRIGGER trg_sync_profile_company_link
AFTER INSERT OR UPDATE OF company_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_company_link();
