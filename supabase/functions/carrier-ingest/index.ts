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

    // ── Step 3: Create integration job ──
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
// TYPES
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

// ============================================================
// HELPERS
// ============================================================

/** Resolve or create a location by UNLOCODE */
async function resolveLocation(locCode: string, locName?: string): Promise<string | null> {
  if (!locCode) return null;
  const { data: loc } = await supabase
    .from("alc_locations")
    .select("id")
    .eq("unlocode", locCode)
    .maybeSingle();
  if (loc) return loc.id;
  const { data: newLoc } = await supabase
    .from("alc_locations")
    .insert({ unlocode: locCode, location_name: locName || locCode })
    .select("id")
    .single();
  return newLoc?.id || null;
}

/** Find shipment ID by any reference value */
async function findShipmentByRef(refValue: string): Promise<string | null> {
  if (!refValue) return null;
  // Check shipment_references first
  const { data: ref } = await supabase
    .from("shipment_references")
    .select("shipment_id")
    .eq("reference_value", refValue)
    .maybeSingle();
  if (ref) return ref.shipment_id;
  // Fallback to booking_ref on shipments
  const { data: ship } = await supabase
    .from("shipments")
    .select("id")
    .eq("booking_ref", refValue)
    .maybeSingle();
  return ship?.id || null;
}

/** Resolve or create a container */
async function resolveContainer(
  shipmentId: string,
  containerNumber: string,
  carrierId: string,
  extras?: { iso_equipment_code?: string; equipment_size_type?: string; equipment_reference?: string }
): Promise<string | null> {
  if (!containerNumber || !shipmentId) return null;
  const { data: ctn } = await supabase
    .from("containers")
    .select("id")
    .eq("shipment_id", shipmentId)
    .eq("container_number", containerNumber)
    .maybeSingle();
  if (ctn) return ctn.id;
  const { data: newCtn } = await supabase
    .from("containers")
    .insert({
      shipment_id: shipmentId,
      container_number: containerNumber,
      alc_carrier_id: carrierId,
      container_type: extras?.equipment_size_type || "unknown",
      iso_equipment_code: extras?.iso_equipment_code || null,
      equipment_size_type: extras?.equipment_size_type || null,
      equipment_reference: extras?.equipment_reference || null,
      quantity: 1,
      status: "active",
    })
    .select("id")
    .single();
  return newCtn?.id || null;
}

/** Resolve or create vessel */
async function resolveVessel(
  carrierId: string,
  vesselName: string,
  imoNumber?: string,
  mmsi?: string,
  operatorName?: string
): Promise<string | null> {
  if (!vesselName) return null;
  if (imoNumber) {
    const { data: existing } = await supabase
      .from("alc_vessels")
      .select("id")
      .eq("imo_number", imoNumber)
      .maybeSingle();
    if (existing) return existing.id;
  }
  const { data: newV } = await supabase
    .from("alc_vessels")
    .insert({
      carrier_id: carrierId,
      vessel_name: vesselName,
      imo_number: imoNumber || null,
      mmsi: mmsi || null,
      operator_name: operatorName || null,
    })
    .select("id")
    .single();
  return newV?.id || null;
}

/** Upsert a shipment reference */
async function upsertReference(
  shipmentId: string,
  carrierId: string,
  refType: string,
  refValue: string,
  isPrimary: boolean,
  rawMessageId: string
): Promise<void> {
  if (!refValue) return;
  const { data: existing } = await supabase
    .from("shipment_references")
    .select("id")
    .eq("shipment_id", shipmentId)
    .eq("reference_type", refType)
    .eq("reference_value", refValue)
    .maybeSingle();
  if (!existing) {
    await supabase.from("shipment_references").insert({
      shipment_id: shipmentId,
      carrier_id: carrierId,
      reference_type: refType,
      reference_value: refValue,
      is_primary: isPrimary,
      source_message_id: rawMessageId,
    });
  }
}

