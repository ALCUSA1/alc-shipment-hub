
-- Structured pickup/delivery address fields on shipments
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS pickup_contact_name text,
  ADD COLUMN IF NOT EXISTS pickup_contact_phone text,
  ADD COLUMN IF NOT EXISTS pickup_instructions text,
  ADD COLUMN IF NOT EXISTS pickup_city text,
  ADD COLUMN IF NOT EXISTS pickup_state text,
  ADD COLUMN IF NOT EXISTS pickup_postal_code text,
  ADD COLUMN IF NOT EXISTS pickup_country text,
  ADD COLUMN IF NOT EXISTS pickup_lat numeric,
  ADD COLUMN IF NOT EXISTS pickup_lng numeric,
  ADD COLUMN IF NOT EXISTS pickup_validated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_contact_name text,
  ADD COLUMN IF NOT EXISTS delivery_contact_phone text,
  ADD COLUMN IF NOT EXISTS delivery_instructions text,
  ADD COLUMN IF NOT EXISTS delivery_city text,
  ADD COLUMN IF NOT EXISTS delivery_state text,
  ADD COLUMN IF NOT EXISTS delivery_postal_code text,
  ADD COLUMN IF NOT EXISTS delivery_country text,
  ADD COLUMN IF NOT EXISTS delivery_lat numeric,
  ADD COLUMN IF NOT EXISTS delivery_lng numeric,
  ADD COLUMN IF NOT EXISTS delivery_validated boolean DEFAULT false;

-- Shipment amendments table for post-sailing corrections
CREATE TABLE public.shipment_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amendment_type text NOT NULL DEFAULT 'bl_correction',
  description text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  carrier_fee_required boolean DEFAULT false,
  carrier_fee_amount numeric DEFAULT 0,
  carrier_fee_currency text DEFAULT 'USD',
  payment_required_before_change boolean DEFAULT false,
  payment_status text DEFAULT 'unpaid',
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage amendments through shipment"
  ON public.shipment_amendments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = shipment_amendments.shipment_id AND shipments.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = shipment_amendments.shipment_id AND shipments.user_id = auth.uid()));

CREATE POLICY "Admins can view all amendments"
  ON public.shipment_amendments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trucking-specific fields to companies for trucking CRM
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS service_area text,
  ADD COLUMN IF NOT EXISTS port_coverage text[],
  ADD COLUMN IF NOT EXISTS chassis_capable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hazmat_capable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reefer_capable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_rating numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_partner boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispatcher_name text,
  ADD COLUMN IF NOT EXISTS dispatcher_phone text;
