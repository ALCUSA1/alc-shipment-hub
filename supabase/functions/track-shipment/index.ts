import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * track-shipment Edge Function
 *
 * Primary: Terminal49 unified tracking API (100+ ocean carriers)
 * Fallback: Direct carrier APIs (Maersk, CMA CGM, MSC, Hapag-Lloyd)
 * Last resort: e2open (if configured)
 *
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

// ─── Terminal49 Event → Milestone Mapping ───────────────────────────────────
const T49_EVENT_MAP: Record<string, string> = {
  "container.transport.vessel_departed": "Vessel Departed",
  "container.transport.vessel_arrived": "Port Arrival",
  "container.transport.vessel_loaded": "Container Loaded",
  "container.transport.vessel_discharged": "Container Discharged",
  "container.transport.full_in": "Cargo Received at Origin",
  "container.transport.empty_out": "Gate Out",
  "container.transport.gate_out_full": "Gate Out",
  "container.transport.gate_in_empty": "Container Returned",
  "tracking_request.tracking_succeeded": "Tracking Active",
  "shipment.eta.changed": "ETA Updated",
};

function mapTerminal49Event(eventType: string, description?: string): string {
  return T49_EVENT_MAP[eventType] || description || eventType;
}

// ─── Terminal49 API Adapter ─────────────────────────────────────────────────

const TERMINAL49_BASE = "https://api.terminal49.com/v2";

async function fetchTerminal49Tracking(
  bookingRef: string | null,
  containerNumbers: string[],
  carrier: string | null
): Promise<TrackingResult[]> {
  const apiKey = Deno.env.get("TERMINAL49_API_KEY");
  if (!apiKey) {
    console.log("⚠️ TERMINAL49_API_KEY not configured, skipping Terminal49");
    return [];
  }

  const results: TrackingResult[] = [];

  // Try creating a tracking request for each container
  for (const containerNum of containerNumbers) {
    try {
      // First, search for existing tracking requests
      const searchRes = await fetch(
        `${TERMINAL49_BASE}/tracking_requests?filter[container_number]=${encodeURIComponent(containerNum)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );

      let trackingRequestId: string | null = null;

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          trackingRequestId = searchData.data[0].id;
        }
      } else {
        await searchRes.text(); // consume body
      }

      // If no existing request, create one
      if (!trackingRequestId && carrier) {
        const createRes = await fetch(`${TERMINAL49_BASE}/tracking_requests`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/vnd.api+json",
            Accept: "application/vnd.api+json",
          },
          body: JSON.stringify({
            data: {
              type: "tracking_request",
              attributes: {
                request_type: "bill_of_lading",
                request_number: bookingRef || containerNum,
                scac: carrier,
              },
            },
          }),
        });

        if (createRes.ok) {
          const createData = await createRes.json();
          trackingRequestId = createData.data?.id;
        } else {
          const errText = await createRes.text();
          console.error(`Terminal49 create error [${createRes.status}]: ${errText}`);
        }
      }

      if (!trackingRequestId) continue;

      // Fetch container events
      const eventsRes = await fetch(
        `${TERMINAL49_BASE}/containers?filter[tracking_request_id]=${trackingRequestId}&include=transport_events`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );

      if (!eventsRes.ok) {
        const errText = await eventsRes.text();
        console.error(`Terminal49 events error [${eventsRes.status}]: ${errText}`);
        continue;
      }

      const eventsData = await eventsRes.json();

      // Parse containers and their transport events
      const containers = eventsData.data || [];
      const included = eventsData.included || [];

      // Extract transport events from included resources
      const transportEvents = included.filter((r: any) => r.type === "transport_event");

      for (const event of transportEvents) {
        const attrs = event.attributes || {};
        const eventCode = attrs.event || attrs.event_type || "";

        results.push({
          milestone: mapTerminal49Event(eventCode, attrs.description),
          location: attrs.location || attrs.facility || null,
          event_date: attrs.timestamp || attrs.event_time || new Date().toISOString(),
          notes: attrs.description || null,
          source: "terminal49",
          raw_event_code: eventCode,
          vessel_position: attrs.vessel?.coordinates
            ? { lat: attrs.vessel.coordinates.latitude, lng: attrs.vessel.coordinates.longitude }
            : null,
          eta_updated: attrs.pod_eta || null,
        });
      }

      // Also extract ETA from container attributes
      for (const container of containers) {
        const cAttrs = container.attributes || {};
        if (cAttrs.pod_eta) {
          // Add ETA as a synthetic event if it changed
          results.push({
            milestone: "ETA Updated",
            location: cAttrs.pod_full_name || null,
            event_date: new Date().toISOString(),
            notes: `Updated ETA: ${cAttrs.pod_eta}`,
            source: "terminal49",
            raw_event_code: "ETA_UPDATE",
            eta_updated: cAttrs.pod_eta,
          });
        }
      }

      console.log(`📦 Terminal49: ${results.length} events for container ${containerNum}`);
    } catch (err) {
      console.error(`Terminal49 error for ${containerNum}:`, err);
    }
  }

  // If no container numbers, try by booking ref
  if (containerNumbers.length === 0 && bookingRef && carrier) {
    try {
      const createRes = await fetch(`${TERMINAL49_BASE}/tracking_requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            type: "tracking_request",
            attributes: {
              request_type: "booking_number",
              request_number: bookingRef,
              scac: carrier,
            },
          },
        }),
      });

      if (createRes.ok) {
        const data = await createRes.json();
        console.log(`📦 Terminal49: tracking request created for booking ${bookingRef}`);
        // Events will arrive via webhooks
      } else {
        await createRes.text();
      }
    } catch (err) {
      console.error(`Terminal49 booking error:`, err);
    }
  }

  return results;
}

