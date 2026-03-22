import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * track-shipment Edge Function
 *
 * Fetches live tracking data from direct carrier APIs:
 * - Maersk (api.maersk.com)
 * - CMA CGM (api-portal.cma-cgm.com)
 * - MSC (digital.msc.com)
 * - Hapag-Lloyd (api.hlag.com)
 *
 * Falls back to e2open if configured, then manual entry.
 * Updates tracking_events and shipment status automatically.
 */

interface TrackingResult {
  milestone: string;
  location: string | null;
  event_date: string;
  notes: string | null;
  vessel_position?: { lat: number; lng: number } | null;
  eta_updated?: string | null;
  source: string;
  raw_event_code?: string | null;
}

// ─── DCSA Event Code → Milestone Mapping ────────────────────────────────────
const DCSA_EVENT_MAP: Record<string, string> = {
  BKCF: "Booking Confirmed",
  RECE: "Cargo Received at Origin",
  LOAD: "Container Loaded",
  DEPA: "Vessel Departed",
  ARRI: "Port Arrival",
  DISC: "Container Discharged",
  GATE: "Gate Out",
  DLIV: "Delivered",
  TRAN: "In Transit",
  CUST: "Customs Clearance",
};

function mapDcsaEvent(code: string): string {
  return DCSA_EVENT_MAP[code?.toUpperCase()] || code;
}

// ─── Carrier API Adapters ────────────────────────────────────────────────────

