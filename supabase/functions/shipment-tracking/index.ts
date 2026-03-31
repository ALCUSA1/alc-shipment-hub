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
    const shipmentId = url.searchParams.get("shipment_id");
    const reference = url.searchParams.get("reference");

    if (!shipmentId && !reference) {
      return new Response(
        JSON.stringify({ error: "shipment_id or reference query param is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resolvedShipmentId = shipmentId;

    if (!resolvedShipmentId && reference) {
      const { data: ref } = await supabase
        .from("shipment_references")
        .select("shipment_id")
        .eq("reference_value", reference)
        .maybeSingle();
      if (ref) {
        resolvedShipmentId = ref.shipment_id;
      } else {
        const { data: ship } = await supabase
          .from("shipments")
          .select("id")
          .or(`booking_ref.eq.${reference},shipment_ref.eq.${reference}`)
          .maybeSingle();
        resolvedShipmentId = ship?.id || null;
      }
    }

    if (!resolvedShipmentId) {
      return new Response(
        JSON.stringify({ error: "Shipment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [
      shipmentRes,
      referencesRes,
      containersRes,
      eventsRes,
      transportCallsRes,
      documentsRes,
    ] = await Promise.all([
      supabase
        .from("shipments")
        .select(`
          id, shipment_ref, booking_ref, status, current_substatus,
          mode, origin_port, destination_port, etd, eta,
          vessel, voyage, carrier,
          primary_reference_type, primary_reference_value,
          alc_carrier_id,
          alc_carriers!shipments_alc_carrier_id_fkey(carrier_code, carrier_name)
        `)
        .eq("id", resolvedShipmentId)
        .single(),
      supabase
        .from("shipment_references")
        .select("reference_type, reference_value, is_primary, created_at")
        .eq("shipment_id", resolvedShipmentId)
        .order("is_primary", { ascending: false }),
      supabase
        .from("containers")
        .select(`
          id, container_number, container_type, container_size,
          iso_equipment_code, equipment_size_type, status,
          seal_number, tare_weight, vgm,
          container_seals(seal_number, seal_source)
        `)
        .eq("shipment_id", resolvedShipmentId),
      supabase
        .from("tracking_events")
        .select(`
          id, event_scope, milestone,
          external_event_code, external_event_name,
          internal_event_code, internal_event_name,
          event_classifier_code, event_date, event_created_datetime,
          location, location_id,
          vessel_id, transport_call_id,
          alc_locations:location_id(unlocode, location_name, city, country),
          alc_vessels:vessel_id(vessel_name, imo_number)
        `)
        .eq("shipment_id", resolvedShipmentId)
        .order("event_date", { ascending: true }),
      supabase
        .from("transport_calls")
        .select(`
          id, voyage_number, transport_call_sequence,
          facility_code, planned_arrival, planned_departure,
          actual_arrival, actual_departure,
          alc_locations:location_id(unlocode, location_name, city, country),
          alc_vessels:vessel_id(vessel_name, imo_number)
        `)
        .eq("shipment_id", resolvedShipmentId)
        .order("transport_call_sequence", { ascending: true }),
      supabase
        .from("documents")
        .select("id, doc_type, document_reference, status, file_url, created_at")
        .eq("shipment_id", resolvedShipmentId)
        .not("alc_carrier_id", "is", null),
    ]);

    if (shipmentRes.error) throw shipmentRes.error;

    const response = {
      shipment: shipmentRes.data,
      references: referencesRes.data || [],
      containers: containersRes.data || [],
      tracking_timeline: eventsRes.data || [],
      transport_calls: transportCallsRes.data || [],
      carrier_documents: documentsRes.data || [],
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("shipment-tracking error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
