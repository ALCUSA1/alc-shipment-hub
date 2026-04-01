import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const issuanceId = url.searchParams.get("issuance_id");
    const shipmentId = url.searchParams.get("shipment_id");
    const tdId = url.searchParams.get("transport_document_id");
    const ebillId = url.searchParams.get("ebill_identifier");

    let record: any = null;

    if (issuanceId) {
      const { data } = await supabase.from("issuance_records").select("*").eq("id", issuanceId).maybeSingle();
      record = data;
    } else if (ebillId) {
      const { data } = await supabase.from("issuance_records").select("*").eq("ebill_identifier", ebillId).maybeSingle();
      record = data;
    } else if (tdId) {
      const { data } = await supabase.from("issuance_records").select("*").eq("transport_document_id", tdId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      record = data;
    } else if (shipmentId) {
      const { data } = await supabase.from("issuance_records").select("*").eq("shipment_id", shipmentId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      record = data;
    }

    if (!record) {
      return new Response(JSON.stringify({ issuance_record: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch related data in parallel
    const [
      { data: carrier },
      { data: transportDoc },
      { data: responseCodeDef },
      { data: references },
      { data: documents },
      { data: errors },
      { data: statusMapping },
    ] = await Promise.all([
      record.alc_carrier_id ? supabase.from("alc_carriers").select("*").eq("id", record.alc_carrier_id).maybeSingle() : { data: null },
      record.transport_document_id ? supabase.from("transport_documents").select("transport_document_reference, bill_of_lading_number, transport_document_status, transport_document_type_code, issue_date, is_electronic").eq("id", record.transport_document_id).maybeSingle() : { data: null },
      record.issuance_response_code && record.alc_carrier_id ? supabase.from("issuance_response_codes").select("*").eq("response_code", record.issuance_response_code).eq("alc_carrier_id", record.alc_carrier_id).maybeSingle() : { data: null },
      supabase.from("shipment_references").select("*").eq("issuance_id", record.id),
      supabase.from("documents").select("*").eq("issuance_id", record.id),
      supabase.from("issuance_errors").select("*").eq("issuance_record_id", record.id).order("created_at"),
      record.issuance_response_code ? supabase.from("issuance_response_code_mappings").select("*").eq("external_response_code", record.issuance_response_code.toUpperCase()).eq("active", true).order("alc_carrier_id", { ascending: false, nullsFirst: false }).limit(1).maybeSingle() : { data: null },
    ]);

    // Fetch linked booking and SI references
    let booking: any = null;
    let shippingInstruction: any = null;
    if (record.booking_id) {
      const { data } = await supabase.from("bookings").select("carrier_booking_number, booking_status").eq("id", record.booking_id).maybeSingle();
      booking = data;
    }
    if (record.shipping_instruction_id) {
      const { data } = await supabase.from("shipping_instructions").select("shipping_instruction_reference, shipping_instruction_status").eq("id", record.shipping_instruction_id).maybeSingle();
      shippingInstruction = data;
    }

    return new Response(JSON.stringify({
      issuance_record: record,
      carrier,
      transport_document: transportDoc,
      response_code_definition: responseCodeDef,
      status_mapping: statusMapping,
      booking,
      shipping_instruction: shippingInstruction,
      references: references || [],
      documents: documents || [],
      errors: errors || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
