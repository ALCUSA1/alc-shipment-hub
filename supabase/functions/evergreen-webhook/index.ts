import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const EVERGREEN_CARRIER_CODE = "EGLV";

// ─── Bearer token validation ───
function validateBearerToken(req: Request): boolean {
  const secret = Deno.env.get("EVERGREEN_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[evergreen-webhook] EVERGREEN_WEBHOOK_SECRET not configured");
    return false;
  }
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  // Constant-time comparison
  if (token.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Idempotency: generate stable key from payload ───
function deriveIdempotencyKey(payload: any): string | null {
  const explicit = payload.idempotency_key || payload.idempotencyKey || payload.messageId || payload.message_id;
  if (explicit) return String(explicit);

  const ref = payload.bookingReference || payload.booking_number
    || payload.transportDocumentReference || payload.bill_of_lading
    || payload.equipmentReference || payload.container_number;
  const eventId = payload.eventID || payload.event_id || payload.eventCreatedDateTime;
  if (ref && eventId) return `${ref}::${eventId}`;

  return null;
}

// ─── Detect message family from payload ───
function detectMessageFamily(payload: any): { family: string; type: string } {
  if (payload.messageType || payload.message_type) {
    const mt = (payload.messageType || payload.message_type).toLowerCase();
    if (mt.includes("track") || mt.includes("event")) return { family: "tracking", type: "event" };
    if (mt.includes("book")) return { family: "booking", type: "confirmation" };
    if (mt.includes("issu")) return { family: "issuance", type: "response" };
    if (mt.includes("transport_doc") || mt.includes("bl")) return { family: "transport_document", type: "update" };
    if (mt.includes("schedule")) return { family: "commercial_schedule", type: "update" };
    return { family: mt, type: "webhook" };
  }

  if (payload.events || payload.eventType || payload.eventClassifierCode) return { family: "tracking", type: "event" };
  if (payload.bookingStatus || payload.carrierBookingReference) return { family: "booking", type: "confirmation" };
  if (payload.issuanceResponseCode) return { family: "issuance", type: "response" };
  if (payload.transportDocumentReference || payload.shippingInstructionReference) return { family: "transport_document", type: "update" };

  return { family: "unknown", type: "webhook" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Validate Bearer token ──
  if (!validateBearerToken(req)) {
    console.warn("[evergreen-webhook] Unauthorized request rejected");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const rawBody = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { raw_edi: rawBody };
    }

    const isEdi = !!payload.raw_edi;
    const payloadFormat = isEdi ? "edi" : "json";

    // ── Resolve Evergreen carrier ──
    const { data: carrier } = await supabase
      .from("alc_carriers")
      .select("id")
      .eq("carrier_code", EVERGREEN_CARRIER_CODE)
      .single();

    if (!carrier) {
      return new Response(
        JSON.stringify({ error: "Evergreen carrier not registered" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Idempotency check ──
    const idempotencyKey = deriveIdempotencyKey(payload);
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("carrier_raw_messages")
        .select("id")
        .eq("carrier_id", carrier.id)
        .eq("external_reference", idempotencyKey)
        .eq("source_channel", "webhook")
        .maybeSingle();

      if (existing) {
        console.log(`[evergreen-webhook] Duplicate skipped: ${idempotencyKey}`);
        return new Response(
          JSON.stringify({ status: "duplicate", raw_message_id: existing.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Detect message type ──
    const { family, type } = detectMessageFamily(payload);

    // ── Store raw payload ──
    const { data: rawMsg, error: rawErr } = await supabase
      .from("carrier_raw_messages")
      .insert({
        carrier_id: carrier.id,
        source_channel: "webhook",
        message_family: family,
        message_type: type,
        external_reference: idempotencyKey || null,
        payload_format: payloadFormat,
        request_payload_json: isEdi ? null : payload,
        response_payload_json: isEdi ? { raw_edi: rawBody } : null,
        headers_json: Object.fromEntries(req.headers.entries()),
        http_status: null,
        processing_status: "pending",
      })
      .select("id")
      .single();

    if (rawErr) throw rawErr;

    console.log(`[evergreen-webhook] Stored raw message: ${rawMsg.id} (${family}/${type})`);

    // ── Create integration job ──
    const { data: job } = await supabase
      .from("integration_jobs")
      .insert({
        raw_message_id: rawMsg.id,
        carrier_id: carrier.id,
        job_type: `transform_${family}_${type}`,
        job_status: "pending",
      })
      .select("id")
      .single();

    // ── Trigger transformation (fire-and-forget) ──
    if (!isEdi) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/carrier-ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          carrier_code: EVERGREEN_CARRIER_CODE,
          message_family: family,
          message_type: type,
          external_reference: idempotencyKey,
          source_channel: "webhook",
          response_payload: payload,
        }),
      }).catch((e) => console.error("[evergreen-webhook] ingest trigger error:", e));
    }

    // ── Return 200 immediately ──
    return new Response(
      JSON.stringify({
        status: "accepted",
        raw_message_id: rawMsg.id,
        job_id: job?.id || null,
        message_family: family,
        message_type: type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[evergreen-webhook] error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
