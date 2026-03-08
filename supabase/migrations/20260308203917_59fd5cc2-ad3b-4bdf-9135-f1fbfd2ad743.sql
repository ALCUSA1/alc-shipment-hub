
-- Fix truck_pickups RLS: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can view all truck pickups" ON public.truck_pickups;
DROP POLICY IF EXISTS "Users can manage pickups through shipment" ON public.truck_pickups;

CREATE POLICY "Admins can view all truck pickups"
  ON public.truck_pickups FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage pickups through shipment"
  ON public.truck_pickups FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM shipments
    WHERE shipments.id = truck_pickups.shipment_id
      AND shipments.user_id = auth.uid()
  ));

-- Fix warehouse_operations RLS: drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admins can view all warehouse operations" ON public.warehouse_operations;
DROP POLICY IF EXISTS "Users can manage warehouse ops through shipment" ON public.warehouse_operations;

-- Also try the actual policy names from the DB
DROP POLICY IF EXISTS "Admins can view all warehouse ops" ON public.warehouse_operations;
DROP POLICY IF EXISTS "Users can manage warehouse operations through shipment" ON public.warehouse_operations;

CREATE POLICY "Admins can view all warehouse operations"
  ON public.warehouse_operations FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage warehouse ops through shipment"
  ON public.warehouse_operations FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM shipments
    WHERE shipments.id = warehouse_operations.shipment_id
      AND shipments.user_id = auth.uid()
  ));
