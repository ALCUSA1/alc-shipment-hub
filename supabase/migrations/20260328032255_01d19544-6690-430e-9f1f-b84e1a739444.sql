CREATE OR REPLACE FUNCTION public.can_view_shipment(_shipment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.shipments s
    WHERE s.id = _shipment_id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.company_members cm ON cm.company_id = s.company_id
    WHERE s.id = _shipment_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.customer_user_links cul ON cul.customer_id = s.customer_id AND cul.company_id = s.company_id
    WHERE s.id = _shipment_id
      AND cul.user_id = auth.uid()
      AND s.customer_id IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.shipment_parties sp
    JOIN public.partner_user_links pul ON pul.partner_id = sp.partner_id
    WHERE sp.shipment_id = _shipment_id
      AND pul.user_id = auth.uid()
      AND sp.partner_id IS NOT NULL
  )
  OR public.has_role(auth.uid(), 'admin')
$function$;