/** Load event mappings for a carrier, keyed by external_code+classifier */
async function loadEventMappings(carrierId: string, family: string): Promise<Map<string, any>> {
  const { data: mappings } = await supabase
    .from("carrier_event_mappings")
    .select("*")
    .eq("carrier_id", carrierId)
    .eq("message_family", family)
    .eq("active", true);
  const map = new Map<string, any>();
  for (const m of mappings || []) {
    // Key by code+classifier for precise lookup
    const compositeKey = `${m.external_code}|${m.event_classifier_code || ''}`;
    map.set(compositeKey, m);
    // Also set code-only fallback (first match wins)
    if (!map.has(m.external_code)) {
      map.set(m.external_code, m);
    }
  }
  return map;
}

/** Lookup mapping by code + classifier, falling back to code-only */
function lookupMapping(mappings: Map<string, any>, eventCode: string, classifierCode?: string): any {
  if (classifierCode) {
    const precise = mappings.get(`${eventCode}|${classifierCode}`);
    if (precise) return precise;
  }
  return mappings.get(eventCode) || null;
}

// ============================================================
// TRANSFORMATION DISPATCHER
// ============================================================
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
    if (messageFamily === "transport_document") {
      return await transformTransportDocument(input);
    }
    if (messageFamily === "issuance") {
      return await transformIssuance(input);
    }
    if (messageFamily === "schedule" && messageType === "vessel") {
      return await transformVesselSchedule(input);
    }
    if (messageFamily === "equipment" && messageType === "update") {
      return await transformEquipmentUpdate(input);
    }

    // Unknown message type – store raw but skip transformation
    return { success: true, recordsCreated: 0 };
  } catch (err: any) {
    return { success: false, recordsCreated: 0, error: err.message };
  }
}

