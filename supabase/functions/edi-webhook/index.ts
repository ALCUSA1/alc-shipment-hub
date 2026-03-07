import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-carrier-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Carrier-specific API key validation (in production, each carrier gets a unique key)
const SUPPORTED_CARRIERS = ["maersk", "msc", "cma-cgm", "evergreen"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.json();
    const {
      carrier,
      message_type,
      message_ref,
      shipment_ref,
      booking_ref,
      events,
      status: carrierStatus,
      vessel,
      voyage,
      eta,
      etd,
    } = body;

    // Validate carrier
    if (!carrier || !SUPPORTED_CARRIERS.includes(carrier.toLowerCase())) {
      throw new Error(`Unsupported carrier: ${carrier}. Supported: ${SUPPORTED_CARRIERS.join(", ")}`);
    }

    if (!message_type) {
      throw new Error("Missing message_type (e.g., IFTSTA, APERAK)");
    }

    // Find the shipment by ref or booking ref
    let shipment = null;
    if (shipment_ref) {
      const { data } = await supabaseAdmin
        .from("shipments")
        .select("id, user_id, status")
        .eq("shipment_ref", shipment_ref)
        .maybeSingle();
      shipment = data;
    }
    if (!shipment && booking_ref) {
      const { data } = await supabaseAdmin
        .from("shipments")
        .select("id, user_id, status")
        .eq("booking_ref", booking_ref)
        .maybeSingle();
      shipment = data;
    }

    // Log the EDI message
    const ediRecord = {
      shipment_id: shipment?.id || null,
      user_id: shipment?.user_id || "00000000-0000-0000-0000-000000000000",
      carrier: carrier.toLowerCase(),
      direction: "inbound",
      message_type: message_type.toUpperCase(),
      message_ref: message_ref || null,
      payload: body,
      status: shipment ? "processed" : "unmatched",
      processed_at: shipment ? new Date().toISOString() : null,
      error_message: shipment ? null : `No shipment found for ref: ${shipment_ref || booking_ref || "none"}`,
    };

    await supabaseAdmin.from("edi_messages").insert(ediRecord);

    if (!shipment) {
      return new Response(
        JSON.stringify({ status: "unmatched", message: "No matching shipment found, message logged" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Process IFTSTA status updates
    if (message_type.toUpperCase() === "IFTSTA" && events && Array.isArray(events)) {
      for (const event of events) {
        await supabaseAdmin.from("tracking_events").insert({
          shipment_id: shipment.id,
          milestone: event.milestone || event.status || "Status Update",
          location: event.location || null,
          notes: `[${carrier.toUpperCase()} EDI] ${event.description || event.notes || ""}`,
          event_date: event.event_date || new Date().toISOString(),
        });
      }
    }

    // Update shipment fields if provided
    const shipmentUpdate: Record<string, unknown> = {};
    if (carrierStatus) shipmentUpdate.status = carrierStatus;
    if (vessel) shipmentUpdate.vessel = vessel;
    if (voyage) shipmentUpdate.voyage = voyage;
    if (eta) shipmentUpdate.eta = eta;
    if (etd) shipmentUpdate.etd = etd;

    if (Object.keys(shipmentUpdate).length > 0) {
      await supabaseAdmin
        .from("shipments")
        .update(shipmentUpdate)
        .eq("id", shipment.id);
    }

    return new Response(
      JSON.stringify({
        status: "processed",
        shipment_id: shipment.id,
        events_added: events?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("EDI webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
