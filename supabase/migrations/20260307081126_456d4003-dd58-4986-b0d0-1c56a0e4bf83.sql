
-- Customs filings table for AES/EEI
CREATE TABLE public.customs_filings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  filing_type text NOT NULL DEFAULT 'AES',
  status text NOT NULL DEFAULT 'draft',
  itn text,
  aes_citation text,
  exporter_name text,
  exporter_ein text,
  consignee_name text,
  consignee_address text,
  country_of_destination text,
  port_of_export text,
  port_of_unlading text,
  mode_of_transport text DEFAULT 'vessel',
  carrier_name text,
  vessel_name text,
  voyage_number text,
  export_date date,
  hts_codes jsonb DEFAULT '[]'::jsonb,
  broker_name text,
  broker_email text,
  broker_ref text,
  notes text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Customs milestones for tracking filing progress
CREATE TABLE public.customs_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_id uuid NOT NULL REFERENCES public.customs_filings(id) ON DELETE CASCADE,
  milestone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  event_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customs_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_milestones ENABLE ROW LEVEL SECURITY;

-- RLS for customs_filings
CREATE POLICY "Users can manage own customs filings"
ON public.customs_filings FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM shipments WHERE shipments.id = customs_filings.shipment_id AND shipments.user_id = auth.uid()
));

-- RLS for customs_milestones (through filing -> shipment ownership)
CREATE POLICY "Users can manage milestones through filing"
ON public.customs_milestones FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM customs_filings cf
  JOIN shipments s ON s.id = cf.shipment_id
  WHERE cf.id = customs_milestones.filing_id AND s.user_id = auth.uid()
));

-- Updated_at trigger for customs_filings
CREATE TRIGGER update_customs_filings_updated_at
  BEFORE UPDATE ON public.customs_filings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for milestones
ALTER PUBLICATION supabase_realtime ADD TABLE public.customs_milestones;
