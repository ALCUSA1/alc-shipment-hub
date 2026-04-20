
-- ============================================================
-- FIX 1: hlag_live_subscriptions — restrict SELECT, hide secrets
-- ============================================================
DROP POLICY IF EXISTS "Company members view live subs" ON public.hlag_live_subscriptions;
DROP POLICY IF EXISTS "Ops can create live subs" ON public.hlag_live_subscriptions;
DROP POLICY IF EXISTS "Ops can update live subs" ON public.hlag_live_subscriptions;
DROP POLICY IF EXISTS "Ops can delete live subs" ON public.hlag_live_subscriptions;

-- SELECT: authenticated only. Global rows (shipment_id IS NULL) require admin or creator.
CREATE POLICY "Authenticated read live subs"
ON public.hlag_live_subscriptions
FOR SELECT
TO authenticated
USING (
  (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id))
  OR (shipment_id IS NULL AND (
        public.has_role(auth.uid(), 'admin')
     OR created_by_user_id = auth.uid()
  ))
);

CREATE POLICY "Ops can create live subs"
ON public.hlag_live_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  (shipment_id IS NOT NULL AND public.can_edit_shipment(shipment_id))
  OR (shipment_id IS NULL AND public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Ops can update live subs"
ON public.hlag_live_subscriptions
FOR UPDATE
TO authenticated
USING (
  (shipment_id IS NOT NULL AND public.can_edit_shipment(shipment_id))
  OR (shipment_id IS NULL AND public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Ops can delete live subs"
ON public.hlag_live_subscriptions
FOR DELETE
TO authenticated
USING (
  (shipment_id IS NOT NULL AND public.can_edit_shipment(shipment_id))
  OR (shipment_id IS NULL AND public.has_role(auth.uid(), 'admin'))
);

-- Stop publishing this table to Realtime so callback_secret isn't broadcast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'hlag_live_subscriptions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.hlag_live_subscriptions';
  END IF;
END $$;

-- ============================================================
-- FIX 2: booking_parties — scope SELECT by shipment visibility
-- ============================================================
DROP POLICY IF EXISTS "Authenticated read booking_parties" ON public.booking_parties;

CREATE POLICY "Read booking_parties via shipment visibility"
ON public.booking_parties
FOR SELECT
TO authenticated
USING (
  (shipment_id IS NOT NULL AND public.can_view_shipment(shipment_id))
  OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_parties.booking_id
      AND b.shipment_id IS NOT NULL
      AND public.can_view_shipment(b.shipment_id)
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- ============================================================
-- FIX 3: shipment-documents storage — owner-scoped policies
-- Convention: object path is "<user_id>/..." OR "<shipment_id>/..."
-- We accept either: folder matches auth.uid(), or folder is a shipment_id the user can view.
-- ============================================================
DROP POLICY IF EXISTS "Users can view shipment documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload shipment documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update shipment documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete shipment documents" ON storage.objects;

CREATE POLICY "Read own shipment documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'shipment-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.can_view_shipment(((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Upload own shipment documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shipment-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.can_edit_shipment(((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Update own shipment documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shipment-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.can_edit_shipment(((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Delete own shipment documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shipment-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.can_edit_shipment(((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'admin')
  )
);
