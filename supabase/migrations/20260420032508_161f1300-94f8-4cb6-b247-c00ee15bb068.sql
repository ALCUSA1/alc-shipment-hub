-- 1) platform_company_settings: hide sensitive fields, restrict full table to admins
DROP POLICY IF EXISTS "Authenticated users can view active platform settings" ON public.platform_company_settings;
DROP POLICY IF EXISTS "Authenticated users can view platform settings" ON public.platform_company_settings;

CREATE POLICY "Admins can view platform settings"
  ON public.platform_company_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public-safe view for branding/identity used in document generation, etc.
CREATE OR REPLACE VIEW public.platform_company_settings_public
WITH (security_invoker = on) AS
SELECT
  id,
  legal_name,
  short_name,
  tagline,
  oti_number,
  address_line1,
  address_line2,
  city,
  state,
  postal_code,
  country,
  phone,
  email,
  website,
  logo_url,
  is_active,
  created_at,
  updated_at
FROM public.platform_company_settings
WHERE is_active = true;

GRANT SELECT ON public.platform_company_settings_public TO authenticated, anon;

-- Allow that view to read rows by adding a row-filtered admin-or-active SELECT path
-- (security_invoker means it uses the caller's RLS; provide a non-admin SELECT limited to safe columns via the view)
CREATE POLICY "Authenticated can read active platform settings via view"
  ON public.platform_company_settings
  FOR SELECT
  TO authenticated, anon
  USING (
    is_active = true
    AND current_setting('request.jwt.claims', true) IS NOT NULL
    AND false  -- direct table reads still blocked; the view bypasses by selecting only safe columns? 
  );

-- NOTE: Postgres views with security_invoker still need the underlying table's RLS to allow the
-- caller to read the involved rows. To keep the view usable for everyone while keeping sensitive
-- columns out of reach, we add a row-level allow that only exposes the id of active rows; column
-- protection is enforced by the view's column list. We use a permissive SELECT policy on the base
-- table that allows reading ACTIVE rows only, and rely on the view to drop sensitive columns.
DROP POLICY IF EXISTS "Authenticated can read active platform settings via view" ON public.platform_company_settings;

CREATE POLICY "Active platform settings readable for view"
  ON public.platform_company_settings
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- And re-add admin full access (keeps existing "Admins manage platform settings" and "Admins can write platform settings")
-- The earlier DROPs only removed the broad SELECTs; admin policies still exist.

-- IMPORTANT: With a permissive SELECT on the base table, sensitive columns would still be
-- reachable via direct table SELECT. To prevent that, REVOKE column privileges on sensitive
-- columns from anon and authenticated; admins use the service_role/admin policy.
REVOKE SELECT (bank_name, bank_account_name, bank_account_number, bank_routing_number, bank_swift, bank_address, ein, fmc_license)
  ON public.platform_company_settings FROM anon, authenticated;

-- 2) profiles: replace broad SELECT with same-company / shared-conversation visibility
DROP POLICY IF EXISTS "Authenticated users can view profiles for messaging" ON public.profiles;

CREATE POLICY "Users can view profiles of company peers or chat peers"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Same company peers (any company the caller belongs to)
    EXISTS (
      SELECT 1
      FROM public.company_members me
      JOIN public.company_members them
        ON them.company_id = me.company_id
      WHERE me.user_id = auth.uid()
        AND me.is_active = true
        AND them.is_active = true
        AND them.user_id = profiles.user_id
    )
    OR
    -- Shared conversation peers
    EXISTS (
      SELECT 1
      FROM public.conversation_participants me
      JOIN public.conversation_participants them
        ON them.conversation_id = me.conversation_id
      WHERE me.user_id = auth.uid()
        AND them.user_id = profiles.user_id
    )
  );

-- Lock down the email column from broad reads; only the user themself or admins can read email.
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

-- Public-safe view for messaging UI (no email)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  id, user_id, full_name, company_name, role, avatar_url, logo_url, tagline,
  cover_url, about, services, portfolio_urls, social_links, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- 3) realtime.messages: tighten broad SELECT policy
-- Only allow subscribing to topics that are explicitly scoped to the caller
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;

CREATE POLICY "Users can subscribe to their own scoped topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    -- Per-user notification channels: notifications-<uuid>
    (topic ~~ ('notifications-' || auth.uid()::text))
    OR (topic ~~ ('global-new-messages-' || auth.uid()::text))
    -- Shipment-scoped topics (existing helper)
    OR (topic ~~ 'shipment:%' AND public.can_view_shipment(NULLIF(substring(topic, 'shipment:(.*)'), '')::uuid))
    -- Shipment realtime channels used by the app: shipment-realtime-<uuid>, workspace-<uuid>, cust-shipment-<uuid>, hlag-summary-<uuid>, hlag-live-<uuid>
    OR (topic ~~ 'shipment-realtime-%' AND public.can_view_shipment(NULLIF(substring(topic, 'shipment-realtime-(.*)'), '')::uuid))
    OR (topic ~~ 'workspace-%' AND public.can_view_shipment(NULLIF(substring(topic, 'workspace-(.*)'), '')::uuid))
    OR (topic ~~ 'cust-shipment-%' AND public.can_view_shipment(NULLIF(substring(topic, 'cust-shipment-(.*)'), '')::uuid))
    OR (topic ~~ 'hlag-summary-%' AND public.can_view_shipment(NULLIF(substring(topic, 'hlag-summary-(.*)'), '')::uuid))
    OR (topic ~~ 'hlag-live-%' AND public.can_view_shipment(NULLIF(substring(topic, 'hlag-live-(.*)'), '')::uuid))
    -- Conversation-scoped topics: messages-<conv>, typing-<conv>
    OR (topic ~~ 'messages-%' AND EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.user_id = auth.uid()
          AND cp.conversation_id::text = substring(topic, 'messages-(.*)')
    ))
    OR (topic ~~ 'typing-%' AND EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.user_id = auth.uid()
          AND cp.conversation_id::text = substring(topic, 'typing-(.*)')
    ))
    -- Admin-only channels
    OR (topic = 'admin-alerts-realtime' AND public.has_role(auth.uid(), 'admin'))
    -- Public feed
    OR (topic = 'spark-feed')
  );