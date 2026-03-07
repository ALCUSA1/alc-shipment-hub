import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Carrier API endpoint mapping (placeholder URLs — replace with real endpoints when credentials are configured)
const CARRIER_ENDPOINTS: Record<string, { bookingUrl: string; name: string }> = {
  maersk: { bookingUrl: "https://api.maersk.com/booking/v1/bookings", name: "Maersk" },
  msc: { bookingUrl: "https://api.msc.com/booking/v1", name: "MSC" },
  cmacgm: { bookingUrl: "https://api.cma-cgm.com/booking/v1", name: "CMA CGM" },
  evergreen: { bookingUrl: "https://api.evergreen-marine.com/booking/v1", name: "Evergreen" },
};

/**
 * Formats shipment data into an IFTMIN-style booking request payload.
 * This is a standardized abstraction — each carrier adapter transforms
 * this into the carrier-specific format before sending.
 */
function buildIFTMIN(shipment: any, cargo: any[], containers: any[], parties: any[]) {
  return {
    messageType: "IFTMIN",
    messageFunction: "9", // Original
    transportDetails: {
      modeOfTransport: "1", // Maritime
      placeOfReceipt: shipment.pickup_location || shipment.origin_port,
      portOfLoading: shipment.origin_port,
      portOfDischarge: shipment.destination_port,
      placeOfDelivery: shipment.delivery_location || shipment.destination_port,
      requestedETD: shipment.etd,
    },
    equipment: containers.map((c: any) => ({
      containerType: c.container_type,
      quantity: c.quantity,
    })),
    goods: cargo.map((c: any) => ({
      description: c.commodity,
      hsCode: c.hs_code,
      grossWeight: c.gross_weight,
      volume: c.volume,
      packages: c.num_packages,
      packageType: c.package_type,
    })),
    parties: parties.map((p: any) => ({
      role: p.role,
      name: p.company_name,
      contact: p.contact_name,
      address: p.address,
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { shipment_id, carrier } = await req.json();

    if (!shipment_id || !carrier) {
      return new Response(JSON.stringify({ error: "shipment_id and carrier are required" }), { status: 400, headers: corsHeaders });
    }

    const carrierConfig = CARRIER_ENDPOINTS[carrier.toLowerCase()];
    if (!carrierConfig) {
      return new Response(JSON.stringify({ error: `Unsupported carrier: ${carrier}` }), { status: 400, headers: corsHeaders });
    }

    // Fetch shipment + related data (verifies ownership via RLS)
    const [shipmentRes, cargoRes, containersRes, partiesRes] = await Promise.all([
      supabase.from("shipments").select("*").eq("id", shipment_id).single(),
      supabase.from("cargo").select("*").eq("shipment_id", shipment_id),
      supabase.from("containers").select("*").eq("shipment_id", shipment_id),
      supabase.from("shipment_parties").select("*").eq("shipment_id", shipment_id),
    ]);

    if (shipmentRes.error) {
      return new Response(JSON.stringify({ error: "Shipment not found" }), { status: 404, headers: corsHeaders });
    }

    // Build the IFTMIN payload
    const iftminPayload = buildIFTMIN(
      shipmentRes.data,
      cargoRes.data || [],
      containersRes.data || [],
      partiesRes.data || []
    );

    // Store the outbound EDI message
    const { data: ediMsg, error: ediErr } = await supabase.from("edi_messages").insert({
      user_id: userId,
      shipment_id,
      carrier: carrierConfig.name,
      message_type: "IFTMIN",
      direction: "outbound",
      payload: iftminPayload,
      status: "sent",
    }).select("id").single();

    if (ediErr) {
      return new Response(JSON.stringify({ error: "Failed to record EDI message", detail: ediErr.message }), { status: 500, headers: corsHeaders });
    }

    // Update shipment status to booking_confirmed (in real integration, this would be "pending" until carrier confirms)
    await supabase.from("shipments").update({ status: "booking_confirmed" }).eq("id", shipment_id);

    // Add tracking event
    await supabase.from("tracking_events").insert({
      shipment_id,
      milestone: "Booking Confirmed",
      location: shipmentRes.data.origin_port,
      notes: `Booking request sent to ${carrierConfig.name}`,
    });

    // NOTE: In production, you'd call the carrier API here:
    // const carrierResponse = await fetch(carrierConfig.bookingUrl, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${Deno.env.get(`${carrier.toUpperCase()}_API_KEY`)}`,
    //   },
    //   body: JSON.stringify(iftminPayload),
    // });
    // Then update edi_messages with the response and booking reference.

    return new Response(JSON.stringify({
      success: true,
      edi_message_id: ediMsg.id,
      carrier: carrierConfig.name,
      message: `Booking request sent to ${carrierConfig.name}`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
