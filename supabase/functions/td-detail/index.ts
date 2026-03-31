import { createClient } from "npm:@supabase/supabase-js";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const tdId = url.searchParams.get("transport_document_id");
    const shipmentId = url.searchParams.get("shipment_id");
    const blNumber = url.searchParams.get("bl_number");

    let td: any = null;

    if (tdId) {
      const { data } = await supabase.from("transport_documents").select("*").eq("id", tdId).maybeSingle();
      td = data;
    } else if (blNumber) {
      const { data } = await supabase.from("transport_documents").select("*").eq("bill_of_lading_number", blNumber).maybeSingle();
      td = data;
    } else if (shipmentId) {
      const { data } = await supabase.from("transport_documents").select("*").eq("shipment_id", shipmentId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      td = data;
    }

    if (!td) {
      return new Response(JSON.stringify({ transport_document: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all related data in parallel
    const [
      { data: carrier },
      { data: issueLocation },
      { data: parties },
      { data: consignmentItems },
      { data: equipments },
      { data: charges },
      { data: instructions },
      { data: references },
      { data: transportPlan },
      { data: cargoDetails },
      { data: shippingInstruction },
    ] = await Promise.all([
      supabase.from("alc_carriers").select("*").eq("id", td.alc_carrier_id).maybeSingle(),
      td.issue_location_id ? supabase.from("alc_locations").select("*").eq("id", td.issue_location_id).maybeSingle() : { data: null },
      supabase.from("shipment_parties").select("*").eq("transport_document_id", td.id).order("party_role"),
      supabase.from("transport_document_consignment_items").select("*").eq("transport_document_id", td.id).order("consignment_item_number"),
      supabase.from("transport_document_equipments").select("*").eq("transport_document_id", td.id).order("container_number"),
      supabase.from("transport_document_charges").select("*").eq("transport_document_id", td.id),
      supabase.from("transport_document_instructions").select("*").eq("transport_document_id", td.id),
      supabase.from("shipment_references").select("*").eq("transport_document_id", td.id),
      supabase.from("transport_plans").select("*, load_loc:alc_locations!transport_plans_load_location_id_fkey(*), discharge_loc:alc_locations!transport_plans_discharge_location_id_fkey(*)").eq("transport_document_id", td.id).order("sequence_number"),
      supabase.from("cargo_details").select("*").eq("transport_document_id", td.id).order("cargo_line_number"),
      td.shipping_instruction_id ? supabase.from("shipping_instructions").select("*").eq("id", td.shipping_instruction_id).maybeSingle() : { data: null },
    ]);

    // Resolve route locations
    const locIds = [td.shipment_id].filter(Boolean);
    let routeLocations: any = {};
    if (td.shipment_id) {
      const { data: shipment } = await supabase.from("shipments").select("origin_location_id, pol_location_id, pod_location_id, destination_location_id").eq("id", td.shipment_id).maybeSingle();
      if (shipment) {
        const ids = [shipment.origin_location_id, shipment.pol_location_id, shipment.pod_location_id, shipment.destination_location_id].filter(Boolean);
        if (ids.length) {
          const { data: locs } = await supabase.from("alc_locations").select("*").in("id", ids);
          const locMap = Object.fromEntries((locs || []).map((l: any) => [l.id, l]));
          routeLocations = {
            origin: locMap[shipment.origin_location_id] || null,
            pol: locMap[shipment.pol_location_id] || null,
            pod: locMap[shipment.pod_location_id] || null,
            destination: locMap[shipment.destination_location_id] || null,
          };
        }
      }
    }

    return new Response(JSON.stringify({
      transport_document: td,
      carrier,
      issue_location: issueLocation,
      shipping_instruction: shippingInstruction,
      parties: parties || [],
      consignment_items: consignmentItems || [],
      equipments: equipments || [],
      charges: charges || [],
      instructions: instructions || [],
      references: references || [],
      transport_plan: transportPlan || [],
      cargo_details: cargoDetails || [],
      route_locations: routeLocations,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
