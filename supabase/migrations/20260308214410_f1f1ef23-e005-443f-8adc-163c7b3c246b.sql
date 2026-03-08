ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

COMMENT ON COLUMN public.quotes.payment_status IS 'Payment status: unpaid, pending, paid';