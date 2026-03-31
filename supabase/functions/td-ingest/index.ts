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

/** Pick first non-nullish value from candidate keys (camelCase + snake_case) */
const pick = (obj: Record<string, any> | null | undefined, ...keys: string[]) => {
  if (!obj) return null;
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
    // try snake_case variant of camelCase key
    const snake = k.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (snake !== k && obj[snake] != null) return obj[snake];
  }
  return null;
};

/** Resolve or create a normalized location, returns id */
async function resolveLocation(loc: any): Promise<string | null> {
  if (!loc) return null;
  if (typeof loc === "string") {
    const { data: byName } = await supabase
      .from("alc_locations").select("id")
      .eq("location_name", loc).maybeSingle();
    if (byName) return byName.id;
    const { data: created } = await supabase
      .from("alc_locations").insert({ location_name: loc }).select("id").single();
    return created?.id ?? null;
  }

  const unlocode = pick(loc, "UNLocationCode", "unlocode", "portCode");
  const facilityCode = pick(loc, "facilityCode");
  const name = pick(loc, "locationName", "name", "city");
  if (!unlocode && !facilityCode && !name) return null;

  if (unlocode) {
    const { data } = await supabase
      .from("alc_locations").select("id")
      .eq("unlocode", unlocode).maybeSingle();
    if (data) return data.id;
  }

  const { data: created } = await supabase
    .from("alc_locations")
    .insert({
      unlocode,
      facility_code: facilityCode,
      location_name: name,
      city: pick(loc, "city"),
      state: pick(loc, "state", "stateRegion"),
      country: pick(loc, "country", "countryCode"),
      address_line1: pick(loc, "addressLine1", "address"),
      address_line2: pick(loc, "addressLine2"),
      postal_code: pick(loc, "postalCode"),
      latitude: pick(loc, "latitude"),
      longitude: pick(loc, "longitude"),
    })
    .select("id").single();
  return created?.id ?? null;
}

/** Resolve or create a vessel record, returns id */
async function resolveVessel(v: any, carrierId: string): Promise<string | null> {
  if (!v) return null;
  const vesselName = typeof v === "string" ? v : pick(v, "vesselName", "name");
  if (!vesselName) return null;
  const imo = typeof v === "object" ? pick(v, "vesselIMONumber", "imoNumber") : null;

  if (imo) {
    const { data } = await supabase
      .from("alc_vessels").select("id")
      .eq("imo_number", imo).maybeSingle();
    if (data) return data.id;
  }

  const { data: byName } = await supabase
    .from("alc_vessels").select("id")
    .eq("vessel_name", vesselName).maybeSingle();
  if (byName) return byName.id;

  const { data: created } = await supabase
    .from("alc_vessels")
    .insert({
      carrier_id: carrierId,
      vessel_name: vesselName,
      imo_number: imo,
      mmsi: typeof v === "object" ? pick(v, "mmsi") : null,
      operator_name: typeof v === "object" ? pick(v, "operatorName") : null,
    })
    .select("id").single();
  return created?.id ?? null;
}

/* ─── main handler ─── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { carrier_code, carrier_id: directCarrierId, message_type, external_reference, payload } = body;

    if (!payload) return json({ error: "payload is required" }, 400);

    // Resolve carrier — support both carrier_code lookup and direct carrier_id
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
        message_family: "transport_document",
        message_type: message_type || "td_response",
        external_reference: external_reference || pick(payload, "transportDocumentReference", "billOfLadingNumber") || null,
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
        job_type: "transform_transport_document",
        job_status: "running",
        attempt_count: 1,
        started_at: new Date().toISOString(),
      })
      .select("id").single();
    if (jobErr) throw jobErr;

    // 3 — transform
    try {
      const result = await transformTransportDocument(carrierId, rawId, payload);

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
    console.error("td-ingest error:", err);
    return json({ error: err.message }, 500);
  }
});

/* ═══════════════════════════════════════════════════════════════
   Transform raw carrier TD payload → ALC canonical tables
   ═══════════════════════════════════════════════════════════════ */

