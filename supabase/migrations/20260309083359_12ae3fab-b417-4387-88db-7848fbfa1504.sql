
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

CREATE TABLE public.driver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trucking_quote_id uuid NOT NULL REFERENCES public.trucking_quotes(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  driver_name text,
  driver_phone text,
  truck_plate text,
  pickup_address text,
  pickup_contact_name text,
  pickup_contact_phone text,
  delivery_address text,
  delivery_contact_name text,
  delivery_contact_phone text,
  instructions text,
  container_numbers text[],
  status text NOT NULL DEFAULT 'assigned',
  status_updated_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own assignments" ON public.driver_assignments
  FOR SELECT TO authenticated USING (driver_user_id = auth.uid());

CREATE POLICY "Drivers can update own assignments" ON public.driver_assignments
  FOR UPDATE TO authenticated USING (driver_user_id = auth.uid());

CREATE POLICY "Back office can manage assignments" ON public.driver_assignments
  FOR ALL TO authenticated USING (assigned_by = auth.uid());

CREATE POLICY "Admins can manage all assignments" ON public.driver_assignments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_driver_assignments_updated_at
  BEFORE UPDATE ON public.driver_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
