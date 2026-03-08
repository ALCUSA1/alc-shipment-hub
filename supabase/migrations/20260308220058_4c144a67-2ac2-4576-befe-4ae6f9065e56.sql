-- Platform settings (singleton row for global config)
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_type text NOT NULL DEFAULT 'percent',
  platform_fee_value numeric NOT NULL DEFAULT 5,
  stripe_connect_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.platform_settings (platform_fee_type, platform_fee_value)
VALUES ('percent', 5);

-- Carrier payment profiles (Stripe Connect accounts per carrier)
CREATE TABLE public.carrier_payment_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_name text NOT NULL UNIQUE,
  stripe_account_id text,
  bank_name text,
  account_holder text,
  swift_code text,
  iban text,
  routing_number text,
  account_number text,
  payment_method text NOT NULL DEFAULT 'stripe_connect',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.carrier_payment_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage carrier payment profiles"
  ON public.carrier_payment_profiles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view carrier profiles"
  ON public.carrier_payment_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Add carrier_settlement_status to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carrier_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carrier_settlement_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS carrier_name text,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text;

-- Trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carrier_payment_profiles_updated_at
  BEFORE UPDATE ON public.carrier_payment_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();