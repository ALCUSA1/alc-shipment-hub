-- HLAG Live Subscriptions: tracks each active webhook subscription
CREATE TABLE public.hlag_live_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  carrier_booking_reference TEXT,
  equipment_reference TEXT,
  feed_type TEXT NOT NULL CHECK (feed_type IN ('reefer', 'iot')),
  hlag_subscription_id TEXT,
  callback_url TEXT NOT NULL,
  callback_secret TEXT NOT NULL,
  package_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'failed', 'cancelled')),
  trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('auto', 'manual')),
  last_event_at TIMESTAMPTZ,
  last_error TEXT,
  simulated BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hlag_live_subs_shipment ON public.hlag_live_subscriptions(shipment_id);
CREATE INDEX idx_hlag_live_subs_status ON public.hlag_live_subscriptions(status);
CREATE INDEX idx_hlag_live_subs_equip ON public.hlag_live_subscriptions(equipment_reference);

ALTER TABLE public.hlag_live_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view live subs"
  ON public.hlag_live_subscriptions FOR SELECT
  USING (shipment_id IS NULL OR public.can_view_shipment(shipment_id));

CREATE POLICY "Ops can create live subs"
  ON public.hlag_live_subscriptions FOR INSERT
  WITH CHECK (
    shipment_id IS NULL OR public.can_edit_shipment(shipment_id)
  );

CREATE POLICY "Ops can update live subs"
  ON public.hlag_live_subscriptions FOR UPDATE
  USING (shipment_id IS NULL OR public.can_edit_shipment(shipment_id));

CREATE POLICY "Ops can delete live subs"
  ON public.hlag_live_subscriptions FOR DELETE
  USING (shipment_id IS NULL OR public.can_edit_shipment(shipment_id));

CREATE TRIGGER set_hlag_live_subs_updated_at
  BEFORE UPDATE ON public.hlag_live_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- HLAG Live Events: every incoming telemetry/position payload
CREATE TABLE public.hlag_live_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.hlag_live_subscriptions(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  feed_type TEXT NOT NULL CHECK (feed_type IN ('reefer', 'iot')),
  event_type TEXT,
  event_datetime TIMESTAMPTZ NOT NULL DEFAULT now(),
  carrier_booking_reference TEXT,
  equipment_reference TEXT,
  -- IoT / position
  latitude NUMERIC,
  longitude NUMERIC,
  speed_knots NUMERIC,
  heading_degrees NUMERIC,
  -- Reefer telemetry
  temperature_celsius NUMERIC,
  humidity_percent NUMERIC,
  o2_percent NUMERIC,
  co2_percent NUMERIC,
  setpoint_celsius NUMERIC,
  power_status TEXT,
  -- Raw payload for forensics
  raw_payload JSONB,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hlag_live_events_sub ON public.hlag_live_events(subscription_id);
CREATE INDEX idx_hlag_live_events_shipment ON public.hlag_live_events(shipment_id);
CREATE INDEX idx_hlag_live_events_datetime ON public.hlag_live_events(event_datetime DESC);

ALTER TABLE public.hlag_live_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members view live events"
  ON public.hlag_live_events FOR SELECT
  USING (shipment_id IS NULL OR public.can_view_shipment(shipment_id));

CREATE POLICY "System can insert live events"
  ON public.hlag_live_events FOR INSERT
  WITH CHECK (true);

-- Enable realtime for live events so UI updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.hlag_live_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hlag_live_subscriptions;