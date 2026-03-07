
-- Admin can view ALL shipments
CREATE POLICY "Admins can view all shipments"
ON public.shipments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update ALL shipments
CREATE POLICY "Admins can update all shipments"
ON public.shipments FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all cargo
CREATE POLICY "Admins can view all cargo"
ON public.cargo FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all containers
CREATE POLICY "Admins can view all containers"
ON public.containers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all shipment_parties
CREATE POLICY "Admins can view all shipment parties"
ON public.shipment_parties FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all tracking_events
CREATE POLICY "Admins can view all tracking events"
ON public.tracking_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can insert tracking_events
CREATE POLICY "Admins can insert tracking events"
ON public.tracking_events FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can view all documents
CREATE POLICY "Admins can view all documents"
ON public.documents FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all shipment_financials
CREATE POLICY "Admins can view all shipment financials"
ON public.shipment_financials FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all demurrage_charges
CREATE POLICY "Admins can view all demurrage charges"
ON public.demurrage_charges FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all quotes
CREATE POLICY "Admins can view all quotes"
ON public.quotes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
