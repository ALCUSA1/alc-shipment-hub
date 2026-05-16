
-- 1) Bookings family: remove NULL-shipment passthrough
DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;
CREATE POLICY "Users view own bookings"
ON public.bookings
FOR SELECT TO authenticated
USING (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id));

DROP POLICY IF EXISTS "Users can view booking_commodities for accessible shipments" ON public.booking_commodities;
CREATE POLICY "Users can view booking_commodities for accessible shipments"
ON public.booking_commodities
FOR SELECT TO authenticated
USING (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id));

DROP POLICY IF EXISTS "Users can view booking_locations for accessible shipments" ON public.booking_locations;
CREATE POLICY "Users can view booking_locations for accessible shipments"
ON public.booking_locations
FOR SELECT TO authenticated
USING (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id));

DROP POLICY IF EXISTS "Users can view booking_customs_references for accessible shipme" ON public.booking_customs_references;
CREATE POLICY "Users can view booking_customs_references for accessible shipme"
ON public.booking_customs_references
FOR SELECT TO authenticated
USING (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id));

DROP POLICY IF EXISTS "Users can view transport documents for their shipments" ON public.transport_documents;
CREATE POLICY "Users can view transport documents for their shipments"
ON public.transport_documents
FOR SELECT TO authenticated
USING (
  (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2) HLAG live events: NULL shipment_id no longer readable
DROP POLICY IF EXISTS "Authenticated users can view live events for their shipments" ON public.hlag_live_events;
CREATE POLICY "Authenticated users can view live events for their shipments"
ON public.hlag_live_events
FOR SELECT TO authenticated
USING (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id));

-- 3) Realtime: remove public:% write target
DROP POLICY IF EXISTS "Authenticated scoped realtime write" ON realtime.messages;
CREATE POLICY "Authenticated scoped realtime write"
ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND realtime.topic() = ('user:' || (auth.uid())::text)
);

-- Also tighten read side: remove public:% subscription wildcard
DROP POLICY IF EXISTS "Authenticated scoped realtime read" ON realtime.messages;
CREATE POLICY "Authenticated scoped realtime read"
ON realtime.messages
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    realtime.topic() = 'spark-feed'
    OR realtime.topic() = ('user:' || (auth.uid())::text)
    OR (realtime.topic() ~~ 'shipment:%'
        AND public.can_view_shipment((NULLIF(split_part(realtime.topic(), ':', 2), ''))::uuid))
  )
);

-- 4) Email tables: restrict policies TO service_role
DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "Service role can manage send state"
ON public.email_send_state
FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role manages send log"
ON public.email_send_log
FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role manages unsubscribe tokens"
ON public.email_unsubscribe_tokens
FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role manages suppressed emails"
ON public.suppressed_emails
FOR ALL TO service_role
USING (true) WITH CHECK (true);