async function transformTransportDocument(carrierId: string, rawId: string, p: Record<string, any>) {
  // ── Extract canonical TD fields ──
  const tdRef = pick(p, "transportDocumentReference", "tdReference");
  const blNumber = pick(p, "billOfLadingNumber", "blNumber");
  const tdStatus = pick(p, "transportDocumentStatus", "documentStatus", "status") || "issued";
  const tdTypeCode = pick(p, "transportDocumentTypeCode", "documentTypeCode");
  const issueDate = pick(p, "issueDate");
  const shippedOnBoardDate = pick(p, "shippedOnBoardDate");
  const receivedForShipmentDate = pick(p, "receivedForShipmentDate");
  const declaredValue = pick(p, "declaredValue");
  const declaredValueCurrency = pick(p, "declaredValueCurrency");
  const numberOfOriginals = pick(p, "numberOfOriginals");
  const numberOfCopies = pick(p, "numberOfCopies");
  const isElectronic = pick(p, "isElectronic") ?? false;
  const isSurrendered = pick(p, "isSurrendered") ?? false;
  const freightPaymentTermCode = pick(p, "freightPaymentTermCode");
  const originChargePaymentTermCode = pick(p, "originChargesPaymentTermCode", "originChargePaymentTermCode");
  const destinationChargePaymentTermCode = pick(p, "destinationChargesPaymentTermCode", "destinationChargePaymentTermCode");

  const carrierBookingRef = pick(p, "carrierBookingReference", "carrierBookingNumber", "bookingNumber");
  const siRef = pick(p, "shippingInstructionReference");

  // ── Resolve locations in parallel ──
  const [issueLocId, originLocId, polLocId, podLocId, destLocId] = await Promise.all([
    resolveLocation(pick(p, "issueLocation", "placeOfIssue")),
    resolveLocation(pick(p, "placeOfReceipt", "origin")),
    resolveLocation(pick(p, "portOfLoading", "pol")),
    resolveLocation(pick(p, "portOfDischarge", "pod")),
    resolveLocation(pick(p, "placeOfDelivery", "destination")),
  ]);

  // ── Find or link booking ──
  let bookingId: string | null = null;
  if (carrierBookingRef) {
    const { data: existingBooking } = await supabase
      .from("bookings").select("id, shipment_id")
      .eq("carrier_booking_number", carrierBookingRef)
      .eq("alc_carrier_id", carrierId)
      .maybeSingle();
    bookingId = existingBooking?.id ?? null;
  }

  // ── Find or create shipping instruction ──
  let siId: string | null = null;
  if (siRef) {
    const { data: existingSi } = await supabase
      .from("shipping_instructions").select("id")
      .eq("shipping_instruction_reference", siRef)
      .eq("alc_carrier_id", carrierId)
      .maybeSingle();

    if (existingSi) {
      siId = existingSi.id;
    } else {
      const { data: newSi } = await supabase
        .from("shipping_instructions")
        .insert({
          alc_carrier_id: carrierId,
          source_message_id: rawId,
          shipping_instruction_reference: siRef,
          shipping_instruction_status: "received",
          transport_document_type_code: tdTypeCode,
          issue_date: issueDate,
          booking_id: bookingId,
        })
        .select("id").single();
      siId = newSi?.id ?? null;
    }
  }

  // ── Find or create shipment ──
  let shipmentId: string | null = null;

  // Try via booking
  if (bookingId) {
    const { data: bk } = await supabase.from("bookings").select("shipment_id").eq("id", bookingId).maybeSingle();
    shipmentId = bk?.shipment_id ?? null;
  }

  // Try via BL number in references
  if (!shipmentId && blNumber) {
    const { data: ref } = await supabase
      .from("shipment_references").select("shipment_id")
      .eq("reference_value", blNumber)
      .eq("reference_type", "bill_of_lading")
      .maybeSingle();
    shipmentId = ref?.shipment_id ?? null;
  }

  // Try via TD reference in references
  if (!shipmentId && tdRef) {
    const { data: ref } = await supabase
      .from("shipment_references").select("shipment_id")
      .eq("reference_value", tdRef)
      .eq("reference_type", "transport_document")
      .maybeSingle();
    shipmentId = ref?.shipment_id ?? null;
  }

  if (!shipmentId) {
    const { data: newShip } = await supabase
      .from("shipments")
      .insert({
        alc_carrier_id: carrierId,
        primary_reference_type: "bill_of_lading",
        primary_reference_value: blNumber || tdRef,
        shipment_mode: "ocean",
        origin_location_id: originLocId,
        pol_location_id: polLocId,
        pod_location_id: podLocId,
        destination_location_id: destLocId,
        current_status: "documented",
        booking_id: bookingId,
        shipping_instruction_id: siId,
      })
      .select("id").single();
    shipmentId = newShip?.id ?? null;
  } else {
    // Update shipment with latest location and link data
    const updates: Record<string, any> = { shipping_instruction_id: siId };
    if (originLocId) updates.origin_location_id = originLocId;
    if (polLocId) updates.pol_location_id = polLocId;
    if (podLocId) updates.pod_location_id = podLocId;
    if (destLocId) updates.destination_location_id = destLocId;
    await supabase.from("shipments").update(updates).eq("id", shipmentId);
  }

  // Link SI to shipment
  if (siId && shipmentId) {
    await supabase.from("shipping_instructions").update({ shipment_id: shipmentId }).eq("id", siId);
  }

  // ── Create or update transport_documents ──
  let tdId: string | null = null;

  // Find existing by reference or BL number
  if (tdRef) {
    const { data } = await supabase.from("transport_documents").select("id")
      .eq("transport_document_reference", tdRef).eq("alc_carrier_id", carrierId).maybeSingle();
    tdId = data?.id ?? null;
  }
  if (!tdId && blNumber) {
    const { data } = await supabase.from("transport_documents").select("id")
      .eq("bill_of_lading_number", blNumber).eq("alc_carrier_id", carrierId).maybeSingle();
    tdId = data?.id ?? null;
  }

  const tdData = {
    shipment_id: shipmentId,
    booking_id: bookingId,
    shipping_instruction_id: siId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    transport_document_reference: tdRef,
    transport_document_status: tdStatus,
    transport_document_type_code: tdTypeCode,
    bill_of_lading_number: blNumber,
    issue_date: issueDate,
    issue_location_id: issueLocId,
    shipped_on_board_date: shippedOnBoardDate,
    received_for_shipment_date: receivedForShipmentDate,
    declared_value: declaredValue != null ? parseFloat(declaredValue) : null,
    declared_value_currency: declaredValueCurrency,
    number_of_originals: numberOfOriginals != null ? parseInt(numberOfOriginals) : null,
    number_of_copies: numberOfCopies != null ? parseInt(numberOfCopies) : null,
    is_electronic: isElectronic,
    is_surrendered: isSurrendered,
    freight_payment_term_code: freightPaymentTermCode,
    origin_charge_payment_term_code: originChargePaymentTermCode,
    destination_charge_payment_term_code: destinationChargePaymentTermCode,
  };

  if (tdId) {
    await supabase.from("transport_documents").update(tdData).eq("id", tdId);
  } else {
    const { data: newTd } = await supabase.from("transport_documents").insert(tdData).select("id").single();
    tdId = newTd?.id ?? null;
  }

  // Link shipment to TD
  if (tdId && shipmentId) {
    await supabase.from("shipments").update({ transport_document_id: tdId }).eq("id", shipmentId);
  }

  // ── Write all child records ──
  const ctx = { carrierId, rawId, shipmentId, bookingId, siId, tdId };

  await writeReferences(ctx, p, tdRef, blNumber, carrierBookingRef, siRef);
  await writeParties(ctx, p);
  await writeConsignmentItems(ctx, p);
  await writeCargo(ctx, p);
  await writeEquipment(ctx, p);
  await writeTransportPlan(ctx, p);
  await writeCharges(ctx, p);
  await writeInstructions(ctx, p);
  await writeDocumentRecord(ctx, tdTypeCode, blNumber, tdRef);

  return { transport_document_id: tdId, shipment_id: shipmentId, booking_id: bookingId, shipping_instruction_id: siId };
}

