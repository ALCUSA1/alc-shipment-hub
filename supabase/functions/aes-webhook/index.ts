import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * aes-webhook Edge Function
 *
 * Receives async responses from ZeusLogics AES filing:
 * - ITN received
 * - Filing accepted
 * - Filing rejected
 * - Fatal errors
 *
 * Also supports Terminal49 tracking webhooks for container events.
 *
 * Updates customs_filings + customs_milestones accordingly.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // ─── Terminal49 Webhook Handler ─────────────────────────────────────
    if (body.data?.type === "webhook" || body.data?.type === "event" || body.included) {
      return await handleTerminal49Webhook(supabase, body, req);
    }

    // ─── ZeusLogics AES Webhook Handler ─────────────────────────────────
    // Validate webhook signature
    const webhookSecret = Deno.env.get("ZEUSLOGICS_WEBHOOK_SECRET") || Deno.env.get("AES_WEBHOOK_SECRET");
    if (webhookSecret) {
      const signature = req.headers.get("x-zeuslogics-signature") || req.headers.get("x-aes-signature") || req.headers.get("x-webhook-signature");
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

    // Look up the filing
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
        milestoneNotes = `ITN: ${itn || "—"} (via ZeusLogics)`;
        break;

      case "accepted":
        updateData.status = "accepted";
        if (itn && !filing.itn) updateData.itn = itn;
        if (aes_citation) updateData.aes_citation = aes_citation;
        milestoneLabel = "Filing Accepted";
        milestoneNotes = message || "AES filing accepted by US Customs (via ZeusLogics)";
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

    if (Object.keys(updateData).length > 0) {
      await supabase.from("customs_filings").update(updateData).eq("id", filing.id);
    }

    if (milestoneLabel) {
      await supabase.from("customs_milestones").insert({
        filing_id: filing.id,
        milestone: milestoneLabel,
        status: milestoneStatus,
        notes: milestoneNotes,
      });
    }

    if (filing.user_id) {
      await supabase.from("notifications").insert({
        user_id: filing.user_id,
        type: "customs_update",
        title: `AES Filing: ${milestoneLabel}`,
        message: milestoneNotes,
        metadata: { filing_id: filing.id, shipment_id: filing.shipment_id, event_type, provider: "zeuslogics" },
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

// ─── Terminal49 Webhook Handler ─────────────────────────────────────────────

async function handleTerminal49Webhook(supabase: any, body: any, req?: Request) {
  try {
    const webhookSecret = Deno.env.get("TERMINAL49_WEBHOOK_SECRET");
    if (webhookSecret) {
      const signature =
        req?.headers.get("x-terminal49-signature") ||
        req?.headers.get("x-terminal49-hmac-sha256") ||
        req?.headers.get("x-webhook-signature");
      if (!signature || signature !== webhookSecret) {
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.warn("TERMINAL49_WEBHOOK_SECRET not configured — rejecting webhook");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Terminal49 sends events via JSON:API format
    const eventData = body.data?.attributes || body.data || {};
    const eventType = eventData.event || body.data?.type || "";
    const containerNumber = eventData.container_number || "";

    console.log(`📦 Terminal49 webhook: ${eventType} for ${containerNumber}`);

    // Find the shipment by container number
    if (containerNumber) {
      const { data: containers } = await supabase
        .from("containers")
        .select("shipment_id")
        .eq("container_number", containerNumber)
        .limit(1);

      if (containers && containers.length > 0) {
        const shipmentId = containers[0].shipment_id;

        // Map Terminal49 event to milestone
        const milestoneMap: Record<string, string> = {
          "container.transport.vessel_departed": "Vessel Departed",
          "container.transport.vessel_arrived": "Port Arrival",
          "container.transport.vessel_loaded": "Container Loaded",
          "container.transport.vessel_discharged": "Container Discharged",
          "container.transport.full_in": "Cargo Received at Origin",
          "container.transport.gate_out_full": "Gate Out",
          "container.transport.empty_out": "Container Returned",
          "shipment.eta.changed": "ETA Updated",
        };

        const milestone = milestoneMap[eventType] || eventType;

        // Insert tracking event
        await supabase.from("tracking_events").insert({
          shipment_id: shipmentId,
          milestone,
          location: eventData.location || eventData.facility || null,
          event_date: eventData.timestamp || new Date().toISOString(),
          notes: eventData.description || `Terminal49: ${eventType}`,
          source: "terminal49",
          raw_event_code: eventType,
        });

        // Update ETA if provided
        if (eventData.pod_eta) {
          await supabase.from("shipments").update({ eta: eventData.pod_eta }).eq("id", shipmentId);
        }

        // Auto-advance status
        const statusMap: Record<string, string> = {
          "Container Loaded": "cargo_received",
          "Vessel Departed": "in_transit",
          "Port Arrival": "arrived",
          "Container Discharged": "arrived",
          "Gate Out": "delivered",
        };

        const newStatus = statusMap[milestone];
        if (newStatus) {
          await supabase.from("shipments").update({ status: newStatus }).eq("id", shipmentId);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Terminal49 webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
