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

/* ─── helpers ─── */

const pick = (obj: Record<string, any> | null | undefined, ...keys: string[]) => {
  if (!obj) return null;
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
    const snake = k.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (snake !== k && obj[snake] != null) return obj[snake];
  }
  return null;
};

/* ─── main handler ─── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { carrier_code, carrier_id: directCarrierId, message_type, external_reference, payload } = body;

    if (!payload) return json({ error: "payload is required" }, 400);

    // Resolve carrier
    let carrierId: string;
    if (directCarrierId) {
      carrierId = directCarrierId;
    } else if (carrier_code) {
      const { data: carrier } = await supabase
        .from("alc_carriers").select("id")
        .eq("carrier_code", carrier_code.toUpperCase()).maybeSingle();
      if (!carrier) return json({ error: `Unknown carrier: ${carrier_code}` }, 404);
      carrierId = carrier.id;
    } else {
      return json({ error: "carrier_code or carrier_id required" }, 400);
    }

    // 1 — save raw message
    const { data: rawMsg, error: rawErr } = await supabase
      .from("carrier_raw_messages")
      .insert({
        carrier_id: carrierId,
        source_channel: "api",
        message_family: "issuance",
        message_type: message_type || "issuance_response",
        external_reference: external_reference || pick(payload, "issuanceReference", "transportDocumentReference") || null,
        payload_format: "json",
        request_payload_json: payload,
        processing_status: "pending",
        received_at: new Date().toISOString(),
      })
      .select("id").single();
    if (rawErr) throw rawErr;
    const rawId = rawMsg.id;

    // 2 — create integration job
    const { data: job, error: jobErr } = await supabase
      .from("integration_jobs")
      .insert({
        raw_message_id: rawId,
        carrier_id: carrierId,
        job_type: "transform_issuance",
        job_status: "running",
        attempt_count: 1,
        started_at: new Date().toISOString(),
      })
      .select("id").single();
    if (jobErr) throw jobErr;

    // 3 — transform
    try {
      const result = await transformIssuance(carrierId, rawId, payload);

      await supabase.from("integration_jobs")
        .update({ job_status: "completed", completed_at: new Date().toISOString() })
        .eq("id", job.id);
      await supabase.from("carrier_raw_messages")
        .update({ processing_status: "processed", processed_at: new Date().toISOString() })
        .eq("id", rawId);

      return json({ success: true, raw_message_id: rawId, ...result });
    } catch (txErr: any) {
      await supabase.from("integration_jobs")
        .update({ job_status: "failed", last_error: txErr.message, completed_at: new Date().toISOString() })
        .eq("id", job.id);
      await supabase.from("carrier_raw_messages")
        .update({ processing_status: "error", error_message: txErr.message })
        .eq("id", rawId);
      throw txErr;
    }
  } catch (err: any) {
    console.error("issuance-ingest error:", err);
    return json({ error: err.message }, 500);
  }
});

/* ═══════════════════════════════════════════════
   Transform raw eBL issuance payload → ALC
   ═══════════════════════════════════════════════ */

