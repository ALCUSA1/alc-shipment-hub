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

    // ── Resolve carrier ──
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
        source_channel: "api",
        message_family: "surrender",
        message_type: "surrender_request",
        external_reference: pick(payload, "surrenderRequestReference", "transportDocumentReference") || null,
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
        job_type: "transform_surrender_request",
        job_status: "running",
        attempt_count: 1,
        started_at: new Date().toISOString(),
      })
      .select("id").single();

    // ── 3. Transform ──
    try {
      const result = await transformSurrenderRequest(carrierId, rawId, payload);

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
    console.error("surrender-submit error:", err);
    return json({ error: err.message }, 500);
  }
});

/* ═══════════════════════════════════════════════
   Transform surrender request payload → ALC
   ═══════════════════════════════════════════════ */

async function transformSurrenderRequest(carrierId: string, rawId: string, p: any) {
  const surrenderRef = pick(p, "surrenderRequestReference", "surrenderReference");
  const tdRef = pick(p, "transportDocumentReference", "tdReference");
  const tdSubRef = pick(p, "transportDocumentSubReference");
  const requestCode = pick(p, "surrenderRequestCode", "requestCode");
  const reasonCode = pick(p, "reasonCode", "surrenderReasonCode");
  const comments = pick(p, "comments", "reason", "surrenderComments");
  const submittedAt = pick(p, "requestSubmittedAt", "submittedAt", "createdDateTime") || new Date().toISOString();

  // ── Resolve linked records ──
  let tdId: string | null = null;
  let shipmentId: string | null = null;
  let bookingId: string | null = null;
  let siId: string | null = null;
  let issuanceId: string | null = null;

  if (tdRef) {
    const { data } = await supabase.from("transport_documents")
      .select("id, shipment_id, booking_id, shipping_instruction_id")
      .eq("transport_document_reference", tdRef).eq("alc_carrier_id", carrierId).maybeSingle();
    if (data) {
      tdId = data.id;
      shipmentId = data.shipment_id;
      bookingId = data.booking_id;
      siId = data.shipping_instruction_id;
    }
  }

  // Resolve issuance from TD
  if (tdId) {
    const { data } = await supabase.from("issuance_records")
      .select("id").eq("transport_document_id", tdId).eq("alc_carrier_id", carrierId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    issuanceId = data?.id ?? null;
  }

  // Resolve shipment from booking if not found
  if (!shipmentId && bookingId) {
    const { data } = await supabase.from("bookings").select("shipment_id").eq("id", bookingId).maybeSingle();
    shipmentId = data?.shipment_id ?? null;
  }

  // ── Normalize status ──
  const statusInternal = await resolveInternalStatus(carrierId, "surrender_request_code", requestCode, "submitted");

  // ── Idempotent upsert ──
  let surrenderId: string | null = null;
  if (surrenderRef) {
    const { data } = await supabase.from("surrender_requests").select("id")
      .eq("surrender_request_reference", surrenderRef).eq("alc_carrier_id", carrierId).maybeSingle();
    surrenderId = data?.id ?? null;
  }

  const row = {
    shipment_id: shipmentId,
    booking_id: bookingId,
    shipping_instruction_id: siId,
    transport_document_id: tdId,
    issuance_id: issuanceId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    surrender_request_reference: surrenderRef,
    transport_document_reference: tdRef,
    transport_document_sub_reference: tdSubRef,
    surrender_request_code: requestCode,
    reason_code: reasonCode,
    comments,
    surrender_status_internal: statusInternal,
    request_submitted_at: submittedAt,
  };

  if (surrenderId) {
    await supabase.from("surrender_requests").update(row).eq("id", surrenderId);
  } else {
    const { data } = await supabase.from("surrender_requests").insert(row).select("id").single();
    surrenderId = data?.id ?? null;
  }

  // ── Endorsement chain ──
  const chain = pick(p, "endorsementChain", "endorsement_chain") || [];
  if (Array.isArray(chain) && chain.length && surrenderId) {
    await supabase.from("surrender_endorsement_chain").delete().eq("surrender_request_id", surrenderId);

    const rows = chain.map((e: any, i: number) => {
      const actor = pick(e, "actor", "actionParty") || {};
      const recipient = pick(e, "recipient", "recipientParty") || {};
      const actorTax = pick(actor, "taxReference", "taxRef") || {};
      const recipientTax = pick(recipient, "taxReference", "taxRef") || {};

      return {
        surrender_request_id: surrenderId,
        alc_carrier_id: carrierId,
        source_message_id: rawId,
        sequence_number: pick(e, "sequenceNumber", "sequence") ?? i,
        action_datetime: pick(e, "actionDateTime", "actionDate", "timestamp"),
        action_code: pick(e, "actionCode", "action"),
        actor_ebl_platform: pick(actor, "eblPlatform", "eBLPlatform", "platform"),
        actor_party_name: pick(actor, "partyName", "name"),
        actor_party_code: pick(actor, "partyCode", "code"),
        actor_code_list_provider: pick(actor, "codeListProvider"),
        actor_code_list_name: pick(actor, "codeListName"),
        actor_tax_reference_type: pick(actorTax, "type", "taxReferenceType"),
        actor_tax_reference_country: pick(actorTax, "countryCode", "country"),
        actor_tax_reference_value: pick(actorTax, "value", "referenceValue"),
        recipient_ebl_platform: pick(recipient, "eblPlatform", "eBLPlatform", "platform"),
        recipient_party_name: pick(recipient, "partyName", "name"),
        recipient_party_code: pick(recipient, "partyCode", "code"),
        recipient_code_list_provider: pick(recipient, "codeListProvider"),
        recipient_code_list_name: pick(recipient, "codeListName"),
        recipient_tax_reference_type: pick(recipientTax, "type", "taxReferenceType"),
        recipient_tax_reference_country: pick(recipientTax, "countryCode", "country"),
        recipient_tax_reference_value: pick(recipientTax, "value", "referenceValue"),
      };
    });

    await supabase.from("surrender_endorsement_chain").insert(rows);
  }

  // ── Handle submission errors ──
  const errors = pick(p, "errors", "validationErrors", "errorList") || [];
  if (Array.isArray(errors) && errors.length && surrenderId) {
    await supabase.from("surrender_errors").delete().eq("surrender_request_id", surrenderId);

    const errRows = errors.map((e: any) => ({
      surrender_request_id: surrenderId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      error_code: pick(e, "errorCode", "code"),
      property_name: pick(e, "propertyName", "field"),
      property_value: pick(e, "propertyValue", "value"),
      json_path: pick(e, "jsonPath", "path"),
      error_code_text: pick(e, "errorCodeText", "errorType"),
      error_message: pick(e, "errorMessage", "message", "reason") || (typeof e === "string" ? e : JSON.stringify(e)),
    }));

    await supabase.from("surrender_errors").insert(errRows);

    // Mark as failed
    await supabase.from("surrender_requests")
      .update({ surrender_status_internal: "submission_failed" })
      .eq("id", surrenderId);
  }

  return {
    surrender_request_id: surrenderId,
    shipment_id: shipmentId,
    transport_document_id: tdId,
    surrender_status_internal: statusInternal,
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
