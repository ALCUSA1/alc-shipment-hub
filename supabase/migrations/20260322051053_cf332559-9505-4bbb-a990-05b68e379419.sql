
-- Compliance review requests table for admin approval workflow
CREATE TABLE public.compliance_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  exporter_name TEXT,
  exporter_ein TEXT,
  aes_type TEXT,
  export_license TEXT,
  insurance_provider TEXT,
  insurance_policy TEXT,
  insurance_coverage TEXT,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_reviews ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own compliance reviews
CREATE POLICY "Users can manage own compliance reviews"
  ON public.compliance_reviews
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all compliance reviews
CREATE POLICY "Admins can manage all compliance reviews"
  ON public.compliance_reviews
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
