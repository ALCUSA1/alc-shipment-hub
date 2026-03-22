import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * carrier-sync Edge Function
 *
 * Primary: Terminal49 for container tracking, document retrieval, and terminal availability
 * Fallback: Direct carrier APIs (Maersk, CMA CGM, MSC, Hapag-Lloyd)
 *
 * Syncs booking confirmations, voyage schedules, cutoff dates, and documents.
 */

const TERMINAL49_BASE = "https://api.terminal49.com/v2";

const CARRIER_PATTERNS: Record<string, string[]> = {
  maersk: ["maersk", "sealand", "safmarine"],
  cmacgm: ["cma", "cgm", "anl", "apl"],
  msc: ["msc", "mediterranean"],
  hapag_lloyd: ["hapag", "hlag", "hapag-lloyd"],
};

const CARRIER_SCAC: Record<string, string> = {
  maersk: "MAEU",
  cmacgm: "CMDU",
  msc: "MSCU",
  hapag_lloyd: "HLCU",
  evergreen: "EGLV",
  one: "ONEY",
  zim: "ZIMU",
  cosco: "COSU",
};

function detectCarrier(carrierName: string | null, vessel: string | null): string | null {
  const text = `${carrierName || ""} ${vessel || ""}`.toLowerCase();
  for (const [key, patterns] of Object.entries(CARRIER_PATTERNS)) {
    if (patterns.some((p) => text.includes(p))) return key;
  }
  return null;
}

function getScac(carrierKey: string | null, carrierName: string | null): string | null {
  if (carrierKey && CARRIER_SCAC[carrierKey]) return CARRIER_SCAC[carrierKey];
  const name = (carrierName || "").toLowerCase();
  for (const [key, scac] of Object.entries(CARRIER_SCAC)) {
    if (name.includes(key.replace("_", " "))) return scac;
  }
  return null;
}

interface CarrierSyncResult {
  booking_confirmed: boolean;
  cutoffs_updated: boolean;
  schedule_updated: boolean;
  documents_found: number;
  source: string;
  details: string;
}

// ─── Terminal49 Sync ────────────────────────────────────────────────────────

