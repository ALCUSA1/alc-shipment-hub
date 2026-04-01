import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const pick = (obj: any, ...keys: string[]) => {
  if (!obj) return null;
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
    const snake = k.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (snake !== k && obj[snake] != null) return obj[snake];
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { carrier_code, carrier_id: directCarrierId, payload } = body;

    if (!payload) return json({ error: "payload is required" }, 400);

    // Resolve carrier
    let carrierId: string;
    if (directCarrierId) {
      carrierId = directCarrierId;
    } else if (carrier_code) {
      const { data: c } = await supabase.from("alc_carriers").select("id")
        .eq("carrier_code", carrier_code.toUpperCase()).maybeSingle();
      if (!c) return json({ error: `Unknown carrier: ${carrier_code}` }, 404);
      carrierId = c.id;
    } else {
      return json({ error: "carrier_code or carrier_id required" }, 400);
    }

    // ── 1. Store raw message ──
    const { data: rawMsg, error: rawErr } = await supabase
      .from("carrier_raw_messages")
      .insert({
        carrier_id: carrierId,
        source_channel: "webhook",
        message_family: "surrender",
        message_type: "surrender_callback",
        external_reference: pick(payload, "surrenderRequestReference", "transportDocumentReference"),
        payload_format: "json",
        request_payload_json: payload,
        processing_status: "pending",
        received_at: new Date().toISOString(),
      })
      .select("id").single();
    if (rawErr) throw rawErr;
    const rawId = rawMsg.id;

    // ── 2. Integration job ──
    const { data: job } = await supabase
      .from("integration_jobs")
      .insert({
        raw_message_id: rawId,
        carrier_id: carrierId,
        job_type: "transform_surrender_callback",
        job_status: "running",
        attempt_count: 1,
        started_at: new Date().toISOString(),
      })
      .select("id").single();

    // ── 3. Process callback ──
    try {
      const result = await processCallback(carrierId, rawId, payload);

      await supabase.from("integration_jobs")
        .update({ job_status: "completed", completed_at: new Date().toISOString() })
        .eq("id", job!.id);
      await supabase.from("carrier_raw_messages")
        .update({ processing_status: "processed", processed_at: new Date().toISOString() })
        .eq("id", rawId);

      return json({ success: true, raw_message_id: rawId, ...result });
    } catch (txErr: any) {
      await supabase.from("integration_jobs")
        .update({ job_status: "failed", last_error: txErr.message, completed_at: new Date().toISOString() })
        .eq("id", job!.id);
      await supabase.from("carrier_raw_messages")
        .update({ processing_status: "error", error_message: txErr.message })
        .eq("id", rawId);
      throw txErr;
    }
  } catch (err: any) {
    console.error("surrender-callback error:", err);
    return json({ error: err.message }, 500);
  }
});

async function processCallback(carrierId: string, rawId: string, p: any) {
  const surrenderRef = pick(p, "surrenderRequestReference", "surrenderReference");
  const tdRef = pick(p, "transportDocumentReference", "tdReference");
  const responseCode = pick(p, "surrenderRequestCode", "surrenderResponseCode", "responseCode");
  const responseMessage = pick(p, "reason", "responseMessage", "comments");
  const callbackAt = pick(p, "responseDateTime", "callbackDateTime") || new Date().toISOString();

  // ── Find existing surrender request ──
  let surrenderRequest: any = null;
  if (surrenderRef) {
    const { data } = await supabase.from("surrender_requests").select("*")
      .eq("surrender_request_reference", surrenderRef).eq("alc_carrier_id", carrierId).maybeSingle();
    surrenderRequest = data;
  }
  if (!surrenderRequest && tdRef) {
    const { data } = await supabase.from("surrender_requests").select("*")
      .eq("transport_document_reference", tdRef).eq("alc_carrier_id", carrierId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    surrenderRequest = data;
  }

  if (!surrenderRequest) {
    throw new Error(`No matching surrender request found for ref=${surrenderRef}, td_ref=${tdRef}`);
  }

  // ── Normalize response status ──
  const responseStatus = await resolveInternalStatus(carrierId, "surrender_response_code", responseCode, "pending");

  // ── Idempotent response upsert ──
  const { data: existing } = await supabase.from("surrender_responses").select("id")
    .eq("surrender_request_id", surrenderRequest.id)
    .eq("surrender_response_code", responseCode || "")
    .maybeSingle();

  const responseRow = {
    surrender_request_id: surrenderRequest.id,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    surrender_response_code: responseCode,
    surrender_response_message: responseMessage,
    response_status_internal: responseStatus,
    callback_received_at: callbackAt,
  };

  let responseId: string;
  if (existing) {
    await supabase.from("surrender_responses").update(responseRow).eq("id", existing.id);
    responseId = existing.id;
  } else {
    const { data } = await supabase.from("surrender_responses").insert(responseRow).select("id").single();
    responseId = data!.id;
  }

  // ── Update surrender request ──
  await supabase.from("surrender_requests").update({
    callback_received_at: callbackAt,
    surrender_status_internal: responseStatus,
    source_message_id: rawId,
  }).eq("id", surrenderRequest.id);

  // ── Handle errors in callback ──
  const errors = pick(p, "errors", "validationErrors") || [];
  if (Array.isArray(errors) && errors.length) {
    await supabase.from("surrender_errors").delete().eq("surrender_request_id", surrenderRequest.id).eq("source_message_id", rawId);
    await supabase.from("surrender_errors").insert(errors.map((e: any) => ({
      surrender_request_id: surrenderRequest.id,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      error_code: pick(e, "errorCode", "code"),
      property_name: pick(e, "propertyName", "field"),
      property_value: pick(e, "propertyValue", "value"),
      json_path: pick(e, "jsonPath", "path"),
      error_code_text: pick(e, "errorCodeText", "errorType"),
      error_message: pick(e, "errorMessage", "message") || JSON.stringify(e),
    })));
  }

  // ── Sync transport document status for switch-to-paper or delivery ──
  if (surrenderRequest.transport_document_id && ["accepted", "completed"].includes(responseStatus)) {
    const reqCode = (surrenderRequest.surrender_request_code || "").toUpperCase();
    if (reqCode === "SWTP" || (surrenderRequest.reason_code || "").toUpperCase() === "SWITCH") {
      await supabase.from("transport_documents")
        .update({ is_electronic: false })
        .eq("id", surrenderRequest.transport_document_id);
    }
  }

  return {
    surrender_request_id: surrenderRequest.id,
    surrender_response_id: responseId,
    response_status_internal: responseStatus,
  };
}

async function resolveInternalStatus(carrierId: string, codeType: string, code: string | null, fallback: string): Promise<string> {
  if (!code) return fallback;
  const { data: m } = await supabase.from("surrender_code_mappings")
    .select("internal_status")
    .eq("external_code", code.toUpperCase())
    .eq("code_type", codeType)
    .eq("active", true)
    .order("alc_carrier_id", { ascending: false, nullsFirst: false })
    .limit(1).maybeSingle();
  return m?.internal_status || fallback;
}
