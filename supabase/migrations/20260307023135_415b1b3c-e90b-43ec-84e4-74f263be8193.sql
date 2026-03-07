
-- Truck pickups table
CREATE TABLE public.truck_pickups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  pickup_location TEXT,
  pickup_date DATE,
  pickup_time TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  truck_plate TEXT,
  container_type TEXT,
  cargo_description TEXT,
  delivery_location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.truck_pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage pickups through shipment"
ON public.truck_pickups FOR ALL
USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = truck_pickups.shipment_id AND shipments.user_id = auth.uid()));

CREATE TRIGGER set_truck_pickups_updated_at BEFORE UPDATE ON public.truck_pickups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Warehouse operations table
CREATE TABLE public.warehouse_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  warehouse_name TEXT,
  warehouse_location TEXT,
  operation_type TEXT NOT NULL DEFAULT 'receiving',
  cargo_description TEXT,
  num_packages INTEGER,
  weight NUMERIC,
  volume NUMERIC,
  storage_instructions TEXT,
  release_authorization TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouse_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage warehouse ops through shipment"
ON public.warehouse_operations FOR ALL
USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = warehouse_operations.shipment_id AND shipments.user_id = auth.uid()));

CREATE TRIGGER set_warehouse_operations_updated_at BEFORE UPDATE ON public.warehouse_operations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
