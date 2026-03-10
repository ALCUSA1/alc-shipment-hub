-- Allow truckers to view shipment parties for orders they can bid on
CREATE POLICY "Truckers can view shipment parties for bidding"
ON public.shipment_parties
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'trucker'::app_role));