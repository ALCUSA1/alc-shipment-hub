import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Hapag-Lloyd Live Webhook Receiver
 * Accepts inbound Reefer telemetry + IoT position events from HLAG.
 * Verifies shared-secret in header, normalizes payload, persists to hlag_live_events,
 * and updates the parent subscription's last_event_at.
 *
 * Public endpoint — no JWT verification (HLAG calls without one).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function num(v: any): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const url = new URL(req.url);
    const subParam = url.searchParams.get("sub");
    const incomingSecret =
      req.headers.get("x-callback-secret") ||
      req.headers.get("x-shared-secret") ||
      payload.secret ||
      null;

    const equipmentRef = payload.equipmentReference || payload.equipment_reference || null;
    const bookingRef = payload.carrierBookingReference || payload.carrier_booking_reference || null;

    // Locate subscription by id, or by booking+equipment combo
    let sub: any = null;
    if (subParam) {
      const { data } = await supabase.from("hlag_live_subscriptions")
        .select("*").eq("id", subParam).maybeSingle();
      sub = data;
    }
    if (!sub && bookingRef) {
      const { data } = await supabase.from("hlag_live_subscriptions")
        .select("*")
        .eq("carrier_booking_reference", bookingRef)
        .eq("status", "active")
        .maybeSingle();
      sub = data;
    }

    if (sub && sub.callback_secret && incomingSecret && sub.callback_secret !== incomingSecret) {
      console.warn("hapag-live-webhook secret mismatch", { sub_id: sub.id });
      return new Response(JSON.stringify({ error: "Invalid secret" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const feedType = sub?.feed_type
      || (payload.eventType === "IOT" || payload.latitude != null ? "iot" : "reefer");

    await supabase.from("hlag_live_events").insert({
      subscription_id: sub?.id || null,
      shipment_id: sub?.shipment_id || null,
      feed_type: feedType,
      event_type: payload.eventType || payload.event_type || null,
      event_datetime: payload.eventDateTime || payload.timestamp || new Date().toISOString(),
      carrier_booking_reference: bookingRef,
      equipment_reference: equipmentRef,
      latitude: num(payload.latitude ?? payload.position?.latitude),
      longitude: num(payload.longitude ?? payload.position?.longitude),
      speed_knots: num(payload.speedKnots ?? payload.speed),
      heading_degrees: num(payload.headingDegrees ?? payload.heading),
      temperature_celsius: num(payload.temperature ?? payload.temperatureCelsius),
      humidity_percent: num(payload.humidity ?? payload.humidityPercent),
      o2_percent: num(payload.o2 ?? payload.oxygenPercent),
      co2_percent: num(payload.co2 ?? payload.carbonDioxidePercent),
      setpoint_celsius: num(payload.setpoint ?? payload.setpointCelsius),
      power_status: payload.powerStatus || null,
      raw_payload: payload,
    });

    if (sub?.id) {
      await supabase.from("hlag_live_subscriptions")
        .update({ last_event_at: new Date().toISOString(), status: "active" })
        .eq("id", sub.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("hapag-live-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
