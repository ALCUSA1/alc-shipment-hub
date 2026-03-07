
-- Create shipment_financials table for P&L tracking
CREATE TABLE public.shipment_financials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'cost',  -- 'revenue', 'cost', 'expense'
  category TEXT NOT NULL DEFAULT 'other',   -- 'ocean_freight', 'trucking', 'customs', 'warehousing', 'handling', 'documentation', 'insurance', 'other'
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  vendor TEXT,                              -- for costs: who the payment goes to
  invoice_ref TEXT,                         -- vendor invoice or internal reference
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipment_financials ENABLE ROW LEVEL SECURITY;

-- RLS policy: users manage financials through their shipments
CREATE POLICY "Users can manage financials through shipment"
  ON public.shipment_financials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments
      WHERE shipments.id = shipment_financials.shipment_id
        AND shipments.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments
      WHERE shipments.id = shipment_financials.shipment_id
        AND shipments.user_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_shipment_financials_updated_at
  BEFORE UPDATE ON public.shipment_financials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
