CREATE POLICY "Shipment owners can create trucking quotes"
ON public.trucking_quotes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = trucking_quotes.shipment_id
      AND s.user_id = auth.uid()
  )
);