/* ─── context type ─── */
interface Ctx {
  carrierId: string;
  rawId: string;
  shipmentId: string | null;
  bookingId: string | null;
  siId: string | null;
  tdId: string | null;
}

/* ─── child record writers ─── */

async function writeReferences(
  ctx: Ctx, p: Record<string, any>,
  tdRef: string | null, blNumber: string | null, bookingRef: string | null, siRef: string | null
) {
  if (!ctx.tdId) return;

  const refs: any[] = [];
  if (blNumber) refs.push({ reference_type: "bill_of_lading", reference_value: blNumber, is_primary: true });
  if (tdRef && tdRef !== blNumber) refs.push({ reference_type: "transport_document", reference_value: tdRef, is_primary: !blNumber });
  if (bookingRef) refs.push({ reference_type: "booking_number", reference_value: bookingRef, is_primary: false });
  if (siRef) refs.push({ reference_type: "shipping_instruction", reference_value: siRef, is_primary: false });

  // Extract additional references from payload
  const extraRefs = pick(p, "references", "documentReferences") || [];
  if (Array.isArray(extraRefs)) {
    for (const r of extraRefs) {
      const val = pick(r, "value", "referenceValue");
      if (val) {
        refs.push({
          reference_type: pick(r, "type", "referenceType") || "carrier_reference",
          reference_value: val,
          is_primary: false,
        });
      }
    }
  }

  if (!refs.length) return;

  await supabase.from("shipment_references").delete().eq("transport_document_id", ctx.tdId);
  await supabase.from("shipment_references").insert(
    refs.map(r => ({
      ...r,
      shipment_id: ctx.shipmentId,
      booking_id: ctx.bookingId,
      shipping_instruction_id: ctx.siId,
      transport_document_id: ctx.tdId,
      alc_carrier_id: ctx.carrierId,
      source_message_id: ctx.rawId,
    }))
  );
}

