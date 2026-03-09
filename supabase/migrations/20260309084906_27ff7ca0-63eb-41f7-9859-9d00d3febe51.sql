
-- Add warehouse role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'warehouse';

-- Warehouses table (facility registry)
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  warehouse_name text NOT NULL,
  address text,
  city text,
  state text,
  country text DEFAULT 'US',
  contact_name text,
  contact_phone text,
  contact_email text,
  operating_hours text,
  capabilities text[] DEFAULT '{}',
  total_capacity_sqft numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Warehouse owners can manage own facilities" ON public.warehouses
  FOR ALL TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Admins can manage all warehouses" ON public.warehouses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active warehouses" ON public.warehouses
  FOR SELECT TO authenticated USING (status = 'active');

-- Warehouse orders table
CREATE TABLE public.warehouse_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  order_type text NOT NULL DEFAULT 'receiving',
  status text NOT NULL DEFAULT 'pending',
  requester_user_id uuid,
  warehouse_user_id uuid,
  cargo_description text,
  num_packages integer,
  weight numeric,
  volume numeric,
  container_numbers text[],
  storage_zone text,
  bay_number text,
  handling_instructions text,
  storage_instructions text,
  release_authorization text,
  release_to_name text,
  release_to_phone text,
  expected_date date,
  actual_date date,
  storage_start_date date,
  storage_end_date date,
  handling_fee numeric DEFAULT 0,
  storage_rate_per_day numeric DEFAULT 0,
  total_storage_charges numeric DEFAULT 0,
  billing_status text DEFAULT 'unbilled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouse_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Warehouse operators can manage their orders" ON public.warehouse_orders
  FOR ALL TO authenticated USING (warehouse_user_id = auth.uid()) WITH CHECK (warehouse_user_id = auth.uid());

CREATE POLICY "Requesters can view their orders" ON public.warehouse_orders
  FOR SELECT TO authenticated USING (requester_user_id = auth.uid());

CREATE POLICY "Requesters can create orders" ON public.warehouse_orders
  FOR INSERT TO authenticated WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "Admins can manage all warehouse orders" ON public.warehouse_orders
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Warehouse owners can manage orders for their facilities" ON public.warehouse_orders
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.warehouses w WHERE w.id = warehouse_orders.warehouse_id AND w.owner_user_id = auth.uid())
  );

-- Updated_at triggers
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouse_orders_updated_at BEFORE UPDATE ON public.warehouse_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