// ============================================================
// TRACKING EVENT TRANSFORMER
// ============================================================
async function transformTrackingEvent(input: TransformInput): Promise<TransformResult> {
  const { carrierId, carrierCode, rawMessageId, payload } = input;
  if (!payload) return { success: true, recordsCreated: 0 };

  const events = Array.isArray(payload.events) ? payload.events : [payload];
  let created = 0;

  const mappingLookup = await loadEventMappings(carrierId, "tracking");

  for (const evt of events) {
    const eventCode = evt.event_code || evt.eventCode;
    const classifierCode = evt.event_classifier || evt.eventClassifierCode || null;
    const mapping = lookupMapping(mappingLookup, eventCode, classifierCode);

    // Resolve location
    const locCode = evt.unlocode || evt.location_code || evt.facilityCode;
    const locationId = await resolveLocation(locCode, evt.location_name || evt.portName);

    // Find shipment by any available reference
    const refValue = evt.booking_number || evt.bill_of_lading || evt.container_number
      || evt.shipmentReference || evt.bookingReference;
    const shipmentId = await findShipmentByRef(refValue);

    if (!shipmentId) {
      console.warn(`No shipment found for reference: ${refValue}, storing event without shipment link`);
    }

    // Resolve container
    const containerNum = evt.container_number || evt.equipmentReference;
    let containerId: string | null = null;
    if (containerNum && shipmentId) {
      containerId = await resolveContainer(shipmentId, containerNum, carrierId, {
        iso_equipment_code: evt.iso_equipment_code || evt.isoEquipmentCode,
        equipment_size_type: evt.equipment_size_type || evt.equipmentSizeType,
      });
    }

    // Resolve vessel
    let vesselId: string | null = null;
    const vesselName = evt.vessel_name || evt.vesselName;
    if (vesselName) {
      vesselId = await resolveVessel(
        carrierId, vesselName,
        evt.imo_number || evt.imoNumber,
        evt.mmsi,
        evt.operator || evt.operatorName
      );
    }

    // Resolve transport call if voyage info present
    let transportCallId: string | null = null;
    const voyageNumber = evt.voyage_number || evt.voyageNumber;
    if (vesselId && voyageNumber && locationId) {
      const { data: tc } = await supabase
        .from("transport_calls")
        .select("id")
        .eq("vessel_id", vesselId)
        .eq("voyage_number", voyageNumber)
        .eq("location_id", locationId)
        .maybeSingle();
      transportCallId = tc?.id || null;
    }

    // Store seal info if present
    if (containerId && evt.seal_number) {
      const seals = Array.isArray(evt.seal_number) ? evt.seal_number : [evt.seal_number];
      for (const sn of seals) {
        const { data: existingSeal } = await supabase
          .from("container_seals")
          .select("id")
          .eq("container_id", containerId)
          .eq("seal_number", sn)
          .maybeSingle();
        if (!existingSeal) {
          await supabase.from("container_seals").insert({
            container_id: containerId,
            carrier_id: carrierId,
            seal_number: sn,
            seal_source: evt.seal_source || "carrier",
          });
          created++;
        }
      }
    }

    // Upsert shipment references from event data
    if (shipmentId) {
      if (evt.booking_number || evt.bookingReference) {
        await upsertReference(shipmentId, carrierId, "booking_number", evt.booking_number || evt.bookingReference, true, rawMessageId);
      }
      if (evt.bill_of_lading || evt.billOfLading) {
        await upsertReference(shipmentId, carrierId, "bill_of_lading", evt.bill_of_lading || evt.billOfLading, false, rawMessageId);
      }
      if (containerNum) {
        await upsertReference(shipmentId, carrierId, "container_number", containerNum, false, rawMessageId);
      }
    }

    // Derive scope from mapping or payload
    const derivedScope = mapping?.event_scope || evt.event_scope || (containerNum ? "equipment" : "shipment");

    // Insert tracking event — raw external codes preserved, internal codes from mapping
    await supabase.from("tracking_events").insert({
      shipment_id: shipmentId,
      container_id: containerId,
      alc_carrier_id: carrierId,
      raw_message_id: rawMessageId,
      event_scope: derivedScope,
      external_event_code: eventCode || null,
      external_event_name: evt.event_name || evt.eventName || null,
      internal_event_code: mapping?.internal_code || null,
      internal_event_name: mapping?.internal_name || null,
      event_classifier_code: classifierCode,
      event_created_datetime: evt.event_created_datetime || evt.eventCreatedDateTime || null,
      event_date: evt.event_datetime || evt.eventDateTime || new Date().toISOString(),
      milestone: mapping?.internal_name || evt.event_name || evt.eventName || "Unknown",
      location: evt.location_name || evt.portName || locCode || null,
      location_id: locationId,
      transport_call_id: transportCallId,
      vessel_id: vesselId,
      source: `carrier:${carrierCode}`,
      event_payload_json: evt,
    });
    created++;
  }

  return { success: true, recordsCreated: created };
}

