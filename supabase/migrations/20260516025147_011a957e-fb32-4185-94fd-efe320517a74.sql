
-- 1. carrier_payment_profiles: writes service_role only, admins keep read
DROP POLICY IF EXISTS "Admins can manage carrier payment profiles" ON public.carrier_payment_profiles;
CREATE POLICY "Service role can write carrier payment profiles"
ON public.carrier_payment_profiles
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- 2. platform_company_settings: writes service_role only, admins keep read
DROP POLICY IF EXISTS "Admins can write platform settings" ON public.platform_company_settings;
DROP POLICY IF EXISTS "Admins manage platform settings - delete" ON public.platform_company_settings;
DROP POLICY IF EXISTS "Admins manage platform settings - insert" ON public.platform_company_settings;
DROP POLICY IF EXISTS "Admins manage platform settings - update" ON public.platform_company_settings;
CREATE POLICY "Service role can write platform settings"
ON public.platform_company_settings
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- 3. Admin SELECT for issuance_records and issuance_response_codes
CREATE POLICY "Admins can view issuance records"
ON public.issuance_records FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view issuance response codes"
ON public.issuance_response_codes FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Tighten realtime.messages SELECT - remove postgres_changes wildcard
DROP POLICY IF EXISTS "Authenticated scoped realtime read" ON realtime.messages;
CREATE POLICY "Authenticated scoped realtime read"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    realtime.topic() = 'spark-feed'
    OR realtime.topic() = ('user:' || auth.uid()::text)
    OR realtime.topic() LIKE 'public:%'
    OR (realtime.topic() LIKE 'shipment:%' AND can_view_shipment((NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid))
  )
);

-- 5. Lock down SECURITY DEFINER function EXECUTE privileges.
-- Trigger-only functions: revoke from anon AND authenticated (only invoked by postgres triggers).
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'alert_on_edi_error()','alert_on_payment_failure()','alert_on_shipment_stuck()',
    'audit_trigger_fn()','auto_create_customs_filing()','auto_create_milestone_on_lifecycle()',
    'auto_create_tasks_on_lifecycle()','auto_notify_on_lifecycle()','auto_request_documents_on_booking()',
    'derive_shipment_status_from_events()','guard_user_roles_insert()','handle_new_user()',
    'log_lifecycle_change()','notify_customer_on_booking()','notify_on_document_ready()',
    'notify_on_new_charge()','notify_on_partner_assignment()','notify_on_payment_update()',
    'notify_on_status_change()','notify_on_tracking_event()','remove_demurrage_financial()',
    'sync_demurrage_to_financials()','sync_profile_company_link()','sync_shipment_refs_from_shipments()',
    'validate_lifecycle_transition()','set_updated_at()','update_updated_at_column()',
    'generate_shipment_ref()','normalize_company_name(text)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;

-- RLS helper functions: revoke from anon (RLS runs as definer, no direct execute needed). Keep authenticated where used by RPC.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'can_edit_shipment(uuid)','can_manage_carrier_rates()','can_view_shipment(uuid)',
    'get_company_role(uuid,uuid)','get_user_company_ids()',
    'has_company_role(uuid,text[])','has_role(uuid,app_role)','is_blocked_email_domain(text)',
    'is_company_member(uuid,uuid)','scenario_company_id(uuid)','shipment_company_id(uuid)',
    'trucker_has_shipment_access(uuid)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;

-- Email queue helpers and DLQ: revoke from everyone, service_role only via supabase default
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'enqueue_email(text,jsonb)','read_email_batch(text,integer,integer)',
    'delete_email(text,bigint)','move_to_dlq(text,text,bigint,jsonb)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;

-- RPC-callable helpers (called via supabase.rpc from authenticated client): revoke from anon only
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'get_user_roles(uuid)','get_customer_visible_shipment_ids()','resolve_shipment_reference(text)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;