async function fetchMaerskTracking(
  bookingRef: string | null,
  containerNumbers: string[]
): Promise<TrackingResult[]> {
  const apiKey = Deno.env.get("MAERSK_API_KEY");
  if (!apiKey) {
    console.log("⚠️ MAERSK_API_KEY not configured, skipping Maersk tracking");
    return [];
  }

  const ref = containerNumbers[0] || bookingRef;
  if (!ref) return [];

  try {
    const response = await fetch(
      `https://api.maersk.com/track-and-trace?containerNumber=${encodeURIComponent(ref)}`,
      {
        headers: {
          "Consumer-Key": apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`Maersk API error [${response.status}]: ${await response.text()}`);
      return [];
    }

    const data = await response.json();
    const events: TrackingResult[] = [];

    // Maersk returns an array of containers, each with transport events
    const containers = Array.isArray(data) ? data : data?.containers || [data];
    for (const container of containers) {
      const transportEvents = container?.events || container?.transportEvents || [];
      for (const event of transportEvents) {
        const eventCode = event.eventType || event.transportEventTypeCode || "";
        events.push({
          milestone: mapDcsaEvent(eventCode),
          location: event.location?.facilityName || event.location?.city || event.locationName || null,
          event_date: event.eventDateTime || event.eventCreatedDateTime || new Date().toISOString(),
          notes: event.description || null,
          source: "maersk",
          raw_event_code: eventCode,
          vessel_position: event.vessel?.position
            ? { lat: event.vessel.position.latitude, lng: event.vessel.position.longitude }
            : null,
          eta_updated: container?.schedule?.estimatedArrival || null,
        });
      }
    }

    console.log(`🚢 Maersk: ${events.length} events for ${ref}`);
    return events;
  } catch (err) {
    console.error("Maersk tracking error:", err);
    return [];
  }
}

async function fetchCmaCgmTracking(
  bookingRef: string | null,
  containerNumbers: string[]
): Promise<TrackingResult[]> {
  const apiKey = Deno.env.get("CMA_CGM_API_KEY");
  if (!apiKey) {
    console.log("⚠️ CMA_CGM_API_KEY not configured, skipping CMA CGM tracking");
    return [];
  }

  const ref = containerNumbers[0] || bookingRef;
  if (!ref) return [];

  try {
    const response = await fetch(
      `https://apis.cma-cgm.net/tracking/v1/events?equipmentReference=${encodeURIComponent(ref)}`,
      {
        headers: {
          KeyId: apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`CMA CGM API error [${response.status}]: ${await response.text()}`);
      return [];
    }

    const data = await response.json();
    const rawEvents = Array.isArray(data) ? data : data?.events || [];
    const events: TrackingResult[] = rawEvents.map((event: any) => {
      const code = event.eventType || event.transportEventTypeCode || "";
      return {
        milestone: mapDcsaEvent(code),
        location: event.eventLocation?.locationName || event.eventLocation?.city || null,
        event_date: event.eventDateTime || event.eventCreatedDateTime || new Date().toISOString(),
        notes: event.eventClassifierCode || null,
        source: "cmacgm",
        raw_event_code: code,
        eta_updated: null,
      };
    });

    console.log(`🚢 CMA CGM: ${events.length} events for ${ref}`);
    return events;
  } catch (err) {
    console.error("CMA CGM tracking error:", err);
    return [];
  }
}

async function fetchMscTracking(
  bookingRef: string | null,
  containerNumbers: string[]
): Promise<TrackingResult[]> {
  const apiKey = Deno.env.get("MSC_API_KEY");
  if (!apiKey) {
    console.log("⚠️ MSC_API_KEY not configured, skipping MSC tracking");
    return [];
  }

  const ref = containerNumbers[0] || bookingRef;
  if (!ref) return [];

  try {
    const response = await fetch(
      `https://digital.msc.com/api/tracking/v1/events?containerNumber=${encodeURIComponent(ref)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`MSC API error [${response.status}]: ${await response.text()}`);
      return [];
    }

    const data = await response.json();
    const rawEvents = Array.isArray(data) ? data : data?.events || [];
    const events: TrackingResult[] = rawEvents.map((event: any) => {
      const code = event.eventType || event.eventCode || "";
      return {
        milestone: mapDcsaEvent(code),
        location: event.location?.name || event.location?.city || null,
        event_date: event.eventDateTime || new Date().toISOString(),
        notes: event.description || null,
        source: "msc",
        raw_event_code: code,
        eta_updated: null,
      };
    });

    console.log(`🚢 MSC: ${events.length} events for ${ref}`);
    return events;
  } catch (err) {
    console.error("MSC tracking error:", err);
    return [];
  }
}

async function fetchHapagLloydTracking(
  bookingRef: string | null,
  containerNumbers: string[]
): Promise<TrackingResult[]> {
  const apiKey = Deno.env.get("HAPAG_LLOYD_API_KEY");
  if (!apiKey) {
    console.log("⚠️ HAPAG_LLOYD_API_KEY not configured, skipping Hapag-Lloyd tracking");
    return [];
  }

  const ref = containerNumbers[0] || bookingRef;
  if (!ref) return [];

  try {
    const response = await fetch(
      `https://api.hlag.com/hlag/v1/track/container/${encodeURIComponent(ref)}`,
      {
        headers: {
          "X-IBM-Client-Id": apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`Hapag-Lloyd API error [${response.status}]: ${await response.text()}`);
      return [];
    }

    const data = await response.json();
    const rawEvents = data?.events || data?.trackingEvents || [];
    const events: TrackingResult[] = rawEvents.map((event: any) => {
      const code = event.eventType || event.statusCode || "";
      return {
        milestone: mapDcsaEvent(code),
        location: event.location?.name || event.location?.city || event.portName || null,
        event_date: event.eventDateTime || event.date || new Date().toISOString(),
        notes: event.description || null,
        source: "hapag_lloyd",
        raw_event_code: code,
        eta_updated: event.estimatedArrival || null,
      };
    });

    console.log(`🚢 Hapag-Lloyd: ${events.length} events for ${ref}`);
    return events;
  } catch (err) {
    console.error("Hapag-Lloyd tracking error:", err);
    return [];
  }
}

async function fetchE2openTracking(
  bookingRef: string | null,
  containerNumbers: string[]
): Promise<TrackingResult[]> {
  const apiKey = Deno.env.get("E2OPEN_API_KEY");
  if (!apiKey) return [];

  const ref = containerNumbers[0] || bookingRef;
  if (!ref) return [];

  try {
    const response = await fetch(
      `https://api.e2open.com/tracking/v1/shipments?reference=${encodeURIComponent(ref)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const rawEvents = data?.events || [];
    return rawEvents.map((event: any) => ({
      milestone: event.milestone || event.description || "Unknown",
      location: event.location || null,
      event_date: event.eventDate || new Date().toISOString(),
      notes: event.notes || null,
      source: "e2open",
      raw_event_code: event.eventCode || null,
      eta_updated: event.etaUpdated || null,
    }));
  } catch (err) {
    console.error("e2open tracking error:", err);
    return [];
  }
}

// Air tracking (aviation APIs)
async function fetchAirTracking(
  mawbNumber: string | null,
  airline: string | null,
  flightNumber: string | null
): Promise<TrackingResult[]> {
  // Placeholder for aviation tracking APIs (FlightAware, AviationStack)
  console.log(`✈️ Air tracking: MAWB=${mawbNumber}, airline=${airline}, flight=${flightNumber}`);
  return [];
}

// ─── Carrier Detection ──────────────────────────────────────────────────────

const CARRIER_PATTERNS: Record<string, string[]> = {
  maersk: ["maersk", "sealand", "safmarine", "mll"],
  cmacgm: ["cma", "cgm", "anl", "apl"],
  msc: ["msc", "mediterranean"],
  hapag_lloyd: ["hapag", "hlag", "hapag-lloyd"],
};

function detectCarrier(carrierName: string | null, vessel: string | null): string | null {
  const searchText = `${carrierName || ""} ${vessel || ""}`.toLowerCase();
  for (const [key, patterns] of Object.entries(CARRIER_PATTERNS)) {
    if (patterns.some((p) => searchText.includes(p))) return key;
  }
  return null;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { shipment_id, tracking_mode } = await req.json();

    // Bulk mode
    if (tracking_mode === "bulk") {
      const { data: activeShipments, error } = await supabase
        .from("shipments")
        .select("id, mode, booking_ref, vessel, voyage, origin_port, destination_port, mawb_number, airline, flight_number, status, shipment_ref, carrier")
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
    .select("milestone, source, raw_event_code")
    .eq("shipment_id", shipment.id);

  const existingKeys = new Set(
    (existingEvents || []).map((e: any) => `${e.milestone}|${e.source || ""}|${e.raw_event_code || ""}`)
  );

  let trackingResults: TrackingResult[] = [];

  if (isAir) {
    trackingResults = await fetchAirTracking(
      shipment.mawb_number,
      shipment.airline,
      shipment.flight_number
    );
  } else {
    const containerNumbers = (shipment.containers || [])
      .map((c: any) => c.container_number)
      .filter(Boolean);

    const carrierKey = detectCarrier(shipment.carrier, shipment.vessel);

    // Try direct carrier API first
    if (carrierKey === "maersk") {
      trackingResults = await fetchMaerskTracking(shipment.booking_ref, containerNumbers);
    } else if (carrierKey === "cmacgm") {
      trackingResults = await fetchCmaCgmTracking(shipment.booking_ref, containerNumbers);
    } else if (carrierKey === "msc") {
      trackingResults = await fetchMscTracking(shipment.booking_ref, containerNumbers);
    } else if (carrierKey === "hapag_lloyd") {
      trackingResults = await fetchHapagLloydTracking(shipment.booking_ref, containerNumbers);
    }

    // Fallback to e2open if no direct results
    if (trackingResults.length === 0) {
      trackingResults = await fetchE2openTracking(shipment.booking_ref, containerNumbers);
    }
  }

  // Deduplicate
  const newEvents = trackingResults.filter(
    (r) => !existingKeys.has(`${r.milestone}|${r.source}|${r.raw_event_code || ""}`)
  );

  if (newEvents.length > 0) {
    const inserts = newEvents.map((e) => ({
      shipment_id: shipment.id,
      milestone: e.milestone,
      location: e.location,
      event_date: e.event_date,
      notes: e.notes,
      source: e.source,
      raw_event_code: e.raw_event_code || null,
    }));

    const { error: insertErr } = await supabase.from("tracking_events").insert(inserts);
    if (insertErr) console.error("Failed to insert tracking events:", insertErr);

    // Update ETA if available
    const lastEvent = newEvents[newEvents.length - 1];
    if (lastEvent.eta_updated) {
      await supabase
        .from("shipments")
        .update({ eta: lastEvent.eta_updated })
        .eq("id", shipment.id);
    }

    // Auto-advance status
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
      "Container Discharged": "arrived",
      "Customs Clearance": "customs_clearance",
      "Gate Out": "delivered",
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
