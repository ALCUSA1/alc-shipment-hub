
-- Terminal schedules table for US port terminal vessel calls
CREATE TABLE public.terminal_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  terminal_code TEXT NOT NULL,
  terminal_name TEXT NOT NULL,
  port_unlocode TEXT NOT NULL,
  port_name TEXT NOT NULL,
  vessel_name TEXT,
  vessel_imo TEXT,
  voyage_number TEXT,
  service_code TEXT,
  carrier_code TEXT,
  berth TEXT,
  eta TIMESTAMPTZ,
  ata TIMESTAMPTZ,
  etd TIMESTAMPTZ,
  atd TIMESTAMPTZ,
  begin_receive_date TIMESTAMPTZ,
  cargo_cutoff_date TIMESTAMPTZ,
  hazmat_cutoff_date TIMESTAMPTZ,
  reefer_cutoff_date TIMESTAMPTZ,
  data_source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (data_source, external_id)
);

-- Enable RLS
ALTER TABLE public.terminal_schedules ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all terminal schedules
CREATE POLICY "Authenticated users can view terminal schedules"
ON public.terminal_schedules FOR SELECT TO authenticated USING (true);

-- Service role handles writes via edge functions (no user-facing write policy needed)

-- Index for common queries
CREATE INDEX idx_terminal_schedules_port ON public.terminal_schedules (port_unlocode);
CREATE INDEX idx_terminal_schedules_eta ON public.terminal_schedules (eta);
CREATE INDEX idx_terminal_schedules_vessel ON public.terminal_schedules (vessel_name);
CREATE INDEX idx_terminal_schedules_source ON public.terminal_schedules (data_source);

-- Timestamp trigger
CREATE TRIGGER set_terminal_schedules_updated_at
  BEFORE UPDATE ON public.terminal_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
