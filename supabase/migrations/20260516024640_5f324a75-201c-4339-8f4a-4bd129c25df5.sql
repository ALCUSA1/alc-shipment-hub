
-- Helper: does the current trucker have an active relationship to a shipment?
CREATE OR REPLACE FUNCTION public.trucker_has_shipment_access(_shipment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trucking_quotes tq
    WHERE tq.shipment_id = _shipment_id
      AND tq.trucker_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.driver_assignments da
    JOIN public.trucking_quotes tq2 ON tq2.id = da.trucking_quote_id
    WHERE tq2.shipment_id = _shipment_id
      AND tq2.trucker_user_id = auth.uid()
  );
$$;

-- Tighten trucker SELECT on cargo
DROP POLICY IF EXISTS "Truckers can view cargo for bidding" ON public.cargo;
CREATE POLICY "Truckers can view cargo for their shipments"
ON public.cargo FOR SELECT
USING (
  has_role(auth.uid(), 'trucker'::app_role)
  AND public.trucker_has_shipment_access(shipment_id)
);

-- Tighten trucker SELECT on containers
DROP POLICY IF EXISTS "Truckers can view containers for bidding" ON public.containers;
CREATE POLICY "Truckers can view containers for their shipments"
ON public.containers FOR SELECT
USING (
  has_role(auth.uid(), 'trucker'::app_role)
  AND public.trucker_has_shipment_access(shipment_id)
);

-- Tighten trucker SELECT on container_commodities
DROP POLICY IF EXISTS "Truckers can view container commodities" ON public.container_commodities;
CREATE POLICY "Truckers can view container commodities for their shipments"
ON public.container_commodities FOR SELECT
USING (
  has_role(auth.uid(), 'trucker'::app_role)
  AND public.trucker_has_shipment_access(shipment_id)
);
