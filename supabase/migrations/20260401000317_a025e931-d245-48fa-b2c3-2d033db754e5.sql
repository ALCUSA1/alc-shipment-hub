
-- commercial_schedule_queries
CREATE TABLE IF NOT EXISTS public.commercial_schedule_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  query_type text NOT NULL DEFAULT 'point_to_point',
  place_of_receipt_location_id uuid REFERENCES public.alc_locations(id),
  place_of_delivery_location_id uuid REFERENCES public.alc_locations(id),
  place_of_departure_location_id uuid REFERENCES public.alc_locations(id),
  place_of_arrival_location_id uuid REFERENCES public.alc_locations(id),
  port_of_loading_location_id uuid REFERENCES public.alc_locations(id),
  port_of_discharge_location_id uuid REFERENCES public.alc_locations(id),
  vessel_id uuid REFERENCES public.alc_vessels(id),
  voyage_number text,
  departure_date_from timestamptz,
  departure_date_to timestamptz,
  arrival_date_from timestamptz,
  arrival_date_to timestamptz,
  service_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- commercial_schedules
CREATE TABLE IF NOT EXISTS public.commercial_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  query_id uuid REFERENCES public.commercial_schedule_queries(id),
  schedule_reference text,
  schedule_type text NOT NULL DEFAULT 'point_to_point',
  service_code text,
  service_name text,
  transit_time_days integer,
  total_leg_count integer,
  is_direct_service boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- schedule_legs
CREATE TABLE IF NOT EXISTS public.schedule_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_schedule_id uuid NOT NULL REFERENCES public.commercial_schedules(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  sequence_number integer NOT NULL DEFAULT 1,
  transport_mode text DEFAULT 'vessel',
  vessel_id uuid REFERENCES public.alc_vessels(id),
  vessel_name text,
  voyage_number text,
  load_location_id uuid REFERENCES public.alc_locations(id),
  discharge_location_id uuid REFERENCES public.alc_locations(id),
  planned_departure timestamptz,
  planned_arrival timestamptz,
  leg_transit_time_days integer,
  service_code text,
  service_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- port_schedules
CREATE TABLE IF NOT EXISTS public.port_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_schedule_id uuid NOT NULL REFERENCES public.commercial_schedules(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  location_id uuid REFERENCES public.alc_locations(id),
  facility_code text,
  call_sequence integer,
  arrival_datetime timestamptz,
  departure_datetime timestamptz,
  cutoff_datetime timestamptz,
  service_code text,
  service_name text,
  vessel_id uuid REFERENCES public.alc_vessels(id),
  vessel_name text,
  voyage_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- vessel_schedules
CREATE TABLE IF NOT EXISTS public.vessel_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_schedule_id uuid NOT NULL REFERENCES public.commercial_schedules(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  vessel_id uuid REFERENCES public.alc_vessels(id),
  vessel_name text,
  voyage_number text,
  service_code text,
  service_name text,
  first_port_location_id uuid REFERENCES public.alc_locations(id),
  last_port_location_id uuid REFERENCES public.alc_locations(id),
  first_departure_datetime timestamptz,
  final_arrival_datetime timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- schedule_places
CREATE TABLE IF NOT EXISTS public.schedule_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_schedule_id uuid NOT NULL REFERENCES public.commercial_schedules(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  place_role text NOT NULL,
  location_id uuid REFERENCES public.alc_locations(id),
  sequence_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- schedule_cutoffs
CREATE TABLE IF NOT EXISTS public.schedule_cutoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_schedule_id uuid NOT NULL REFERENCES public.commercial_schedules(id) ON DELETE CASCADE,
  schedule_leg_id uuid REFERENCES public.schedule_legs(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  cutoff_type text NOT NULL,
  cutoff_datetime timestamptz NOT NULL,
  location_id uuid REFERENCES public.alc_locations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- schedule_references
CREATE TABLE IF NOT EXISTS public.schedule_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_schedule_id uuid NOT NULL REFERENCES public.commercial_schedules(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.alc_carriers(id),
  source_message_id uuid REFERENCES public.carrier_raw_messages(id),
  reference_type text NOT NULL,
  reference_value text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_csq_carrier ON public.commercial_schedule_queries(carrier_id);
CREATE INDEX IF NOT EXISTS idx_csq_query_type ON public.commercial_schedule_queries(query_type);
CREATE INDEX IF NOT EXISTS idx_cs_carrier ON public.commercial_schedules(carrier_id);
CREATE INDEX IF NOT EXISTS idx_cs_service_code ON public.commercial_schedules(service_code);
CREATE INDEX IF NOT EXISTS idx_cs_schedule_type ON public.commercial_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_sl_carrier ON public.schedule_legs(carrier_id);
CREATE INDEX IF NOT EXISTS idx_sl_vessel_name ON public.schedule_legs(vessel_name);
CREATE INDEX IF NOT EXISTS idx_sl_voyage ON public.schedule_legs(voyage_number);
CREATE INDEX IF NOT EXISTS idx_sl_departure ON public.schedule_legs(planned_departure);
CREATE INDEX IF NOT EXISTS idx_sl_arrival ON public.schedule_legs(planned_arrival);
CREATE INDEX IF NOT EXISTS idx_sl_load_loc ON public.schedule_legs(load_location_id);
CREATE INDEX IF NOT EXISTS idx_sl_discharge_loc ON public.schedule_legs(discharge_location_id);
CREATE INDEX IF NOT EXISTS idx_ps_carrier ON public.port_schedules(carrier_id);
CREATE INDEX IF NOT EXISTS idx_ps_location ON public.port_schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_ps_arrival ON public.port_schedules(arrival_datetime);
CREATE INDEX IF NOT EXISTS idx_ps_departure ON public.port_schedules(departure_datetime);
CREATE INDEX IF NOT EXISTS idx_vs_carrier ON public.vessel_schedules(carrier_id);
CREATE INDEX IF NOT EXISTS idx_vs_vessel ON public.vessel_schedules(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vs_voyage ON public.vessel_schedules(voyage_number);
CREATE INDEX IF NOT EXISTS idx_sp_place_role ON public.schedule_places(place_role);
CREATE INDEX IF NOT EXISTS idx_sp_location ON public.schedule_places(location_id);
CREATE INDEX IF NOT EXISTS idx_sc_type ON public.schedule_cutoffs(cutoff_type);
CREATE INDEX IF NOT EXISTS idx_sr_type ON public.schedule_references(reference_type);
CREATE INDEX IF NOT EXISTS idx_sr_value ON public.schedule_references(reference_value);

-- updated_at triggers
CREATE TRIGGER set_updated_at_csq BEFORE UPDATE ON public.commercial_schedule_queries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_cs BEFORE UPDATE ON public.commercial_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_sl BEFORE UPDATE ON public.schedule_legs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_ps BEFORE UPDATE ON public.port_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_vs BEFORE UPDATE ON public.vessel_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_sp BEFORE UPDATE ON public.schedule_places FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_sco BEFORE UPDATE ON public.schedule_cutoffs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_sr BEFORE UPDATE ON public.schedule_references FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
