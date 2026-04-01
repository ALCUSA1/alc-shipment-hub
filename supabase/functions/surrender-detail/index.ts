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
    const surrenderId = url.searchParams.get("surrender_id");
    const shipmentId = url.searchParams.get("shipment_id");
    const tdId = url.searchParams.get("transport_document_id");

    // ── Fetch surrender requests ──
    let requests: any[] = [];

    if (surrenderId) {
      const { data } = await supabase.from("surrender_requests").select("*").eq("id", surrenderId);
      requests = data || [];
    } else if (tdId) {
      const { data } = await supabase.from("surrender_requests").select("*")
        .eq("transport_document_id", tdId).order("created_at", { ascending: false });
      requests = data || [];
    } else if (shipmentId) {
      const { data } = await supabase.from("surrender_requests").select("*")
        .eq("shipment_id", shipmentId).order("created_at", { ascending: false });
      requests = data || [];
    }

    if (!requests.length) {
      return new Response(JSON.stringify({ surrender_requests: [], carrier: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Enrich each request ──
    const enriched = await Promise.all(requests.map(async (sr: any) => {
      const [
        { data: chain },
        { data: responses },
        { data: errors },
        { data: codeMappings },
      ] = await Promise.all([
        supabase.from("surrender_endorsement_chain").select("*")
          .eq("surrender_request_id", sr.id).order("sequence_number"),
        supabase.from("surrender_responses").select("*")
          .eq("surrender_request_id", sr.id).order("created_at", { ascending: false }),
        supabase.from("surrender_errors").select("*")
          .eq("surrender_request_id", sr.id).order("created_at"),
        supabase.from("surrender_code_mappings").select("*")
          .eq("external_code", (sr.surrender_request_code || "").toUpperCase())
          .eq("code_type", "surrender_request_code")
          .eq("active", true)
          .order("alc_carrier_id", { ascending: false, nullsFirst: false })
          .limit(1),
      ]);

      return {
        ...sr,
        endorsement_chain: chain || [],
        responses: responses || [],
        errors: errors || [],
        code_mapping: codeMappings?.[0] || null,
      };
    }));

    // ── Carrier info ──
    let carrier: any = null;
    if (requests[0]?.alc_carrier_id) {
      const { data } = await supabase.from("alc_carriers").select("*")
        .eq("id", requests[0].alc_carrier_id).maybeSingle();
      carrier = data;
    }

    // ── Linked records ──
    let transportDoc: any = null;
    let booking: any = null;
    let issuance: any = null;

    if (requests[0]?.transport_document_id) {
      const { data } = await supabase.from("transport_documents")
        .select("transport_document_reference, bill_of_lading_number, transport_document_status, is_electronic")
        .eq("id", requests[0].transport_document_id).maybeSingle();
      transportDoc = data;
    }
    if (requests[0]?.booking_id) {
      const { data } = await supabase.from("bookings")
        .select("carrier_booking_number, booking_status")
        .eq("id", requests[0].booking_id).maybeSingle();
      booking = data;
    }
    if (requests[0]?.issuance_id) {
      const { data } = await supabase.from("issuance_records")
        .select("issuance_reference, issuance_status_internal, ebill_platform")
        .eq("id", requests[0].issuance_id).maybeSingle();
      issuance = data;
    }

    return new Response(JSON.stringify({
      surrender_requests: enriched,
      carrier,
      transport_document: transportDoc,
      booking,
      issuance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
