ALTER TABLE public.tracking_events ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE public.tracking_events ADD COLUMN IF NOT EXISTS raw_event_code text;

COMMENT ON COLUMN public.tracking_events.source IS 'API source: maersk, msc, cmacgm, hapag_lloyd, e2open, manual';
COMMENT ON COLUMN public.tracking_events.raw_event_code IS 'Original DCSA/carrier event code before mapping';