
-- =============================================
-- UPDATE SHIPMENTS TABLE - add milestone dates and new fields
-- =============================================
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS booking_confirmed_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS customs_clearance_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cargo_received_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cargo_loaded_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS vessel_departed_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS vessel_arrived_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS available_for_pickup_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS delivered_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS erd timestamp with time zone,
  ADD COLUMN IF NOT EXISTS containerized boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS space_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rate_basis_type text DEFAULT 'spot',
  ADD COLUMN IF NOT EXISTS rate_per_container numeric,
  ADD COLUMN IF NOT EXISTS total_freight numeric,
  ADD COLUMN IF NOT EXISTS container_count integer;

-- =============================================
-- UPDATE CONTAINERS TABLE
-- =============================================
ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS tare_weight numeric,
  ADD COLUMN IF NOT EXISTS max_payload numeric,
  ADD COLUMN IF NOT EXISTS return_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pickup_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- =============================================
-- UPDATE DEMURRAGE CHARGES TABLE
-- =============================================
ALTER TABLE public.demurrage_charges
  ADD COLUMN IF NOT EXISTS street_turn_eligible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS carrier_specific_rules text,
  ADD COLUMN IF NOT EXISTS contract_specific_rules text,
  ADD COLUMN IF NOT EXISTS contract_free_days integer;

-- =============================================
-- UPDATE CARRIER RATES TABLE
-- =============================================
ALTER TABLE public.carrier_rates
  ADD COLUMN IF NOT EXISTS rate_basis_type text DEFAULT 'spot',
  ADD COLUMN IF NOT EXISTS contract_number text;

-- =============================================
-- UPDATE COMPANIES TABLE (CRM changes)
-- =============================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_contact_name text;

-- =============================================
-- ADD REALTIME for new tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_cutoffs;