async function writeParties(ctx: Ctx, p: Record<string, any>) {
  const parties = pick(p, "documentParties", "parties") || [];
  if (!Array.isArray(parties) || !parties.length || !ctx.tdId) return;

  await supabase.from("shipment_parties").delete().eq("transport_document_id", ctx.tdId);

  const rows = parties.map((pt: any) => {
    // Handle nested party structure: { party: {...}, partyFunction: "OS" }
    const partyObj = pick(pt, "party") || pt;
    const role = pick(pt, "partyFunction", "role", "partyRole") || "unknown";

    // Map DCSA party function codes to readable roles
    const roleMap: Record<string, string> = {
      OS: "shipper", CN: "consignee", NI: "notify_party", N1: "notify_party",
      DDR: "endorsee", DDS: "buyer", SCO: "seller", BA: "booking_agent",
      FW: "forwarder", CA: "carrier", HE: "consignee_agent", END: "endorsee",
    };
    const mappedRole = roleMap[role.toUpperCase()] || role.toLowerCase();

    // Extract address — may be nested under partyContactDetails or address
    const addr = pick(partyObj, "address") || partyObj;
    const contact = Array.isArray(pick(partyObj, "partyContactDetails"))
      ? pick(partyObj, "partyContactDetails")[0]
      : pick(partyObj, "partyContactDetails") || partyObj;

    return {
      shipment_id: ctx.shipmentId,
      booking_id: ctx.bookingId,
      shipping_instruction_id: ctx.siId,
      transport_document_id: ctx.tdId,
      alc_carrier_id: ctx.carrierId,
      source_message_id: ctx.rawId,
      role: mappedRole,
      company_name: pick(partyObj, "partyName", "name", "companyName") || "Unknown",
      address: pick(addr, "street", "addressLine1", "address"),
      city: pick(addr, "city"),
      state: pick(addr, "stateRegion", "state"),
      postal_code: pick(addr, "postCode", "postalCode"),
      country: pick(addr, "country", "countryCode"),
      contact_name: pick(contact, "name", "contactName", "personName"),
      email: pick(contact, "email"),
      phone: pick(contact, "phone", "phoneNumber"),
      tax_id: pick(partyObj, "taxReference1", "taxId", "identifyingCode"),
    };
  });

  await supabase.from("shipment_parties").insert(rows);
}

async function writeConsignmentItems(ctx: Ctx, p: Record<string, any>) {
  const items = pick(p, "consignmentItems") || [];
  if (!Array.isArray(items) || !items.length || !ctx.tdId) return;

  await supabase.from("transport_document_consignment_items").delete().eq("transport_document_id", ctx.tdId);

  const rows = items.map((ci: any, idx: number) => ({
    transport_document_id: ctx.tdId,
    alc_carrier_id: ctx.carrierId,
    source_message_id: ctx.rawId,
    consignment_item_number: pick(ci, "siLineItemNumber", "consignmentItemNumber") || idx + 1,
    cargo_item_number: pick(ci, "cargoItemNumber"),
    description: pick(ci, "descriptionOfGoods", "description", "commodityDescription"),
    harmonized_system_code: pick(ci, "HSCode", "hsCode", "harmonizedSystemCode"),
    national_commodity_code: pick(ci, "nationalCommodityCode"),
    package_quantity: pick(ci, "numberOfPackages", "packageQuantity"),
    package_type_code: pick(ci, "packageCode", "packageTypeCode"),
    gross_weight: pick(ci, "weight", "grossWeight"),
    net_weight: pick(ci, "netWeight"),
    volume: pick(ci, "volume"),
  }));

  await supabase.from("transport_document_consignment_items").insert(rows);
}

