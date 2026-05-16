
DROP POLICY IF EXISTS "Truckers can view shipments for bidding" ON public.shipments;
CREATE POLICY "Truckers can view their assigned shipments"
ON public.shipments FOR SELECT
USING (
  has_role(auth.uid(), 'trucker'::app_role)
  AND public.trucker_has_shipment_access(id)
);

DROP POLICY IF EXISTS "Truckers can view shipment parties for bidding" ON public.shipment_parties;
CREATE POLICY "Truckers can view shipment parties for their shipments"
ON public.shipment_parties FOR SELECT
USING (
  has_role(auth.uid(), 'trucker'::app_role)
  AND public.trucker_has_shipment_access(shipment_id)
);
