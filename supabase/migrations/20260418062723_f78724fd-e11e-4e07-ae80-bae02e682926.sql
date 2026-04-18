DROP POLICY IF EXISTS "Authenticated users can read transport_documents" ON public.transport_documents;

CREATE POLICY "Users can view transport documents for their shipments"
ON public.transport_documents
FOR SELECT
TO authenticated
USING (
  shipment_id IS NULL
  OR public.can_view_shipment(shipment_id)
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Authenticated users can read schedule queries" ON public.commercial_schedule_queries;

CREATE POLICY "Admins can view schedule queries"
ON public.commercial_schedule_queries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));