// ─── Direct Carrier API Adapters (Fallback) ─────────────────────────────────

async function fetchDirectCarrierTracking(
  carrierKey: string | null,
  bookingRef: string | null,
  containerNumbers: string[]
): Promise<TrackingResult[]> {
  if (!carrierKey) return [];

  const ref = containerNumbers[0] || bookingRef;
  if (!ref) return [];

  const apiKeyMap: Record<string, string> = {
    maersk: "MAERSK_API_KEY",
    cmacgm: "CMA_CGM_API_KEY",
    msc: "MSC_API_KEY",
    hapag_lloyd: "HAPAG_LLOYD_API_KEY",
  };

  const apiKey = Deno.env.get(apiKeyMap[carrierKey] || "");
  if (!apiKey) return [];

  const endpoints: Record<string, { url: string; headers: Record<string, string> }> = {
    maersk: {
      url: `https://api.maersk.com/track-and-trace?containerNumber=${encodeURIComponent(ref)}`,
      headers: { "Consumer-Key": apiKey, Accept: "application/json" },
    },
    cmacgm: {
      url: `https://apis.cma-cgm.net/tracking/v1/events?equipmentReference=${encodeURIComponent(ref)}`,
      headers: { KeyId: apiKey, Accept: "application/json" },
    },
    msc: {
      url: `https://digital.msc.com/api/tracking/v1/events?containerNumber=${encodeURIComponent(ref)}`,
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    },
    hapag_lloyd: {
      url: `https://api.hlag.com/hlag/v1/track/container/${encodeURIComponent(ref)}`,
      headers: { "X-IBM-Client-Id": apiKey, Accept: "application/json" },
    },
  };

  const config = endpoints[carrierKey];
  if (!config) return [];

  try {
    const response = await fetch(config.url, { headers: config.headers });
    if (!response.ok) {
      console.error(`${carrierKey} API error [${response.status}]: ${await response.text()}`);
      return [];
    }

    const data = await response.json();
    const rawEvents = Array.isArray(data)
      ? data
      : data?.events || data?.containers?.[0]?.events || data?.transportEvents || [];

    const events: TrackingResult[] = rawEvents.map((event: any) => {
      const code = event.eventType || event.transportEventTypeCode || event.statusCode || "";
      return {
        milestone: mapDcsaEvent(code),
        location:
          event.location?.facilityName ||
          event.location?.city ||
          event.location?.name ||
          event.locationName ||
          event.portName ||
          null,
        event_date: event.eventDateTime || event.eventCreatedDateTime || event.date || new Date().toISOString(),
        notes: event.description || event.eventClassifierCode || null,
        source: carrierKey,
        raw_event_code: code,
        eta_updated: event.estimatedArrival || event.schedule?.estimatedArrival || null,
      };
    });

    console.log(`🚢 ${carrierKey}: ${events.length} events for ${ref}`);
    return events;
  } catch (err) {
    console.error(`${carrierKey} tracking error:`, err);
    return [];
  }
}

// Air tracking placeholder
async function fetchAirTracking(
  mawbNumber: string | null,
  airline: string | null,
  flightNumber: string | null
): Promise<TrackingResult[]> {
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

// ─── SCAC code lookup for Terminal49 ────────────────────────────────────────
const CARRIER_SCAC: Record<string, string> = {
  maersk: "MAEU",
  cmacgm: "CMDU",
  msc: "MSCU",
  hapag_lloyd: "HLCU",
  evergreen: "EGLV",
  one: "ONEY",
  zim: "ZIMU",
  cosco: "COSU",
  yang_ming: "YMLU",
  hmm: "HDMU",
};

function getScac(carrierKey: string | null, carrierName: string | null): string | null {
  if (carrierKey && CARRIER_SCAC[carrierKey]) return CARRIER_SCAC[carrierKey];
  // Try to match by name
  const name = (carrierName || "").toLowerCase();
  for (const [key, scac] of Object.entries(CARRIER_SCAC)) {
    if (name.includes(key.replace("_", " ")) || name.includes(key)) return scac;
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
    const scac = getScac(carrierKey, shipment.carrier);

    // 1. Try Terminal49 first (unified API, 100+ carriers)
    trackingResults = await fetchTerminal49Tracking(
      shipment.booking_ref,
      containerNumbers,
      scac
    );

    // 2. Fallback to direct carrier API
    if (trackingResults.length === 0) {
      trackingResults = await fetchDirectCarrierTracking(
        carrierKey,
        shipment.booking_ref,
        containerNumbers
      );
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
    const lastEta = [...newEvents].reverse().find((e) => e.eta_updated);
    if (lastEta?.eta_updated) {
      await supabase
        .from("shipments")
        .update({ eta: lastEta.eta_updated })
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