async function transformIssuance(carrierId: string, rawId: string, p: Record<string, any>) {
  // ── Extract canonical issuance fields ──
  const issuanceRef = pick(p, "issuanceReference", "issuanceId");
  const issuanceStatus = pick(p, "issuanceStatus", "status") || "completed";
  const responseCode = pick(p, "issuanceResponseCode", "responseCode");
  const responseMessage = pick(p, "issuanceResponseMessage", "responseMessage", "reason");
  const ebillId = pick(p, "eBillIdentifier", "ebillIdentifier", "eBLIdentifier", "documentHash");
  const ebillPlatform = pick(p, "eBillPlatform", "ebillPlatform", "eBLPlatform", "platform", "solutionProviderName");
  const issuanceRequestedAt = pick(p, "issuanceRequestedAt", "requestedAt", "requestDateTime");
  const issuanceCompletedAt = pick(p, "issuanceCompletedAt", "completedAt", "responseDateTime");
  const issuerName = pick(p, "issuerName", "issuer", "carrierName");
  const receiverName = pick(p, "receiverName", "receiver", "shipperName");

  // Linked document references
  const tdRef = pick(p, "transportDocumentReference", "tdReference");
  const blNumber = pick(p, "billOfLadingNumber", "blNumber");
  const carrierBookingRef = pick(p, "carrierBookingReference", "carrierBookingNumber", "bookingNumber");
  const siRef = pick(p, "shippingInstructionReference");

  // ── Resolve linked records ──

  // Find transport document
  let tdId: string | null = null;
  if (tdRef) {
    const { data } = await supabase.from("transport_documents").select("id, shipment_id, booking_id, shipping_instruction_id")
      .eq("transport_document_reference", tdRef).eq("alc_carrier_id", carrierId).maybeSingle();
    if (data) tdId = data.id;
  }
  if (!tdId && blNumber) {
    const { data } = await supabase.from("transport_documents").select("id, shipment_id, booking_id, shipping_instruction_id")
      .eq("bill_of_lading_number", blNumber).eq("alc_carrier_id", carrierId).maybeSingle();
    if (data) tdId = data.id;
  }

  // Find booking
  let bookingId: string | null = null;
  if (carrierBookingRef) {
    const { data } = await supabase.from("bookings").select("id, shipment_id")
      .eq("carrier_booking_number", carrierBookingRef).eq("alc_carrier_id", carrierId).maybeSingle();
    bookingId = data?.id ?? null;
  }

  // Find shipping instruction
  let siId: string | null = null;
  if (siRef) {
    const { data } = await supabase.from("shipping_instructions").select("id")
      .eq("shipping_instruction_reference", siRef).eq("alc_carrier_id", carrierId).maybeSingle();
    siId = data?.id ?? null;
  }

  // Resolve shipment via linked records
  let shipmentId: string | null = null;
  if (tdId) {
    const { data } = await supabase.from("transport_documents").select("shipment_id").eq("id", tdId).maybeSingle();
    shipmentId = data?.shipment_id ?? null;
  }
  if (!shipmentId && bookingId) {
    const { data } = await supabase.from("bookings").select("shipment_id").eq("id", bookingId).maybeSingle();
    shipmentId = data?.shipment_id ?? null;
  }
  if (!shipmentId && blNumber) {
    const { data } = await supabase.from("shipment_references").select("shipment_id")
      .eq("reference_value", blNumber).eq("reference_type", "bill_of_lading").maybeSingle();
    shipmentId = data?.shipment_id ?? null;
  }

  // If no shipment found, create one
  if (!shipmentId) {
    const { data: newShip } = await supabase.from("shipments").insert({
      alc_carrier_id: carrierId,
      primary_reference_type: "issuance_reference",
      primary_reference_value: issuanceRef || ebillId || tdRef || blNumber,
      shipment_mode: "ocean",
      current_status: "documented",
      booking_id: bookingId,
      shipping_instruction_id: siId,
      transport_document_id: tdId,
    }).select("id").single();
    shipmentId = newShip?.id ?? null;
  }

  // Populate missing linked IDs from TD if available
  if (tdId && (!bookingId || !siId)) {
    const { data: td } = await supabase.from("transport_documents")
      .select("booking_id, shipping_instruction_id").eq("id", tdId).maybeSingle();
    if (td) {
      if (!bookingId) bookingId = td.booking_id;
      if (!siId) siId = td.shipping_instruction_id;
    }
  }

  // ── Normalize response code ──
  if (responseCode) {
    const { data: existing } = await supabase.from("issuance_response_codes")
      .select("id").eq("response_code", responseCode)
      .eq("alc_carrier_id", carrierId).maybeSingle();
    if (!existing) {
      await supabase.from("issuance_response_codes").insert({
        alc_carrier_id: carrierId,
        response_code: responseCode,
        response_name: pick(p, "issuanceResponseCodeName", "responseCodeName") || responseCode,
        response_description: pick(p, "issuanceResponseCodeDescription", "responseCodeDescription") || responseMessage,
        status_category: mapResponseCodeToCategory(responseCode, issuanceStatus),
        active: true,
      });
    }
  }

  // ── Create or update issuance_records ──
  let issuanceId: string | null = null;

  // Find existing by reference or eBill ID
  if (issuanceRef) {
    const { data } = await supabase.from("issuance_records").select("id")
      .eq("issuance_reference", issuanceRef).eq("alc_carrier_id", carrierId).maybeSingle();
    issuanceId = data?.id ?? null;
  }
  if (!issuanceId && ebillId) {
    const { data } = await supabase.from("issuance_records").select("id")
      .eq("ebill_identifier", ebillId).eq("alc_carrier_id", carrierId).maybeSingle();
    issuanceId = data?.id ?? null;
  }

  const issuanceData = {
    shipment_id: shipmentId,
    booking_id: bookingId,
    shipping_instruction_id: siId,
    transport_document_id: tdId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    issuance_reference: issuanceRef,
    issuance_status: issuanceStatus,
    issuance_response_code: responseCode,
    issuance_response_message: responseMessage,
    ebill_identifier: ebillId,
    ebill_platform: ebillPlatform,
    issuance_requested_at: issuanceRequestedAt,
    issuance_completed_at: issuanceCompletedAt,
    issuer_name: issuerName,
    receiver_name: receiverName,
  };

  if (issuanceId) {
    await supabase.from("issuance_records").update(issuanceData).eq("id", issuanceId);
  } else {
    const { data: newIss } = await supabase.from("issuance_records").insert(issuanceData).select("id").single();
    issuanceId = newIss?.id ?? null;
  }

  // Link issuance to shipment
  if (issuanceId && shipmentId) {
    await supabase.from("shipments").update({ issuance_id: issuanceId }).eq("id", shipmentId);
  }

  // ── References ──
  if (issuanceId) {
    const refs: any[] = [];
    if (issuanceRef) refs.push({ reference_type: "issuance_reference", reference_value: issuanceRef, is_primary: true });
    if (ebillId) refs.push({ reference_type: "ebill_identifier", reference_value: ebillId, is_primary: false });
    if (blNumber) refs.push({ reference_type: "bill_of_lading", reference_value: blNumber, is_primary: false });
    if (tdRef && tdRef !== blNumber) refs.push({ reference_type: "transport_document", reference_value: tdRef, is_primary: false });
    if (carrierBookingRef) refs.push({ reference_type: "booking_number", reference_value: carrierBookingRef, is_primary: false });
    if (siRef) refs.push({ reference_type: "shipping_instruction", reference_value: siRef, is_primary: false });

    if (refs.length) {
      await supabase.from("shipment_references").delete().eq("issuance_id", issuanceId);
      await supabase.from("shipment_references").insert(
        refs.map(r => ({
          ...r,
          shipment_id: shipmentId,
          booking_id: bookingId,
          shipping_instruction_id: siId,
          transport_document_id: tdId,
          issuance_id: issuanceId,
          alc_carrier_id: carrierId,
          source_message_id: rawId,
        }))
      );
    }
  }

  // ── Document record for the eBL ──
  if (issuanceId && shipmentId) {
    const { data: existingDoc } = await supabase.from("documents").select("id")
      .eq("issuance_id", issuanceId).eq("document_type", "electronic_bill_of_lading").maybeSingle();

    if (!existingDoc) {
      await supabase.from("documents").insert({
        shipment_id: shipmentId,
        booking_id: bookingId,
        shipping_instruction_id: siId,
        transport_document_id: tdId,
        issuance_id: issuanceId,
        alc_carrier_id: carrierId,
        source_message_id: rawId,
        document_type: "electronic_bill_of_lading",
        document_reference: ebillId || issuanceRef || blNumber,
        metadata_json: {
          ebill_platform: ebillPlatform,
          response_code: responseCode,
          issuer: issuerName,
          receiver: receiverName,
        },
      });
    } else {
      await supabase.from("documents").update({
        source_message_id: rawId,
        document_reference: ebillId || issuanceRef || blNumber,
        metadata_json: {
          ebill_platform: ebillPlatform,
          response_code: responseCode,
          issuer: issuerName,
          receiver: receiverName,
        },
      }).eq("id", existingDoc.id);
    }
  }

  return {
    issuance_id: issuanceId,
    shipment_id: shipmentId,
    transport_document_id: tdId,
    booking_id: bookingId,
    shipping_instruction_id: siId,
  };
}

/** Map response code patterns to a status category */
function mapResponseCodeToCategory(code: string, status: string): string {
  const upper = (code || "").toUpperCase();
  if (upper.includes("ISSU") || upper.includes("ACCEPTED") || upper === "COMPLETED") return "issued";
  if (upper.includes("PEND") || upper.includes("PROCESSING")) return "pending";
  if (upper.includes("REJECT") || upper.includes("FAIL") || upper.includes("ERROR")) return "rejected";
  if (upper.includes("SURR") || upper.includes("VOID")) return "void";
  // Fallback to status
  if (status === "completed" || status === "issued") return "issued";
  if (status === "rejected" || status === "failed") return "rejected";
  return "pending";
}
