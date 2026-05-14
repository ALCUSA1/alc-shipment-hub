
-- Fix normalize function to use Postgres word boundary \y instead of \b
CREATE OR REPLACE FUNCTION public.normalize_company_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(coalesce(_name, '')),
        '\y(inc|incorporated|llc|l\.l\.c\.|ltd|limited|corp|corporation|co|company|gmbh|sa|s\.a\.|ag|plc|llp|lp|pte|pvt|pty|bv|nv|kg|srl|spa|oy|ab)\.?\y',
        '', 'gi'
      ),
      '[^a-z0-9]+', '', 'g'
    ),
    '\s+', '', 'g'
  )
$$;

-- Merge duplicate ALC companies: keep oldest, move members, delete duplicates
DO $$
DECLARE
  _keeper uuid;
  _dup record;
BEGIN
  -- Group companies by normalized name, find groups with > 1
  FOR _dup IN
    SELECT public.normalize_company_name(company_name) AS norm
    FROM public.companies
    WHERE public.normalize_company_name(company_name) <> ''
    GROUP BY public.normalize_company_name(company_name)
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO _keeper FROM public.companies
    WHERE public.normalize_company_name(company_name) = _dup.norm
    ORDER BY created_at ASC LIMIT 1;

    -- Move members from duplicates to keeper
    UPDATE public.company_members SET company_id = _keeper
    WHERE company_id IN (
      SELECT id FROM public.companies
      WHERE public.normalize_company_name(company_name) = _dup.norm AND id <> _keeper
    )
    AND user_id NOT IN (SELECT user_id FROM public.company_members WHERE company_id = _keeper);

    -- Delete remaining duplicate member rows (already-linked users) and duplicate companies
    DELETE FROM public.company_members
    WHERE company_id IN (
      SELECT id FROM public.companies
      WHERE public.normalize_company_name(company_name) = _dup.norm AND id <> _keeper
    );

    DELETE FROM public.companies
    WHERE public.normalize_company_name(company_name) = _dup.norm AND id <> _keeper;
  END LOOP;
END $$;

-- Re-sync profile.company_name to keeper company name
UPDATE public.profiles p
SET company_name = c.company_name
FROM public.company_members cm
JOIN public.companies c ON c.id = cm.company_id
WHERE cm.user_id = p.user_id
  AND cm.is_active = true
  AND public.normalize_company_name(p.company_name) = public.normalize_company_name(c.company_name)
  AND p.company_name IS DISTINCT FROM c.company_name;
