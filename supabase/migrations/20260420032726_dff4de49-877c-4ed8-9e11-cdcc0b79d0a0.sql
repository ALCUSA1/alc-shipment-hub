-- 1. Drop broad SELECT policy on platform_company_settings; only admins can read full row
DROP POLICY IF EXISTS "Active platform settings readable for view" ON public.platform_company_settings;

-- 2. Drop the realtime policy with ELSE true that allows subscribing to any non-shipment topic
DROP POLICY IF EXISTS "Users can subscribe only to shipments they can view" ON realtime.messages;

-- 3. Defensive: drop any lingering broad profiles policy
DROP POLICY IF EXISTS "Authenticated users can view profiles for messaging" ON public.profiles;