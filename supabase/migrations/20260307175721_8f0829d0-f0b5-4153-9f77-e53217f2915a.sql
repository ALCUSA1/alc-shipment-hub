
-- Demurrage, Detention, and other post-shipment charges
CREATE TABLE public.demurrage_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  charge_type TEXT NOT NULL DEFAULT 'demurrage',
  container_number TEXT,
  carrier TEXT,
  free_days INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  daily_rate NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'accruing',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.demurrage_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage demurrage through shipment"
ON public.demurrage_charges
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM shipments
  WHERE shipments.id = demurrage_charges.shipment_id
  AND shipments.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM shipments
  WHERE shipments.id = demurrage_charges.shipment_id
  AND shipments.user_id = auth.uid()
));

-- Updated_at trigger
CREATE TRIGGER update_demurrage_charges_updated_at
  BEFORE UPDATE ON public.demurrage_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
