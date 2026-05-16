
-- shipment_cutoffs: replace owner-only SELECT with can_view_shipment
DROP POLICY IF EXISTS "Users can view cutoffs through shipment" ON public.shipment_cutoffs;
CREATE POLICY "Users can view cutoffs through shipment"
ON public.shipment_cutoffs
FOR SELECT TO authenticated
USING (public.can_view_shipment(shipment_id));

-- driver_assignments: add company-member SELECT; narrow back-office ALL to INSERT;
-- give shipment editors full management rights.
DROP POLICY IF EXISTS "Back office can manage assignments" ON public.driver_assignments;

CREATE POLICY "Back office can create assignments"
ON public.driver_assignments
FOR INSERT TO authenticated
WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "Shipment editors can view assignments"
ON public.driver_assignments
FOR SELECT TO authenticated
USING (public.can_view_shipment(shipment_id));

CREATE POLICY "Shipment editors can update assignments"
ON public.driver_assignments
FOR UPDATE TO authenticated
USING (public.can_edit_shipment(shipment_id))
WITH CHECK (public.can_edit_shipment(shipment_id));

CREATE POLICY "Shipment editors can delete assignments"
ON public.driver_assignments
FOR DELETE TO authenticated
USING (public.can_edit_shipment(shipment_id));

-- booking_notifications: explicit service_role management policy
CREATE POLICY "Service role manages booking notifications"
ON public.booking_notifications
FOR ALL TO service_role
USING (true) WITH CHECK (true);
