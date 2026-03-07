
-- EDI messages table for logging all inbound/outbound EDI communications
CREATE TABLE public.edi_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  carrier TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  message_type TEXT NOT NULL,
  message_ref TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.edi_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own EDI messages"
  ON public.edi_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own EDI messages"
  ON public.edi_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own EDI messages"
  ON public.edi_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role policy for webhook inbound updates
CREATE POLICY "Service role can manage all EDI messages"
  ON public.edi_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_edi_messages_updated_at
  BEFORE UPDATE ON public.edi_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for EDI messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.edi_messages;