async function writeCargo(ctx: Ctx, p: Record<string, any>) {
  const items = pick(p, "cargoItems", "cargo", "commodities") || [];
  if (!Array.isArray(items) || !items.length || !ctx.tdId) return;

  await supabase.from("cargo_details").delete().eq("transport_document_id", ctx.tdId);

  const rows = items.map((cl: any, idx: number) => ({
    transport_document_id: ctx.tdId,
    shipping_instruction_id: ctx.siId,
    booking_id: ctx.bookingId,
    alc_carrier_id: ctx.carrierId,
    source_message_id: ctx.rawId,
    cargo_line_number: pick(cl, "lineNumber", "sequence") ?? idx + 1,
    commodity_description: pick(cl, "descriptionOfGoods", "commodityDescription", "description"),
    hs_code: pick(cl, "HSCode", "hsCode", "htsCode"),
    package_count: pick(cl, "numberOfPackages", "packageCount"),
    package_type_code: pick(cl, "packageCode", "packageTypeCode"),
    gross_weight: pick(cl, "weight", "grossWeight"),
    net_weight: pick(cl, "netWeight"),
    volume: pick(cl, "volume"),
    marks_and_numbers: pick(cl, "marksAndNumbers", "marks"),
    dangerous_goods_flag: pick(cl, "isDangerousGoods", "dangerousGoodsFlag") ?? false,
  }));

  await supabase.from("cargo_details").insert(rows);
}

async function writeEquipment(ctx: Ctx, p: Record<string, any>) {
  const items = pick(p, "utilizedTransportEquipments", "equipments", "containers") || [];
  if (!Array.isArray(items) || !items.length || !ctx.tdId) return;

  await supabase.from("transport_document_equipments").delete().eq("transport_document_id", ctx.tdId);

  const rows = items.map((eq: any) => {
    // Handle nested equipment structure: { equipment: { equipmentReference: "..." }, seals: [...] }
    const eqObj = pick(eq, "equipment") || eq;
    const seals = pick(eq, "seals") || pick(eqObj, "seals");
    const sealStr = Array.isArray(seals) && seals.length
      ? seals.map((s: any) => pick(s, "sealNumber", "number") || (typeof s === "string" ? s : "")).filter(Boolean).join(", ")
      : pick(eqObj, "sealNumber");

    return {
      transport_document_id: ctx.tdId,
      booking_id: ctx.bookingId,
      alc_carrier_id: ctx.carrierId,
      source_message_id: ctx.rawId,
      equipment_reference: pick(eqObj, "equipmentReference"),
      container_number: pick(eqObj, "equipmentReference", "containerNumber"),
      iso_equipment_code: pick(eqObj, "ISOEquipmentCode", "isoEquipmentCode"),
      equipment_type_code: pick(eqObj, "equipmentTypeCode"),
      seal_number: sealStr,
      temperature_setting: pick(eq, "activeReeferSettings", "temperatureSetting")
        ? (typeof pick(eq, "activeReeferSettings") === "object"
          ? pick(pick(eq, "activeReeferSettings"), "temperatureSetting", "temperature")
          : pick(eq, "temperatureSetting"))
        : pick(eqObj, "temperatureSetting"),
      ventilation_setting: pick(eq, "ventilationSetting"),
      humidity_setting: pick(eq, "humiditySetting"),
      overdimension_flag: pick(eq, "isOverdimension", "overdimensionFlag") ?? false,
      dangerous_goods_flag: pick(eq, "isDangerousGoods", "dangerousGoodsFlag") ?? false,
    };
  });

  await supabase.from("transport_document_equipments").insert(rows);
}

