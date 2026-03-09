import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * aes-webhook Edge Function
 *
 * Receives async responses from the AES filing provider:
 * - ITN received
 * - Filing accepted
 * - Filing rejected
 * - Fatal errors
 *
 * Updates customs_filings + customs_milestones accordingly.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for webhook processing (no user auth)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Validate webhook signature if provider sends one
    const webhookSecret = Deno.env.get("AES_WEBHOOK_SECRET");
    if (webhookSecret) {
      const signature = req.headers.get("x-aes-signature") || req.headers.get("x-webhook-signature");
      if (!signature || signature !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { event_type, filing_ref, itn, aes_citation, status, message, details } = body;

    if (!filing_ref && !body.filing_id) {
      return new Response(JSON.stringify({ error: "filing_ref or filing_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the filing — try by id first, then by broker_ref
    let filingQuery = supabase.from("customs_filings").select("id, shipment_id, user_id, status");
    if (body.filing_id) {
      filingQuery = filingQuery.eq("id", body.filing_id);
    } else {
      filingQuery = filingQuery.eq("broker_ref", filing_ref);
    }

    const { data: filings, error: lookupErr } = await filingQuery.limit(1);
    if (lookupErr || !filings || filings.length === 0) {
      return new Response(JSON.stringify({ error: "Filing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filing = filings[0];

    // Process based on event type
    const updateData: Record<string, any> = {};
    let milestoneLabel = "";
    let milestoneStatus = "completed";
    let milestoneNotes = "";

    switch (event_type) {
      case "itn_received":
        updateData.status = "itn_received";
        if (itn) updateData.itn = itn;
        if (aes_citation) updateData.aes_citation = aes_citation;
        milestoneLabel = "ITN Received";
        milestoneNotes = `ITN: ${itn || "—"}`;
        break;

      case "accepted":
        updateData.status = "accepted";
        if (itn && !filing.itn) updateData.itn = itn;
        if (aes_citation) updateData.aes_citation = aes_citation;
        milestoneLabel = "Filing Accepted";
        milestoneNotes = message || "AES filing accepted by US Customs";
        break;

      case "rejected":
        updateData.status = "rejected";
        milestoneLabel = "Filing Rejected";
        milestoneStatus = "error";
        milestoneNotes = message || details || "AES filing rejected — review and resubmit";
        break;

      case "fatal_error":
        updateData.status = "rejected";
        milestoneLabel = "Fatal Error";
        milestoneStatus = "error";
        milestoneNotes = message || "Fatal error during AES processing";
        break;

      default:
        milestoneLabel = event_type || "Unknown Event";
        milestoneNotes = message || JSON.stringify(body);
    }

    // Update filing
    if (Object.keys(updateData).length > 0) {
      await supabase.from("customs_filings").update(updateData).eq("id", filing.id);
    }

    // Log milestone
    if (milestoneLabel) {
      await supabase.from("customs_milestones").insert({
        filing_id: filing.id,
        milestone: milestoneLabel,
        status: milestoneStatus,
        notes: milestoneNotes,
      });
    }

    // Create notification for the user
    if (filing.user_id) {
      await supabase.from("notifications").insert({
        user_id: filing.user_id,
        type: "customs_update",
        title: `AES Filing: ${milestoneLabel}`,
        message: milestoneNotes,
        metadata: { filing_id: filing.id, shipment_id: filing.shipment_id, event_type },
      });
    }

    return new Response(JSON.stringify({ success: true, filing_id: filing.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("aes-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
