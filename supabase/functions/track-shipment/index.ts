import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * track-shipment Edge Function
 *
 * Fetches live tracking data for a shipment from external APIs:
 * - Ocean: Container tracking via carrier APIs / AIS data
 * - Air: Flight tracking via aviation APIs
 *
 * Updates tracking_events and shipment status automatically.
 *
 * Accepts: { shipment_id } or { tracking_mode: "bulk" } for cron batch processing
 */

interface TrackingResult {
  milestone: string;
  location: string | null;
  event_date: string;
  notes: string | null;
  vessel_position?: { lat: number; lng: number } | null;
  eta_updated?: string | null;
}

// Simulated carrier tracking API responses
// In production, replace with real API calls to:
// - MarineTraffic, VesselFinder, or carrier APIs (Maersk, MSC, CMA CGM, etc.)
// - FlightAware, AviationStack for air shipments
async function fetchOceanTracking(
  bookingRef: string | null,
  containerNumbers: string[],
  carrier: string | null
): Promise<TrackingResult[]> {
  // Placeholder: In production, call carrier tracking APIs
  // Example for Maersk: GET https://api.maersk.com/track/{bookingRef}
  // Example for MSC: GET https://www.msc.com/api/tracking?query={containerNumber}
  console.log(`🚢 Tracking ocean shipment: booking=${bookingRef}, containers=${containerNumbers.join(",")}, carrier=${carrier}`);

  // Return empty — real implementation would return parsed tracking events
  return [];
}

async function fetchAirTracking(
  mawbNumber: string | null,
  airline: string | null,
  flightNumber: string | null
): Promise<TrackingResult[]> {
  // Placeholder: In production, call aviation tracking APIs
  // Example: GET https://aeroapi.flightaware.com/aeroapi/flights/{flightNumber}
  console.log(`✈️ Tracking air shipment: MAWB=${mawbNumber}, airline=${airline}, flight=${flightNumber}`);

  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { shipment_id, tracking_mode } = await req.json();

    // Bulk mode: process all active shipments
    if (tracking_mode === "bulk") {
      const { data: activeShipments, error } = await supabase
        .from("shipments")
        .select("id, mode, booking_ref, vessel, voyage, origin_port, destination_port, mawb_number, airline, flight_number, status, shipment_ref")
        .in("status", ["booked", "booking_confirmed", "cargo_received", "in_transit"])
        .limit(100);

      if (error) throw error;

      const results = [];
      for (const ship of activeShipments || []) {
        try {
          const events = await processShipment(supabase, ship);
          results.push({ shipment_id: ship.id, ref: ship.shipment_ref, new_events: events.length });
        } catch (e) {
          console.error(`Error tracking ${ship.shipment_ref}:`, e);
          results.push({ shipment_id: ship.id, ref: ship.shipment_ref, error: String(e) });
        }
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single shipment mode
    if (!shipment_id) {
      return new Response(JSON.stringify({ error: "shipment_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: shipment, error: shipErr } = await supabase
      .from("shipments")
      .select("*, containers(*)")
      .eq("id", shipment_id)
      .single();

    if (shipErr || !shipment) throw new Error("Shipment not found");

    const events = await processShipment(supabase, shipment);

    return new Response(
      JSON.stringify({ 
        shipment_id, 
        shipment_ref: shipment.shipment_ref,
        new_events: events.length,
        events,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Tracking error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processShipment(supabase: any, shipment: any): Promise<TrackingResult[]> {
  const isAir = shipment.mode === "air";

  // Get existing tracking events to avoid duplicates
  const { data: existingEvents } = await supabase
    .from("tracking_events")
    .select("milestone")
    .eq("shipment_id", shipment.id);

  const existingMilestones = new Set((existingEvents || []).map((e: any) => e.milestone));

  // Fetch from external tracking APIs
  let trackingResults: TrackingResult[];
  if (isAir) {
    trackingResults = await fetchAirTracking(
      shipment.mawb_number,
      shipment.airline,
      shipment.flight_number
    );
  } else {
    const containerNumbers = (shipment.containers || []).map((c: any) => c.container_number).filter(Boolean);
    trackingResults = await fetchOceanTracking(
      shipment.booking_ref,
      containerNumbers,
      shipment.vessel
    );
  }

  // Filter out already-recorded milestones
  const newEvents = trackingResults.filter((r) => !existingMilestones.has(r.milestone));

  // Insert new tracking events
  if (newEvents.length > 0) {
    const inserts = newEvents.map((e) => ({
      shipment_id: shipment.id,
      milestone: e.milestone,
      location: e.location,
      event_date: e.event_date,
      notes: e.notes,
    }));

    const { error: insertErr } = await supabase.from("tracking_events").insert(inserts);
    if (insertErr) {
      console.error("Failed to insert tracking events:", insertErr);
    }

    // Update ETA if tracking data provides an updated one
    const lastEvent = newEvents[newEvents.length - 1];
    if (lastEvent.eta_updated) {
      await supabase
        .from("shipments")
        .update({ eta: lastEvent.eta_updated })
        .eq("id", shipment.id);
    }

    // Auto-advance shipment status based on milestones
    const milestoneStatusMap: Record<string, string> = {
      "Booking Confirmed": "booking_confirmed",
      "Cargo Received": "cargo_received",
      "Cargo Received at Origin": "cargo_received",
      "Container Loaded": "cargo_received",
      "Vessel Departed": "in_transit",
      "Flight Departed": "in_transit",
      "In Transit": "in_transit",
      "Port Arrival": "arrived",
      "Arrived at Destination": "arrived",
      "Customs Clearance": "customs_clearance",
      "Delivered": "delivered",
    };

    const latestMilestone = newEvents[newEvents.length - 1]?.milestone;
    const newStatus = milestoneStatusMap[latestMilestone];
    if (newStatus) {
      await supabase
        .from("shipments")
        .update({ status: newStatus })
        .eq("id", shipment.id);
    }
  }

  return newEvents;
}
