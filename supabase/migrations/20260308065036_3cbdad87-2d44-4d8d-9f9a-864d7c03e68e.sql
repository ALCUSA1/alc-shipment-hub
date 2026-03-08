
-- Add admin SELECT policies to tables that are missing them

-- truck_pickups
CREATE POLICY "Admins can view all truck pickups"
ON public.truck_pickups FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- warehouse_operations
CREATE POLICY "Admins can view all warehouse operations"
ON public.warehouse_operations FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- companies
CREATE POLICY "Admins can view all companies"
ON public.companies FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- company_contacts
CREATE POLICY "Admins can view all company contacts"
ON public.company_contacts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- company_activities
CREATE POLICY "Admins can view all company activities"
ON public.company_activities FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- company_documents
CREATE POLICY "Admins can view all company documents"
ON public.company_documents FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- payments
CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- edi_messages (admin view)
CREATE POLICY "Admins can view all edi messages"
ON public.edi_messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- rate_alerts
CREATE POLICY "Admins can view all rate alerts"
ON public.rate_alerts FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- notification_preferences
CREATE POLICY "Admins can view all notification preferences"
ON public.notification_preferences FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- customs_filings
CREATE POLICY "Admins can view all customs filings"
ON public.customs_filings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- customs_milestones
CREATE POLICY "Admins can view all customs milestones"
ON public.customs_milestones FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
