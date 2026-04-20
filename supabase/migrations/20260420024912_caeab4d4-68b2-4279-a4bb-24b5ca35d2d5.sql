
-- 1. platform_company_settings: remove anonymous read; restrict to authenticated only
DROP POLICY IF EXISTS "Public can view active platform settings" ON public.platform_company_settings;
CREATE POLICY "Authenticated users can view active platform settings"
  ON public.platform_company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. issuance_response_code_mappings: restrict full-access policy to service_role
DROP POLICY IF EXISTS "Service role full access on issuance_response_code_mappings" ON public.issuance_response_code_mappings;
CREATE POLICY "Service role full access on issuance_response_code_mappings"
  ON public.issuance_response_code_mappings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Authenticated users can read issuance_response_code_mappings"
  ON public.issuance_response_code_mappings
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. issuance_errors: restrict full-access policy to service_role
DROP POLICY IF EXISTS "Service role full access on issuance_errors" ON public.issuance_errors;
CREATE POLICY "Service role full access on issuance_errors"
  ON public.issuance_errors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Admins can read issuance_errors"
  ON public.issuance_errors
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. hlag_live_events: restrict INSERT to service_role only
DROP POLICY IF EXISTS "System can insert live events" ON public.hlag_live_events;
CREATE POLICY "Service role can insert live events"
  ON public.hlag_live_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 5. chat-attachments storage: enforce conversation-membership ownership
DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;

CREATE POLICY "Conversation members can view chat attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
        AND cp.conversation_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Conversation members can upload chat attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
        AND cp.conversation_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Conversation members can delete their chat attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND owner = auth.uid()
  );

-- 6. Booking and transport document tables: replace USING (true) with can_view_shipment-based checks
-- booking_commodities
DROP POLICY IF EXISTS "Authenticated read booking_commodities" ON public.booking_commodities;
CREATE POLICY "Users can view booking_commodities for accessible shipments"
  ON public.booking_commodities
  FOR SELECT
  TO authenticated
  USING (
    shipment_id IS NULL
    OR public.can_view_shipment(shipment_id)
  );

-- booking_customs_references
DROP POLICY IF EXISTS "Authenticated read booking_customs_references" ON public.booking_customs_references;
CREATE POLICY "Users can view booking_customs_references for accessible shipments"
  ON public.booking_customs_references
  FOR SELECT
  TO authenticated
  USING (
    shipment_id IS NULL
    OR public.can_view_shipment(shipment_id)
  );

-- booking_locations
DROP POLICY IF EXISTS "Authenticated read booking_locations" ON public.booking_locations;
CREATE POLICY "Users can view booking_locations for accessible shipments"
  ON public.booking_locations
  FOR SELECT
  TO authenticated
  USING (
    shipment_id IS NULL
    OR public.can_view_shipment(shipment_id)
  );

-- booking_notifications (no shipment_id; gate via parent booking -> shipment)
DROP POLICY IF EXISTS "Authenticated read booking_notifications" ON public.booking_notifications;
CREATE POLICY "Users can view booking_notifications for accessible bookings"
  ON public.booking_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_notifications.booking_id
        AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
    )
  );

-- shipping_instructions (gate via booking -> shipment)
DROP POLICY IF EXISTS "Authenticated read shipping_instructions" ON public.shipping_instructions;
CREATE POLICY "Users can view shipping_instructions for accessible bookings"
  ON public.shipping_instructions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = shipping_instructions.booking_id
        AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
    )
  );

-- transport_document_charges
DROP POLICY IF EXISTS "Authenticated read transport_document_charges" ON public.transport_document_charges;
CREATE POLICY "Users can view transport_document_charges for accessible shipments"
  ON public.transport_document_charges
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transport_documents td
      LEFT JOIN public.bookings b ON b.id = td.booking_id
      WHERE td.id = transport_document_charges.transport_document_id
        AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
    )
  );

-- transport_document_consignment_items
DROP POLICY IF EXISTS "Authenticated read transport_document_consignment_items" ON public.transport_document_consignment_items;
CREATE POLICY "Users can view transport_document_consignment_items for accessible shipments"
  ON public.transport_document_consignment_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transport_documents td
      LEFT JOIN public.bookings b ON b.id = td.booking_id
      WHERE td.id = transport_document_consignment_items.transport_document_id
        AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
    )
  );

-- transport_document_equipments
DROP POLICY IF EXISTS "Authenticated read transport_document_equipments" ON public.transport_document_equipments;
CREATE POLICY "Users can view transport_document_equipments for accessible shipments"
  ON public.transport_document_equipments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transport_documents td
      LEFT JOIN public.bookings b ON b.id = td.booking_id
      WHERE td.id = transport_document_equipments.transport_document_id
        AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
    )
  );

-- transport_document_instructions
DROP POLICY IF EXISTS "Authenticated read transport_document_instructions" ON public.transport_document_instructions;
CREATE POLICY "Users can view transport_document_instructions for accessible shipments"
  ON public.transport_document_instructions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transport_documents td
      LEFT JOIN public.bookings b ON b.id = td.booking_id
      WHERE td.id = transport_document_instructions.transport_document_id
        AND (b.shipment_id IS NULL OR public.can_view_shipment(b.shipment_id))
    )
  );
