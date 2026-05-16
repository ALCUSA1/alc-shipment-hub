-- 1. Fix hlag_quotations service_role policy (use proper role target, not JWT claim)
DROP POLICY IF EXISTS "Service role full access to hlag quotations" ON public.hlag_quotations;
CREATE POLICY "Service role full access to hlag quotations"
ON public.hlag_quotations
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Restrict trucker_has_shipment_access to active/accepted quotes only
CREATE OR REPLACE FUNCTION public.trucker_has_shipment_access(_shipment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trucking_quotes tq
    WHERE tq.shipment_id = _shipment_id
      AND tq.trucker_user_id = auth.uid()
      AND tq.status IN ('accepted', 'assigned', 'in_progress', 'completed')
  )
  OR EXISTS (
    SELECT 1
    FROM public.driver_assignments da
    JOIN public.trucking_quotes tq2 ON tq2.id = da.trucking_quote_id
    WHERE tq2.shipment_id = _shipment_id
      AND tq2.trucker_user_id = auth.uid()
  );
$$;

-- 3. Allow authenticated users to read active promotional materials
CREATE POLICY "Authenticated users can view active promotional materials"
ON public.promotional_materials
FOR SELECT
TO authenticated
USING (is_active = true);