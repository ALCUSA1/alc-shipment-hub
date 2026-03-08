
-- Vessel bookings table
CREATE TABLE public.vessel_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  booking_number TEXT,
  carrier TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  container_type TEXT,
  container_count INTEGER DEFAULT 1,
  notes TEXT,
  edi_submitted BOOLEAN NOT NULL DEFAULT false,
  edi_message_id UUID REFERENCES public.edi_messages(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking legs (multi-leg: feeder + mother vessel)
CREATE TABLE public.booking_legs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.vessel_bookings(id) ON DELETE CASCADE,
  leg_order INTEGER NOT NULL DEFAULT 1,
  leg_type TEXT NOT NULL DEFAULT 'main',
  vessel_name TEXT,
  voyage_number TEXT,
  origin_port TEXT,
  destination_port TEXT,
  etd DATE,
  eta DATE,
  transshipment_port TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vessel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_legs ENABLE ROW LEVEL SECURITY;

-- Vessel bookings policies
CREATE POLICY "Admins can manage all vessel bookings"
  ON public.vessel_bookings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage bookings through shipment"
  ON public.vessel_bookings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = vessel_bookings.shipment_id AND shipments.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM shipments WHERE shipments.id = vessel_bookings.shipment_id AND shipments.user_id = auth.uid()));

-- Booking legs policies
CREATE POLICY "Admins can manage all booking legs"
  ON public.booking_legs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can manage legs through booking"
  ON public.booking_legs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vessel_bookings vb
    JOIN shipments s ON s.id = vb.shipment_id
    WHERE vb.id = booking_legs.booking_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM vessel_bookings vb
    JOIN shipments s ON s.id = vb.shipment_id
    WHERE vb.id = booking_legs.booking_id AND s.user_id = auth.uid()
  ));