async function syncFromTerminal49(shipment: any, supabase: any): Promise<CarrierSyncResult> {
  const apiKey = Deno.env.get("TERMINAL49_API_KEY");
  if (!apiKey) {
    return { booking_confirmed: false, cutoffs_updated: false, schedule_updated: false, documents_found: 0, source: "terminal49", details: "TERMINAL49_API_KEY not configured" };
  }

  const carrierKey = detectCarrier(shipment.carrier, shipment.vessel);
  const scac = getScac(carrierKey, shipment.carrier);

  if (!scac && !shipment.booking_ref) {
    return { booking_confirmed: false, cutoffs_updated: false, schedule_updated: false, documents_found: 0, source: "terminal49", details: "No SCAC code or booking ref available" };
  }

  try {
    // Create or find tracking request
    const ref = shipment.booking_ref || shipment.shipment_ref;

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
            request_type: shipment.booking_ref ? "booking_number" : "bill_of_lading",
            request_number: ref,
            scac: scac,
          },
        },
      }),
    });

    let trackingData: any = null;
    if (createRes.ok) {
      trackingData = await createRes.json();
    } else {
      // May already exist — search for it
      const searchRes = await fetch(
        `${TERMINAL49_BASE}/tracking_requests?filter[request_number]=${encodeURIComponent(ref)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data?.length > 0) {
          trackingData = searchData;
        }
      } else {
        await searchRes.text();
      }
      await createRes.text();
    }

    if (!trackingData) {
      return { booking_confirmed: false, cutoffs_updated: false, schedule_updated: false, documents_found: 0, source: "terminal49", details: "Could not create/find tracking request" };
    }

    const trackingRequestId = trackingData.data?.id || trackingData.data?.[0]?.id;
    if (!trackingRequestId) {
      return { booking_confirmed: false, cutoffs_updated: false, schedule_updated: false, documents_found: 0, source: "terminal49", details: "No tracking request ID returned" };
    }

    // Fetch containers with full details
    const containersRes = await fetch(
      `${TERMINAL49_BASE}/containers?filter[tracking_request_id]=${trackingRequestId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/vnd.api+json",
        },
      }
    );

    let bookingConfirmed = false;
    let cutoffsUpdated = false;
    let scheduleUpdated = false;

    if (containersRes.ok) {
      const containersData = await containersRes.json();
      const containers = containersData.data || [];

      for (const container of containers) {
        const attrs = container.attributes || {};

        // Update cutoffs if available
        if (attrs.cargo_cutoff_at || attrs.documentation_cutoff_at) {
          cutoffsUpdated = true;
          // Update shipment_cutoffs table
          if (attrs.cargo_cutoff_at) {
            await supabase.from("shipment_cutoffs").upsert({
              shipment_id: shipment.id,
              cutoff_type: "port_cutoff",
              cutoff_date: attrs.cargo_cutoff_at,
              source: "terminal49",
            }, { onConflict: "shipment_id,cutoff_type" }).select();
          }
          if (attrs.documentation_cutoff_at) {
            await supabase.from("shipment_cutoffs").upsert({
              shipment_id: shipment.id,
              cutoff_type: "doc_cutoff",
              cutoff_date: attrs.documentation_cutoff_at,
              source: "terminal49",
            }, { onConflict: "shipment_id,cutoff_type" }).select();
          }
        }

        // Update ETA if available
        if (attrs.pod_eta) {
          scheduleUpdated = true;
          await supabase.from("shipments").update({ eta: attrs.pod_eta }).eq("id", shipment.id);
        }

        // Check booking status
        if (attrs.status === "active") {
          bookingConfirmed = true;
        }
      }
    } else {
      await containersRes.text();
    }

    // Fetch available documents
    let documentsFound = 0;
    try {
      const docsRes = await fetch(
        `${TERMINAL49_BASE}/shipping_documents?filter[tracking_request_id]=${trackingRequestId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/vnd.api+json",
          },
        }
      );
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        documentsFound = docsData.data?.length || 0;
      } else {
        await docsRes.text();
      }
    } catch (e) {
      console.error("Terminal49 docs fetch error:", e);
    }

    return {
      booking_confirmed: bookingConfirmed,
      cutoffs_updated: cutoffsUpdated,
      schedule_updated: scheduleUpdated,
      documents_found: documentsFound,
      source: "terminal49",
      details: `Synced via Terminal49 (${containers?.length || 0} containers, ${documentsFound} docs)`,
    };
  } catch (err) {
    console.error("Terminal49 sync error:", err);
    return { booking_confirmed: false, cutoffs_updated: false, schedule_updated: false, documents_found: 0, source: "terminal49", details: `Error: ${err}` };
  }
}

// ─── Direct Carrier Sync (Fallback) ─────────────────────────────────────────

async function syncFromDirectCarrier(shipment: any, carrierKey: string): Promise<CarrierSyncResult> {
  const apiKeyMap: Record<string, string> = {
    maersk: "MAERSK_API_KEY",
    cmacgm: "CMA_CGM_API_KEY",
    msc: "MSC_API_KEY",
    hapag_lloyd: "HAPAG_LLOYD_API_KEY",
  };

  const apiKey = Deno.env.get(apiKeyMap[carrierKey] || "");
  if (!apiKey) {
    return { booking_confirmed: false, cutoffs_updated: false, schedule_updated: false, documents_found: 0, source: carrierKey, details: "API key not configured" };
  }

  if (!shipment.booking_ref) {
    return { booking_confirmed: false, cutoffs_updated: false, schedule_updated: false, documents_found: 0, source: carrierKey, details: "No booking ref to query" };
  }

  // Simplified direct carrier sync — structure matches previous implementation
  try {
    const endpoints: Record<string, { url: string; headers: Record<string, string> }> = {
      maersk: {
        url: `https://api.maersk.com/booking/v2/bookings/${encodeURIComponent(shipment.booking_ref)}`,
        headers: { "Consumer-Key": apiKey, Accept: "application/json" },
      },
      cmacgm: {
        url: `https://apis.cma-cgm.net/booking/v1/bookings/${encodeURIComponent(shipment.booking_ref)}`,
        headers: { KeyId: apiKey, Accept: "application/json" },
      },
      hapag_lloyd: {
        url: `https://api.hlag.com/hlag/v1/booking/${encodeURIComponent(shipment.booking_ref)}`,
        headers: { "X-IBM-Client-Id": apiKey, Accept: "application/json" },
      },
    };

    const config = endpoints[carrierKey];
    if (!config) {
      return { booking_confirmed: false, cutoffs_updated: false, schedule_updated: false, documents_found: 0, source: carrierKey, details: `No endpoint for ${carrierKey}` };
    }

    const res = await fetch(config.url, { headers: config.headers });
    if (!res.ok) {
      const errText = await res.text();
      return { booking_confirmed: false, cutoffs_updated: false, schedule_updated: false, documents_found: 0, source: carrierKey, details: `API error [${res.status}]: ${errText}` };
    }

    const data = await res.json();
    return {
      booking_confirmed: data.bookingStatus === "CONFIRMED" || data.status === "CONFIRMED",
      cutoffs_updated: !!(data.cutOffDateCargo || data.cutOffDates),
      schedule_updated: !!(data.schedule || data.voyageSchedule),
      documents_found: 0,
      source: carrierKey,
      details: `Booking ${shipment.booking_ref} synced`,
    };
  } catch (err) {
    console.error(`${carrierKey} sync error:`, err);
    return { booking_confirmed: false, cutoffs_updated: false, schedule_updated: false, documents_found: 0, source: carrierKey, details: `Error: ${err}` };
  }
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

    const body = await req.json();
    const { shipment_id, sync_mode } = body;

    if (sync_mode === "bulk") {
      const { data: shipments, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, booking_ref, vessel, voyage, carrier, mode, status")
        .in("status", ["booked", "booking_confirmed", "cargo_received", "in_transit"])
        .eq("mode", "ocean")
        .limit(100);

      if (error) throw error;

      const results = [];
      for (const ship of shipments || []) {
        const result = await syncShipment(ship, supabase);
        results.push({ shipment_ref: ship.shipment_ref, ...result });
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!shipment_id) {
      return new Response(JSON.stringify({ error: "shipment_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: shipment, error: shipErr } = await supabase
      .from("shipments")
      .select("id, shipment_ref, booking_ref, vessel, voyage, carrier, mode, status")
      .eq("id", shipment_id)
      .single();

    if (shipErr || !shipment) throw new Error("Shipment not found");

    const result = await syncShipment(shipment, supabase);

    return new Response(
      JSON.stringify({ shipment_id, shipment_ref: shipment.shipment_ref, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("carrier-sync error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncShipment(shipment: any, supabase: any): Promise<CarrierSyncResult> {
  // 1. Try Terminal49 first
  const t49Result = await syncFromTerminal49(shipment, supabase);
  if (t49Result.booking_confirmed || t49Result.cutoffs_updated || t49Result.schedule_updated || t49Result.documents_found > 0) {
    return t49Result;
  }

  // 2. Fallback to direct carrier API
  const carrierKey = detectCarrier(shipment.carrier, shipment.vessel);
  if (carrierKey) {
    return await syncFromDirectCarrier(shipment, carrierKey);
  }

  return {
    booking_confirmed: false,
    cutoffs_updated: false,
    schedule_updated: false,
    documents_found: 0,
    source: "none",
    details: `No tracking provider available for carrier "${shipment.carrier}"`,
  };
}
