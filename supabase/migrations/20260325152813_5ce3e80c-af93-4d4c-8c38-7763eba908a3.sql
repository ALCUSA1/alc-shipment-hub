
-- Payment splits table: tracks per-carrier fund distribution for multi-carrier payments
CREATE TABLE public.payment_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  carrier_name TEXT NOT NULL,
  carrier_stripe_account_id TEXT,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_transfer_id TEXT,
  transfer_error TEXT,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_payment_splits_payment_id ON public.payment_splits(payment_id);
CREATE INDEX idx_payment_splits_status ON public.payment_splits(status);

-- Auto-update timestamp
CREATE TRIGGER set_payment_splits_updated_at
  BEFORE UPDATE ON public.payment_splits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

-- Admin-only access via service role (edge functions use service role key)
CREATE POLICY "Service role full access on payment_splits"
  ON public.payment_splits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can view their own splits via payment
CREATE POLICY "Users can view own payment splits"
  ON public.payment_splits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = payment_splits.payment_id
        AND p.user_id = auth.uid()
    )
  );