async function writeTransportPlan(ctx: Ctx, p: Record<string, any>) {
  const legs = pick(p, "transports", "transportPlan", "transportLegs", "routing") || [];
  if (!Array.isArray(legs) || !legs.length || !ctx.tdId) return;

  await supabase.from("transport_plans").delete().eq("transport_document_id", ctx.tdId);

  const rows = [];
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];

    // Resolve locations and vessel in parallel
    const [loadLocId, dischLocId, vesselId] = await Promise.all([
      resolveLocation(pick(leg, "loadLocation", "portOfLoading", "loadPort")),
      resolveLocation(pick(leg, "dischargeLocation", "portOfDischarge", "dischargePort")),
      resolveVessel(pick(leg, "vessel") || leg, ctx.carrierId),
    ]);

    rows.push({
      booking_id: ctx.bookingId,
      shipment_id: ctx.shipmentId,
      shipping_instruction_id: ctx.siId,
      transport_document_id: ctx.tdId,
      alc_carrier_id: ctx.carrierId,
      source_message_id: ctx.rawId,
      sequence_number: pick(leg, "transportPlanStageSequenceNumber", "sequenceNumber", "sequence") ?? i + 1,
      transport_mode: pick(leg, "modeOfTransport", "transportMode", "mode") || "vessel",
      vessel_name: pick(leg, "vesselName") || (typeof pick(leg, "vessel") === "string" ? pick(leg, "vessel") : pick(leg, "vessel")?.vesselName),
      voyage_number: pick(leg, "carrierExportVoyageNumber", "exportVoyageNumber", "voyageNumber", "voyage"),
      load_location_id: loadLocId,
      discharge_location_id: dischLocId,
      planned_departure: pick(leg, "plannedDepartureDate", "departureDateTime", "etd"),
      planned_arrival: pick(leg, "plannedArrivalDate", "arrivalDateTime", "eta"),
      service_name: pick(leg, "serviceName", "service"),
    });
  }

  if (rows.length) await supabase.from("transport_plans").insert(rows);
}

async function writeCharges(ctx: Ctx, p: Record<string, any>) {
  const items = pick(p, "charges", "freightCharges") || [];
  if (!Array.isArray(items) || !items.length || !ctx.tdId) return;

  await supabase.from("transport_document_charges").delete().eq("transport_document_id", ctx.tdId);

  const rows = items.map((ch: any) => ({
    transport_document_id: ctx.tdId,
    alc_carrier_id: ctx.carrierId,
    source_message_id: ctx.rawId,
    charge_code: pick(ch, "chargeType", "chargeCode", "code"),
    charge_description: pick(ch, "chargeName", "chargeDescription", "description"),
    amount: pick(ch, "currencyAmount", "amount", "unitPrice") != null ? parseFloat(pick(ch, "currencyAmount", "amount", "unitPrice")) : null,
    currency_code: pick(ch, "currencyCode", "currency") || "USD",
    payment_term_code: pick(ch, "paymentTermCode", "paymentTerm"),
    calculation_basis: pick(ch, "calculationBasis", "basis"),
  }));

  await supabase.from("transport_document_charges").insert(rows);
}

async function writeInstructions(ctx: Ctx, p: Record<string, any>) {
  const items = pick(p, "clauses", "documentClauses", "instructions", "termsAndConditions") || [];
  if (!Array.isArray(items) || !items.length || !ctx.tdId) return;

  await supabase.from("transport_document_instructions").delete().eq("transport_document_id", ctx.tdId);

  const rows = items.map((cl: any) => ({
    transport_document_id: ctx.tdId,
    alc_carrier_id: ctx.carrierId,
    source_message_id: ctx.rawId,
    instruction_type: pick(cl, "clauseType", "instructionType", "type") || "bill_of_lading_clause",
    instruction_text: pick(cl, "clauseContent", "instructionText", "text") || (typeof cl === "string" ? cl : JSON.stringify(cl)),
  }));

  await supabase.from("transport_document_instructions").insert(rows);
}

async function writeDocumentRecord(ctx: Ctx, tdTypeCode: string | null, blNumber: string | null, tdRef: string | null) {
  if (!ctx.tdId || !ctx.shipmentId) return;

  const docType = tdTypeCode === "SWB" ? "seaway_bill" : "bill_of_lading";

  const { data: existing } = await supabase
    .from("documents").select("id")
    .eq("transport_document_id", ctx.tdId)
    .eq("document_type", docType)
    .maybeSingle();

  if (!existing) {
    await supabase.from("documents").insert({
      shipment_id: ctx.shipmentId,
      booking_id: ctx.bookingId,
      shipping_instruction_id: ctx.siId,
      transport_document_id: ctx.tdId,
      alc_carrier_id: ctx.carrierId,
      source_message_id: ctx.rawId,
      document_type: docType,
      document_reference: blNumber || tdRef,
    });
  } else {
    await supabase.from("documents").update({
      source_message_id: ctx.rawId,
      document_reference: blNumber || tdRef,
    }).eq("id", existing.id);
  }
}