// ============================================================
// BOOKING CONFIRMATION TRANSFORMER
// ============================================================
async function transformBookingConfirmation(input: TransformInput): Promise<TransformResult> {
  const { carrierId, carrierCode, rawMessageId, payload } = input;
  if (!payload) return { success: true, recordsCreated: 0 };

  let created = 0;
  const bookingNum = payload.booking_number || payload.bookingReference;
  if (!bookingNum) return { success: true, recordsCreated: 0 };

  const shipmentId = await findShipmentByRef(bookingNum);

  if (shipmentId) {
    // Store references
    await upsertReference(shipmentId, carrierId, "booking_number", bookingNum, true, rawMessageId);
    created++;

    if (payload.bill_of_lading || payload.billOfLading) {
      await upsertReference(shipmentId, carrierId, "bill_of_lading", payload.bill_of_lading || payload.billOfLading, false, rawMessageId);
      created++;
    }

    if (payload.carrier_reference || payload.carrierReference) {
      await upsertReference(shipmentId, carrierId, "carrier_reference", payload.carrier_reference || payload.carrierReference, false, rawMessageId);
      created++;
    }

    // Update shipment with carrier info
    await supabase
      .from("shipments")
      .update({
        alc_carrier_id: carrierId,
        primary_reference_type: "booking_number",
        primary_reference_value: bookingNum,
      })
      .eq("id", shipmentId);

    // Create containers from equipment list
    const equipment = payload.equipment || payload.containers || [];
    for (const eq of equipment) {
      const ctnNum = eq.container_number || eq.equipmentReference;
      if (ctnNum) {
        const ctnId = await resolveContainer(shipmentId, ctnNum, carrierId, {
          iso_equipment_code: eq.iso_equipment_code || eq.isoEquipmentCode,
          equipment_size_type: eq.equipment_size_type || eq.sizeType,
          equipment_reference: eq.equipment_reference,
        });
        created++;

        // Process seals
        const seals = eq.seals || eq.seal_numbers || [];
        for (const s of seals) {
          const sealNum = typeof s === "string" ? s : s.seal_number || s.sealNumber;
          if (sealNum && ctnId) {
            await supabase.from("container_seals").insert({
              container_id: ctnId,
              carrier_id: carrierId,
              seal_number: sealNum,
              seal_source: (typeof s === "object" ? s.seal_source || s.sealSource : null) || "carrier",
            });
            created++;
          }
        }
      }
    }

    // Resolve vessel if provided
    const vesselName = payload.vessel_name || payload.vesselName;
    if (vesselName) {
      const vesselId = await resolveVessel(
        carrierId, vesselName,
        payload.imo_number || payload.imoNumber,
        payload.mmsi,
        payload.operator || payload.operatorName
      );
      if (vesselId) {
        await supabase.from("shipments").update({ vessel: vesselName }).eq("id", shipmentId);
      }
    }

    // Create booking confirmed tracking event
    const mappingLookup = await loadEventMappings(carrierId, "tracking");
    const bkcfMapping = mappingLookup.get("BKCF");
    await supabase.from("tracking_events").insert({
      shipment_id: shipmentId,
      alc_carrier_id: carrierId,
      raw_message_id: rawMessageId,
      event_scope: "shipment",
      external_event_code: "BKCF",
      external_event_name: "Booking Confirmed",
      internal_event_code: bkcfMapping?.internal_code || "booking_confirmed",
      internal_event_name: bkcfMapping?.internal_name || "Booking Confirmed",
      event_date: payload.confirmed_at || payload.confirmedAt || new Date().toISOString(),
      milestone: bkcfMapping?.internal_name || "Booking Confirmed",
      source: `carrier:${carrierCode}`,
      event_payload_json: payload,
    });
    created++;
  }

  return { success: true, recordsCreated: created };
}

// ============================================================
// DOCUMENT RELEASE TRANSFORMER
// ============================================================
async function transformDocumentRelease(input: TransformInput): Promise<TransformResult> {
  const { carrierId, carrierCode, rawMessageId, payload } = input;
  if (!payload) return { success: true, recordsCreated: 0 };

  let created = 0;
  const refValue = payload.booking_number || payload.bill_of_lading || payload.bookingReference;
  if (!refValue) return { success: true, recordsCreated: 0 };

  const shipmentId = await findShipmentByRef(refValue);
  if (!shipmentId) return { success: true, recordsCreated: 0 };

  const { data: ship } = await supabase
    .from("shipments")
    .select("user_id")
    .eq("id", shipmentId)
    .single();

  // Insert document record
  await supabase.from("documents").insert({
    shipment_id: shipmentId,
    user_id: ship?.user_id,
    alc_carrier_id: carrierId,
    doc_type: payload.document_type || payload.documentType || "carrier_document",
    document_reference: payload.document_reference || payload.documentReference || null,
    source_message_id: rawMessageId,
    metadata_json: payload.metadata || null,
    status: "available",
    file_url: payload.download_url || payload.downloadUrl || "",
  });
  created++;

  // Create a document-type tracking event via mapping
  const docCode = payload.event_code || payload.eventCode;
  if (docCode) {
    const mappingLookup = await loadEventMappings(carrierId, "document");
    const mapping = mappingLookup.get(docCode);
    await supabase.from("tracking_events").insert({
      shipment_id: shipmentId,
      alc_carrier_id: carrierId,
      raw_message_id: rawMessageId,
      event_scope: "shipment",
      external_event_code: docCode,
      external_event_name: payload.event_name || payload.eventName || null,
      internal_event_code: mapping?.internal_code || null,
      internal_event_name: mapping?.internal_name || null,
      event_date: payload.released_at || payload.releasedAt || new Date().toISOString(),
      milestone: mapping?.internal_name || "Document Released",
      source: `carrier:${carrierCode}`,
      event_payload_json: payload,
    });
    created++;
  }

  return { success: true, recordsCreated: created };
}

