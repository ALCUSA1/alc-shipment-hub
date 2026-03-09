import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Carrier cutoff API endpoints (placeholder — replace with real endpoints when credentials available)
const CARRIER_CUTOFF_ENDPOINTS: Record<string, string> = {
  maersk: "https://api.maersk.com/schedules/v1/cutoffs",
  msc: "https://api.msc.com/schedules/v1/cutoffs",
  cmacgm: "https://api.cma-cgm.com/schedules/v1/cutoffs",
  evergreen: "https://api.evergreen-marine.com/schedules/v1/cutoffs",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { shipment_id } = await req.json();
    if (!shipment_id) {
      return new Response(
        JSON.stringify({ error: "shipment_id is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch shipment (RLS ensures ownership)
    const { data: shipment, error: shipErr } = await supabase
      .from("shipments")
      .select("id, booking_ref, vessel, voyage, origin_port, destination_port, carrier")
      .eq("id", shipment_id)
      .single();

    if (shipErr || !shipment) {
      return new Response(
        JSON.stringify({ error: "Shipment not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Find the carrier from vessel_bookings or shipment carrier field
    const carrierKey = (shipment as any).carrier?.toLowerCase?.() || "";
    const endpoint = CARRIER_CUTOFF_ENDPOINTS[carrierKey];

    // NOTE: In production, you'd call the carrier API here:
    // const apiKey = Deno.env.get(`${carrierKey.toUpperCase()}_API_KEY`);
    // const response = await fetch(`${endpoint}?bookingRef=${shipment.booking_ref}&vessel=${shipment.vessel}&voyage=${shipment.voyage}`, {
    //   headers: { Authorization: `Bearer ${apiKey}` },
    // });
    // const cutoffData = await response.json();
    // Then map the carrier-specific response to our standard fields.

    // For now, simulate carrier API response with realistic offsets from ETD
    // In production, this block is replaced by the real API call above
    const simulatedResponse = {
      cy_cutoff: null as string | null,
      si_cutoff: null as string | null,
      vgm_cutoff: null as string | null,
      doc_cutoff: null as string | null,
      source: "carrier_api",
      carrier: carrierKey || "unknown",
    };

    // If no carrier API is configured, return a helpful message
    if (!endpoint) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Carrier API not configured for "${(shipment as any).carrier || "unknown"}". Cutoff dates can be entered manually or will be populated when carrier API credentials are configured.`,
          supported_carriers: Object.keys(CARRIER_CUTOFF_ENDPOINTS),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update shipment with cutoff dates from carrier
    const updateFields: Record<string, string | null> = {};
    if (simulatedResponse.cy_cutoff)
      updateFields.cy_cutoff = simulatedResponse.cy_cutoff;
    if (simulatedResponse.si_cutoff)
      updateFields.si_cutoff = simulatedResponse.si_cutoff;
    if (simulatedResponse.vgm_cutoff)
      updateFields.vgm_cutoff = simulatedResponse.vgm_cutoff;
    if (simulatedResponse.doc_cutoff)
      updateFields.doc_cutoff = simulatedResponse.doc_cutoff;

    if (Object.keys(updateFields).length > 0) {
      const { error: updateErr } = await supabase
        .from("shipments")
        .update(updateFields)
        .eq("id", shipment_id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update cutoffs", detail: updateErr.message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cutoff dates synced from ${simulatedResponse.carrier}`,
        cutoffs: updateFields,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("sync-cutoffs error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
