import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Maps carrier IFTSTA event codes to our milestone labels
const EVENT_TO_MILESTONE: Record<string, string> = {
  // Standard IFTSTA codes
  "1": "Booking Confirmed",
  "6": "Cargo Received",
  "9": "Container Loaded",
  "11": "Vessel Departed",
  "14": "In Transit",
  "17": "Port Arrival",
  "21": "Customs Clearance",
  "24": "Delivered",
  // Common carrier status strings
  "booking_confirmed": "Booking Confirmed",
  "gate_in": "Cargo Received",
  "loaded": "Container Loaded",
  "departed": "Vessel Departed",
  "in_transit": "In Transit",
  "arrived": "Port Arrival",
  "customs_cleared": "Customs Clearance",
  "delivered": "Delivered",
};

// Maps milestone to shipment status
const MILESTONE_TO_STATUS: Record<string, string> = {
  "Booking Confirmed": "booking_confirmed",
  "Cargo Received": "cargo_received",
  "Container Loaded": "cargo_received",
  "Vessel Departed": "in_transit",
  "In Transit": "in_transit",
  "Port Arrival": "in_transit",
  "Customs Clearance": "in_transit",
  "Delivered": "delivered",
};

/**
 * Public webhook endpoint — no JWT required.
 * Carriers POST IFTSTA status updates here.
 *
 * Expected payload format (normalized):
 * {
 *   carrier: "maersk" | "msc" | "cmacgm" | "evergreen",
 *   booking_ref: "BKNG123456",
 *   shipment_ref: "SHP-2026-001",  // optional, used as fallback
 *   event_code: "11",               // or string like "departed"
 *   event_date: "2026-03-15T10:30:00Z",
 *   location: "Shanghai, CN",
 *   vessel: "MSC OSCAR",           // optional
 *   voyage: "FA612E",              // optional
 *   notes: "Vessel has departed port of loading"  // optional
 * }
 *
 * Each carrier adapter (Maersk, MSC, etc.) would transform their
 * proprietary format into this normalized structure before hitting
 * this endpoint, or we normalize inline.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    // Use service role for webhook processing (no user auth context)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { carrier, booking_ref, shipment_ref, event_code, event_date, location, vessel, voyage, notes } = body;

    if (!carrier || !event_code) {
      return new Response(JSON.stringify({ error: "carrier and event_code are required" }), { status: 400, headers: corsHeaders });
    }

    // Find the shipment by booking_ref or shipment_ref
    let shipmentQuery = supabase.from("shipments").select("id, user_id, status");
    if (booking_ref) {
      shipmentQuery = shipmentQuery.eq("booking_ref", booking_ref);
    } else if (shipment_ref) {
      shipmentQuery = shipmentQuery.eq("shipment_ref", shipment_ref);
    } else {
      return new Response(JSON.stringify({ error: "booking_ref or shipment_ref required" }), { status: 400, headers: corsHeaders });
    }

    const { data: shipment, error: shipErr } = await shipmentQuery.maybeSingle();

    if (shipErr || !shipment) {
      // Store as unmatched EDI message for manual review
      await supabase.from("edi_messages").insert({
        user_id: "00000000-0000-0000-0000-000000000000", // system placeholder
        carrier,
        message_type: "IFTSTA",
        direction: "inbound",
        payload: body,
        status: "error",
        error_message: `Shipment not found for ref: ${booking_ref || shipment_ref}`,
      });
      return new Response(JSON.stringify({ error: "Shipment not found" }), { status: 404, headers: corsHeaders });
    }

    const milestone = EVENT_TO_MILESTONE[event_code] || EVENT_TO_MILESTONE[event_code.toLowerCase?.()] || null;

    // Store inbound EDI message
    await supabase.from("edi_messages").insert({
      user_id: shipment.user_id,
      shipment_id: shipment.id,
      carrier,
      message_type: "IFTSTA",
      direction: "inbound",
      payload: body,
      status: "processed",
      message_ref: booking_ref || shipment_ref,
    });

    // Create tracking event if we can map the event code
    if (milestone) {
      await supabase.from("tracking_events").insert({
        shipment_id: shipment.id,
        milestone,
        event_date: event_date || new Date().toISOString(),
        location: location || null,
        notes: notes || `Status update from ${carrier}: ${milestone}`,
      });

      // Update shipment status
      const newStatus = MILESTONE_TO_STATUS[milestone];
      if (newStatus) {
        const updatePayload: Record<string, any> = { status: newStatus };
        if (vessel) updatePayload.vessel = vessel;
        if (voyage) updatePayload.voyage = voyage;
        if (booking_ref && !shipment.status) updatePayload.booking_ref = booking_ref;
        await supabase.from("shipments").update(updatePayload).eq("id", shipment.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      shipment_id: shipment.id,
      milestone: milestone || "unmapped",
      message: milestone ? `Tracking updated: ${milestone}` : `Event code ${event_code} received but not mapped to a milestone`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
