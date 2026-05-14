
-- 1. Normalization helper
CREATE OR REPLACE FUNCTION public.normalize_company_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(coalesce(_name, '')),
        '\b(inc|incorporated|llc|l\.l\.c\.|ltd|limited|corp|corporation|co|company|gmbh|sa|s\.a\.|ag|plc|llp|lp|pte|pvt|pty|bv|nv|kg|srl|spa|oy|ab)\.?\b',
        '', 'gi'
      ),
      '[^a-z0-9]+', '', 'g'
    ),
    '\s+', '', 'g'
  )
$$;

-- 2. Clean up the 3 known empty duplicates
DELETE FROM public.companies
WHERE id IN (
  'dff9fb8c-7d92-4354-86af-b4e3b901ba32',
  '97dc6f8b-b740-4f44-abcf-cc2635dfba8c',
  'd47b5bc9-73c2-4e43-b7f9-b12418334972'
)
AND NOT EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = companies.id);

-- 3. De-duplicate any remaining: keep the oldest row per normalized name that has the most members
WITH ranked AS (
  SELECT c.id,
         public.normalize_company_name(c.company_name) AS norm,
         (SELECT count(*) FROM public.company_members cm WHERE cm.company_id = c.id) AS members,
         c.created_at,
         row_number() OVER (
           PARTITION BY public.normalize_company_name(c.company_name)
           ORDER BY (SELECT count(*) FROM public.company_members cm WHERE cm.company_id = c.id) DESC,
                    c.created_at ASC
         ) AS rn
  FROM public.companies c
  WHERE public.normalize_company_name(c.company_name) <> ''
)
DELETE FROM public.companies
WHERE id IN (
  SELECT r.id FROM ranked r
  WHERE r.rn > 1
    AND r.members = 0
);

-- 4. Unique index on normalized name (only when normalization yields something)
CREATE UNIQUE INDEX IF NOT EXISTS companies_normalized_name_unique
  ON public.companies (public.normalize_company_name(company_name))
  WHERE public.normalize_company_name(company_name) <> '';
