import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      carrier_code,
      message_family,
      message_type,
      external_reference,
      source_channel = "api",
      payload_format = "json",
      request_payload,
      response_payload,
      headers: reqHeaders,
      http_status,
    } = body;

    if (!carrier_code || !message_family || !message_type) {
      return new Response(
        JSON.stringify({ error: "carrier_code, message_family, and message_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 1: Resolve carrier ──
    const { data: carrier, error: carrierErr } = await supabase
      .from("alc_carriers")
      .select("id")
      .eq("carrier_code", carrier_code)
      .single();

    if (carrierErr || !carrier) {
      return new Response(
        JSON.stringify({ error: `Carrier not found: ${carrier_code}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 2: Store raw message (untouched) ──
    const { data: rawMsg, error: rawErr } = await supabase
      .from("carrier_raw_messages")
      .insert({
        carrier_id: carrier.id,
        source_channel,
        message_family,
        message_type,
        external_reference: external_reference || null,
        payload_format,
        request_payload_json: request_payload || null,
        response_payload_json: response_payload || null,
        headers_json: reqHeaders || null,
        http_status: http_status || null,
        processing_status: "pending",
      })
      .select("id")
      .single();

    if (rawErr) throw rawErr;

    // ── Step 3: Create integration job for transformation ──
    const { data: job, error: jobErr } = await supabase
      .from("integration_jobs")
      .insert({
        raw_message_id: rawMsg.id,
        carrier_id: carrier.id,
        job_type: `transform_${message_family}_${message_type}`,
        job_status: "pending",
      })
      .select("id")
      .single();

    if (jobErr) throw jobErr;

    // ── Step 4: Transform into normalized records ──
    const transformResult = await transformPayload({
      carrierId: carrier.id,
      carrierCode: carrier_code,
      rawMessageId: rawMsg.id,
      jobId: job.id,
      messageFamily: message_family,
      messageType: message_type,
      payload: response_payload || request_payload,
    });

    // ── Step 5: Mark job complete ──
    await supabase
      .from("integration_jobs")
      .update({
        job_status: transformResult.success ? "completed" : "failed",
        last_error: transformResult.error || null,
        attempt_count: 1,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // Mark raw message as processed
    await supabase
      .from("carrier_raw_messages")
      .update({
        processing_status: transformResult.success ? "processed" : "error",
        error_message: transformResult.error || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", rawMsg.id);

    return new Response(
      JSON.stringify({
        raw_message_id: rawMsg.id,
        job_id: job.id,
        status: transformResult.success ? "processed" : "failed",
        records_created: transformResult.recordsCreated || 0,
        error: transformResult.error || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("carrier-ingest error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================
// TRANSFORMATION LAYER
// Converts raw carrier payloads into normalized ALC records
// ============================================================
interface TransformInput {
  carrierId: string;
  carrierCode: string;
  rawMessageId: string;
  jobId: string;
  messageFamily: string;
  messageType: string;
  payload: any;
}

interface TransformResult {
  success: boolean;
  recordsCreated: number;
  error?: string;
}

async function transformPayload(input: TransformInput): Promise<TransformResult> {
  try {
    const { messageFamily, messageType } = input;

    if (messageFamily === "tracking" && messageType === "event") {
      return await transformTrackingEvent(input);
    }
    if (messageFamily === "booking" && messageType === "confirmation") {
      return await transformBookingConfirmation(input);
    }
    if (messageFamily === "document" && messageType === "release") {
      return await transformDocumentRelease(input);
    }
    if (messageFamily === "schedule" && messageType === "vessel") {
      return await transformVesselSchedule(input);
    }

    // Unknown message type – store raw but skip transformation
    return { success: true, recordsCreated: 0 };
  } catch (err: any) {
    return { success: false, recordsCreated: 0, error: err.message };
  }
}

// ── Tracking Event Transformer ──
async function transformTrackingEvent(input: TransformInput): Promise<TransformResult> {
  const { carrierId, rawMessageId, payload } = input;
  if (!payload) return { success: true, recordsCreated: 0 };

  const events = Array.isArray(payload.events) ? payload.events : [payload];
  let created = 0;

  // Resolve event mapping
  const { data: mappings } = await supabase
    .from("carrier_event_mappings")
    .select("*")
    .eq("carrier_id", carrierId)
    .eq("message_family", "tracking")
    .eq("active", true);

  const mappingLookup = new Map(
    (mappings || []).map((m: any) => [m.external_code, m])
  );

  for (const evt of events) {
    const mapping = mappingLookup.get(evt.event_code || evt.eventCode);

    // Resolve or create location
    let locationId: string | null = null;
    const locCode = evt.unlocode || evt.location_code || evt.facilityCode;
    if (locCode) {
      const { data: loc } = await supabase
        .from("alc_locations")
        .select("id")
        .eq("unlocode", locCode)
        .maybeSingle();

      if (loc) {
        locationId = loc.id;
      } else {
        const { data: newLoc } = await supabase
          .from("alc_locations")
          .insert({ unlocode: locCode, location_name: evt.location_name || locCode })
          .select("id")
          .single();
        locationId = newLoc?.id || null;
      }
    }

    // Find shipment by reference
    const refValue = evt.booking_number || evt.bill_of_lading || evt.container_number || evt.shipmentReference;
    let shipmentId: string | null = null;
    if (refValue) {
      const { data: ref } = await supabase
        .from("shipment_references")
        .select("shipment_id")
        .eq("reference_value", refValue)
        .maybeSingle();
      shipmentId = ref?.shipment_id || null;
    }

    // Find container
    let containerId: string | null = null;
    const containerNum = evt.container_number || evt.equipmentReference;
    if (containerNum && shipmentId) {
      const { data: ctn } = await supabase
        .from("containers")
        .select("id")
        .eq("shipment_id", shipmentId)
        .eq("container_number", containerNum)
        .maybeSingle();
      containerId = ctn?.id || null;
    }

    await supabase.from("tracking_events").insert({
      shipment_id: shipmentId,
      container_id: containerId,
      alc_carrier_id: carrierId,
      raw_message_id: rawMessageId,
      event_scope: evt.event_scope || (containerNum ? "equipment" : "shipment"),
      external_event_code: evt.event_code || evt.eventCode || null,
      external_event_name: evt.event_name || evt.eventName || null,
      internal_event_code: mapping?.internal_code || null,
      internal_event_name: mapping?.internal_name || null,
      event_classifier_code: evt.event_classifier || null,
      event_created_datetime: evt.event_created_datetime || null,
      event_date: evt.event_datetime || evt.eventDateTime || new Date().toISOString(),
      milestone: mapping?.internal_name || evt.event_name || evt.eventName || "Unknown",
      location: evt.location_name || locCode || null,
      location_id: locationId,
      source: `carrier:${input.carrierCode}`,
      event_payload_json: evt,
    });
    created++;
  }

  return { success: true, recordsCreated: created };
}

// ── Booking Confirmation Transformer ──
async function transformBookingConfirmation(input: TransformInput): Promise<TransformResult> {
  const { carrierId, rawMessageId, payload } = input;
  if (!payload) return { success: true, recordsCreated: 0 };

  let created = 0;
  const bookingNum = payload.booking_number || payload.bookingReference;
  if (!bookingNum) return { success: true, recordsCreated: 0 };

  // Check if shipment with this reference exists
  const { data: existingRef } = await supabase
    .from("shipment_references")
    .select("shipment_id")
    .eq("reference_value", bookingNum)
    .eq("reference_type", "booking_number")
    .maybeSingle();

  if (existingRef) {
    // Update shipment with carrier info
    await supabase
      .from("shipments")
      .update({
        alc_carrier_id: carrierId,
        primary_reference_type: "booking_number",
        primary_reference_value: bookingNum,
      })
      .eq("id", existingRef.shipment_id);
    return { success: true, recordsCreated: 0 };
  }

  // Store references if shipment exists by booking_ref
  const { data: shipment } = await supabase
    .from("shipments")
    .select("id")
    .eq("booking_ref", bookingNum)
    .maybeSingle();

  if (shipment) {
    const refs = [
      { reference_type: "booking_number", reference_value: bookingNum, is_primary: true },
    ];
    if (payload.bill_of_lading) {
      refs.push({ reference_type: "bill_of_lading", reference_value: payload.bill_of_lading, is_primary: false });
    }
    for (const ref of refs) {
      await supabase.from("shipment_references").insert({
        shipment_id: shipment.id,
        carrier_id: carrierId,
        ...ref,
        source_message_id: rawMessageId,
      });
      created++;
    }

    await supabase
      .from("shipments")
      .update({
        alc_carrier_id: carrierId,
        primary_reference_type: "booking_number",
        primary_reference_value: bookingNum,
      })
      .eq("id", shipment.id);
  }

  return { success: true, recordsCreated: created };
}

// ── Document Release Transformer ──
async function transformDocumentRelease(input: TransformInput): Promise<TransformResult> {
  const { carrierId, rawMessageId, payload } = input;
  if (!payload) return { success: true, recordsCreated: 0 };

  const refValue = payload.booking_number || payload.bill_of_lading;
  if (!refValue) return { success: true, recordsCreated: 0 };

  const { data: ref } = await supabase
    .from("shipment_references")
    .select("shipment_id")
    .eq("reference_value", refValue)
    .maybeSingle();

  if (!ref) return { success: true, recordsCreated: 0 };

  const { data: ship } = await supabase
    .from("shipments")
    .select("user_id")
    .eq("id", ref.shipment_id)
    .single();

  await supabase.from("documents").insert({
    shipment_id: ref.shipment_id,
    user_id: ship?.user_id,
    alc_carrier_id: carrierId,
    doc_type: payload.document_type || "carrier_document",
    document_reference: payload.document_reference || null,
    source_message_id: rawMessageId,
    metadata_json: payload.metadata || null,
    status: "available",
    file_url: payload.download_url || "",
  });

  return { success: true, recordsCreated: 1 };
}

// ── Vessel Schedule Transformer ──
async function transformVesselSchedule(input: TransformInput): Promise<TransformResult> {
  const { carrierId, payload } = input;
  if (!payload) return { success: true, recordsCreated: 0 };

  let created = 0;

  // Upsert vessel
  const vesselName = payload.vessel_name || payload.vesselName;
  const imoNumber = payload.imo_number || payload.imoNumber;
  if (!vesselName) return { success: true, recordsCreated: 0 };

  let vesselId: string;
  if (imoNumber) {
    const { data: existing } = await supabase
      .from("alc_vessels")
      .select("id")
      .eq("imo_number", imoNumber)
      .maybeSingle();

    if (existing) {
      vesselId = existing.id;
    } else {
      const { data: newV } = await supabase
        .from("alc_vessels")
        .insert({ carrier_id: carrierId, vessel_name: vesselName, imo_number: imoNumber, mmsi: payload.mmsi || null, operator_name: payload.operator || null })
        .select("id")
        .single();
      vesselId = newV!.id;
      created++;
    }
  } else {
    const { data: newV } = await supabase
      .from("alc_vessels")
      .insert({ carrier_id: carrierId, vessel_name: vesselName, operator_name: payload.operator || null })
      .select("id")
      .single();
    vesselId = newV!.id;
    created++;
  }

  // Create transport calls if port calls provided
  const portCalls = payload.port_calls || payload.portCalls || [];
  for (let i = 0; i < portCalls.length; i++) {
    const pc = portCalls[i];
    let locationId: string | null = null;
    if (pc.unlocode) {
      const { data: loc } = await supabase
        .from("alc_locations")
        .select("id")
        .eq("unlocode", pc.unlocode)
        .maybeSingle();
      if (loc) {
        locationId = loc.id;
      } else {
        const { data: newLoc } = await supabase
          .from("alc_locations")
          .insert({ unlocode: pc.unlocode, location_name: pc.port_name || pc.unlocode })
          .select("id")
          .single();
        locationId = newLoc?.id || null;
      }
    }

    await supabase.from("transport_calls").insert({
      carrier_id: carrierId,
      vessel_id: vesselId,
      voyage_number: payload.voyage_number || payload.voyageNumber || null,
      transport_call_sequence: i + 1,
      location_id: locationId,
      facility_code: pc.facility_code || pc.terminalCode || null,
      planned_arrival: pc.planned_arrival || pc.eta || null,
      planned_departure: pc.planned_departure || pc.etd || null,
      actual_arrival: pc.actual_arrival || pc.ata || null,
      actual_departure: pc.actual_departure || pc.atd || null,
    });
    created++;
  }

  return { success: true, recordsCreated: created };
}
