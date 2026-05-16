-- Restrict external shipment viewers from reading internal-only messages.
DROP POLICY IF EXISTS "View shipment messages" ON public.shipment_messages;
CREATE POLICY "View external shipment messages"
ON public.shipment_messages
FOR SELECT
TO authenticated
USING (
  public.can_view_shipment(shipment_id)
  AND visibility_scope <> 'internal'
);

-- Require shipment edit authorization before creating driver assignments.
DROP POLICY IF EXISTS "Back office can create assignments" ON public.driver_assignments;
CREATE POLICY "Shipment editors can create assignments"
ON public.driver_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  assigned_by = auth.uid()
  AND public.can_edit_shipment(shipment_id)
);