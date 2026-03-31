const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bookingId = url.searchParams.get("booking_id");
    const bookingNumber = url.searchParams.get("booking_number");
    const shipmentId = url.searchParams.get("shipment_id");

    let resolvedBookingId = bookingId;

    // Resolve by booking number
    if (!resolvedBookingId && bookingNumber) {
      const { data } = await supabase
        .from("bookings")
        .select("id")
        .eq("carrier_booking_number", bookingNumber)
        .maybeSingle();
      resolvedBookingId = data?.id || null;
    }

    // Resolve by shipment_id (get latest booking)
    if (!resolvedBookingId && shipmentId) {
      const { data } = await supabase
        .from("bookings")
        .select("id")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedBookingId = data?.id || null;
    }

    if (!resolvedBookingId) {
      return new Response(
        JSON.stringify({ error: "Booking not found. Provide booking_id, booking_number, or shipment_id." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all normalized booking data in parallel
    const [
      bookingRes,
      equipmentsRes,
      cargoRes,
      transportRes,
      chargesRes,
      instructionsRes,
      referencesRes,
      partiesRes,
      documentsRes,
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select(`
          *,
          alc_carriers!bookings_alc_carrier_id_fkey(carrier_code, carrier_name),
          shipments!bookings_shipment_id_fkey(
            id, shipment_ref, status, current_substatus,
            mode, origin_port, destination_port, etd, eta,
            vessel, voyage, booking_ref
          )
        `)
        .eq("id", resolvedBookingId)
        .single(),
      supabase
        .from("booking_equipments")
        .select("*")
        .eq("booking_id", resolvedBookingId)
        .order("created_at"),
      supabase
        .from("cargo_details")
        .select("*")
        .eq("booking_id", resolvedBookingId)
        .order("cargo_line_number"),
      supabase
        .from("transport_plans")
        .select(`
          *,
          alc_vessels:vessel_id(vessel_name, imo_number),
          load_location:load_location_id(unlocode, location_name, city, country),
          discharge_location:discharge_location_id(unlocode, location_name, city, country),
          receipt_location:place_of_receipt_location_id(unlocode, location_name, city, country),
          delivery_location:place_of_delivery_location_id(unlocode, location_name, city, country)
        `)
        .eq("booking_id", resolvedBookingId)
        .order("sequence_number"),
      supabase
        .from("booking_charges")
        .select("*")
        .eq("booking_id", resolvedBookingId),
      supabase
        .from("booking_instructions")
        .select("*")
        .eq("booking_id", resolvedBookingId),
      supabase
        .from("shipment_references")
        .select("reference_type, reference_value, is_primary")
        .eq("booking_id", resolvedBookingId),
      // Parties from shipment
      bookingRes2(),
      documentsRes2(),
    ]);

    // We need shipment_id to fetch parties and docs
    // Let's do it differently - sequential for dependent queries
    const booking = bookingRes.data;
    if (bookingRes.error) throw bookingRes.error;

    const sid = booking?.shipment_id;

    const [partiesResult, docsResult] = await Promise.all([
      sid
        ? supabase.from("shipment_parties").select("*").eq("shipment_id", sid)
        : Promise.resolve({ data: [] }),
      sid
        ? supabase.from("documents").select("id, doc_type, document_reference, status, created_at").eq("booking_id", resolvedBookingId)
        : Promise.resolve({ data: [] }),
    ]);

    const response = {
      booking,
      carrier: booking?.alc_carriers || null,
      shipment: booking?.shipments || null,
      equipments: equipmentsRes.data || [],
      cargo: cargoRes.data || [],
      transport_plan: transportRes.data || [],
      charges: chargesRes.data || [],
      instructions: instructionsRes.data || [],
      references: referencesRes.data || [],
      parties: partiesResult.data || [],
      documents: docsResult.data || [],
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("booking-detail error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Dummy placeholder functions to fix the parallel promise structure
function bookingRes2() { return Promise.resolve({ data: [] }); }
function documentsRes2() { return Promise.resolve({ data: [] }); }
