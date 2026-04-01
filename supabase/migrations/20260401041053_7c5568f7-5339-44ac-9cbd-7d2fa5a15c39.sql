
-- Add new query parameters to commercial_schedule_queries
ALTER TABLE public.commercial_schedule_queries
  ADD COLUMN IF NOT EXISTS un_location_code text,
  ADD COLUMN IF NOT EXISTS vessel_imo_number text,
  ADD COLUMN IF NOT EXISTS carrier_voyage_number text,
  ADD COLUMN IF NOT EXISTS max_transhipment integer,
  ADD COLUMN IF NOT EXISTS receipt_type_at_origin text,
  ADD COLUMN IF NOT EXISTS delivery_type_at_destination text,
  ADD COLUMN IF NOT EXISTS next_page_cursor text;

-- Add schedule_source_type to commercial_schedules
ALTER TABLE public.commercial_schedules
  ADD COLUMN IF NOT EXISTS schedule_source_type text DEFAULT 'route_solution';

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_csq_un_location_code ON public.commercial_schedule_queries(un_location_code);
CREATE INDEX IF NOT EXISTS idx_csq_vessel_imo ON public.commercial_schedule_queries(vessel_imo_number);
CREATE INDEX IF NOT EXISTS idx_cs_schedule_source_type ON public.commercial_schedules(schedule_source_type);
