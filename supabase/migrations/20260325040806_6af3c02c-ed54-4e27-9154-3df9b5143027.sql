
-- Create the All Logistics Cargo company
INSERT INTO public.companies (id, company_name, company_type, user_id, status)
VALUES (
  'a1c00000-0000-0000-0000-000000000001',
  'All Logistics Cargo',
  'freight_forwarder',
  '0f234d38-3d58-4be5-8c95-c93769789ef2',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Add all profiles with company_name = 'All Logistics Cargo' as members
INSERT INTO company_members (company_id, user_id, role, is_active, joined_at)
SELECT
  'a1c00000-0000-0000-0000-000000000001',
  p.user_id,
  'admin',
  true,
  now()
FROM profiles p
WHERE p.company_name = 'All Logistics Cargo'
ON CONFLICT DO NOTHING;

-- Also add profiles without a company_name that share the same auth account patterns
-- (Syed Hassan-Warsi accounts) as ALC members and set their company_name
UPDATE profiles
SET company_name = 'All Logistics Cargo'
WHERE user_id IN ('b11985da-e67e-4b0a-82b0-e873e04985d8', '25af8927-be04-433e-abcb-fa6be10ee3d2')
  AND (company_name IS NULL OR company_name = '');

INSERT INTO company_members (company_id, user_id, role, is_active, joined_at)
VALUES
  ('a1c00000-0000-0000-0000-000000000001', 'b11985da-e67e-4b0a-82b0-e873e04985d8', 'admin', true, now()),
  ('a1c00000-0000-0000-0000-000000000001', '25af8927-be04-433e-abcb-fa6be10ee3d2', 'admin', true, now())
ON CONFLICT DO NOTHING;
