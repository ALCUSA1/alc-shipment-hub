
-- 1) Protect hlag_live_subscriptions.callback_secret
-- Drop the broad authenticated read policy and replace with admin-only read.
-- Service role (used by webhook + manager edge functions) bypasses RLS.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT polname FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'hlag_live_subscriptions' AND pol.polcmd = 'r'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.hlag_live_subscriptions', p.polname);
  END LOOP;
END$$;

CREATE POLICY "Admins can view live subscriptions"
ON public.hlag_live_subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Provide a safe view (no secret) for app users who can view the shipment
CREATE OR REPLACE VIEW public.hlag_live_subscriptions_safe
WITH (security_invoker = true) AS
SELECT
  id, shipment_id, carrier_booking_reference, equipment_reference,
  feed_type, hlag_subscription_id, package_name, status, trigger_source,
  simulated, last_event_at, last_error, created_at, updated_at
FROM public.hlag_live_subscriptions
WHERE shipment_id IS NULL OR public.can_view_shipment(shipment_id);

GRANT SELECT ON public.hlag_live_subscriptions_safe TO authenticated;

-- 2) Realtime channel-level authorization on realtime.messages
-- Default-deny: drop any permissive policies, then add narrowly scoped ones.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT polname FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'realtime' AND c.relname = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', p.polname);
  END LOOP;
END$$;

-- Authenticated users may read realtime broadcast for allowed topic patterns only.
-- Topics are scoped per-user (user:<uid>), per-shipment (shipment:<id>), or known global feeds.
CREATE POLICY "Authenticated scoped realtime read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    realtime.topic() = 'spark-feed'
    OR realtime.topic() = ('user:' || auth.uid()::text)
    OR realtime.topic() LIKE 'public:%'
    OR (
      realtime.topic() LIKE 'shipment:%'
      AND public.can_view_shipment(
        NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
      )
    )
    OR (
      realtime.topic() LIKE 'postgres_changes:%'
    )
  )
);

-- Allow authenticated users to send broadcasts only to their own user topic.
CREATE POLICY "Authenticated scoped realtime write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    realtime.topic() = ('user:' || auth.uid()::text)
    OR realtime.topic() LIKE 'public:%'
  )
);

-- 3) Hash unsubscribe tokens at rest
ALTER TABLE public.email_unsubscribe_tokens
  ADD COLUMN IF NOT EXISTS token_hash text;

-- Backfill hashes for existing tokens (sha256 hex)
UPDATE public.email_unsubscribe_tokens
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_hash
  ON public.email_unsubscribe_tokens(token_hash);