// ============================================================
// VESSEL SCHEDULE TRANSFORMER
// ============================================================
async function transformVesselSchedule(input: TransformInput): Promise<TransformResult> {
  const { carrierId, payload } = input;
  if (!payload) return { success: true, recordsCreated: 0 };

  let created = 0;
  const vesselName = payload.vessel_name || payload.vesselName;
  if (!vesselName) return { success: true, recordsCreated: 0 };

  const vesselId = await resolveVessel(
    carrierId, vesselName,
    payload.imo_number || payload.imoNumber,
    payload.mmsi,
    payload.operator || payload.operatorName
  );
  if (!vesselId) return { success: false, recordsCreated: 0, error: "Failed to create vessel" };
  created++;

  // Create transport calls from port calls
  const portCalls = payload.port_calls || payload.portCalls || [];
  for (let i = 0; i < portCalls.length; i++) {
    const pc = portCalls[i];
    const locationId = await resolveLocation(
      pc.unlocode || pc.portCode,
      pc.port_name || pc.portName
    );

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

// ============================================================
// EQUIPMENT UPDATE TRANSFORMER
// ============================================================
async function transformEquipmentUpdate(input: TransformInput): Promise<TransformResult> {
  const { carrierId, rawMessageId, payload } = input;
  if (!payload) return { success: true, recordsCreated: 0 };

  let created = 0;
  const containers = Array.isArray(payload.containers) ? payload.containers : [payload];

  for (const ctn of containers) {
    const refValue = ctn.booking_number || ctn.bookingReference || ctn.shipmentReference;
    const shipmentId = await findShipmentByRef(refValue);
    if (!shipmentId) continue;

    const containerNum = ctn.container_number || ctn.equipmentReference;
    if (!containerNum) continue;

    const containerId = await resolveContainer(shipmentId, containerNum, carrierId, {
      iso_equipment_code: ctn.iso_equipment_code || ctn.isoEquipmentCode,
      equipment_size_type: ctn.equipment_size_type || ctn.sizeType,
      equipment_reference: ctn.equipment_reference,
    });

    if (containerId) {
      // Update container status/details
      const updates: Record<string, any> = {};
      if (ctn.status) updates.status = ctn.status;
      if (ctn.tare_weight || ctn.tareWeight) updates.tare_weight = ctn.tare_weight || ctn.tareWeight;
      if (ctn.vgm) updates.vgm = ctn.vgm;
      if (ctn.seal_number) updates.seal_number = ctn.seal_number;
      if (Object.keys(updates).length > 0) {
        await supabase.from("containers").update(updates).eq("id", containerId);
      }

      // Process seals
      const seals = ctn.seals || ctn.seal_numbers || [];
      for (const s of seals) {
        const sealNum = typeof s === "string" ? s : s.seal_number || s.sealNumber;
        if (sealNum) {
          const { data: existingSeal } = await supabase
            .from("container_seals")
            .select("id")
            .eq("container_id", containerId)
            .eq("seal_number", sealNum)
            .maybeSingle();
          if (!existingSeal) {
            await supabase.from("container_seals").insert({
              container_id: containerId,
              carrier_id: carrierId,
              seal_number: sealNum,
              seal_source: (typeof s === "object" ? s.seal_source || s.sealSource : null) || "carrier",
            });
            created++;
          }
        }
      }
      created++;
    }
  }

  return { success: true, recordsCreated: created };
}
