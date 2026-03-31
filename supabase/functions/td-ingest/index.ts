import { createClient } from "npm:@supabase/supabase-js";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { carrier_id, payload } = body;
    if (!carrier_id || !payload) {
      return new Response(JSON.stringify({ error: "carrier_id and payload required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Store raw message ──
    const { data: rawMsg, error: rawErr } = await supabase
      .from("carrier_raw_messages")
      .insert({
        carrier_id,
        source_channel: "api",
        message_family: "transport_document",
        message_type: "td_response",
        external_reference: pick(payload, "transportDocumentReference", "transport_document_reference", "billOfLadingNumber") || null,
        payload_format: "json",
        request_payload_json: payload,
        processing_status: "pending",
        received_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (rawErr) throw rawErr;
    const rawId = rawMsg.id;

    // ── 2. Create integration job ──
    const { data: job, error: jobErr } = await supabase
      .from("integration_jobs")
      .insert({
        raw_message_id: rawId,
        carrier_id,
        job_type: "transform_transport_document",
        job_status: "running",
        attempt_count: 1,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobErr) throw jobErr;

    // ── 3. Transform ──
    try {
      await transformTransportDocument(supabase, carrier_id, rawId, payload);

      await supabase.from("integration_jobs").update({ job_status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id);
      await supabase.from("carrier_raw_messages").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", rawId);
    } catch (txErr: any) {
      await supabase.from("integration_jobs").update({ job_status: "failed", last_error: txErr.message }).eq("id", job.id);
      await supabase.from("carrier_raw_messages").update({ processing_status: "error", error_message: txErr.message }).eq("id", rawId);
      throw txErr;
    }

    return new Response(JSON.stringify({ ok: true, raw_message_id: rawId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ──
function pick(obj: any, ...keys: string[]): any {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k] ?? obj[k.replace(/([A-Z])/g, "_$1").toLowerCase()];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

async function resolveLocation(supabase: any, raw: any): Promise<string | null> {
  if (!raw) return null;
  const name = typeof raw === "string" ? raw : pick(raw, "locationName", "name", "city") || raw;
  if (typeof name !== "string") return null;

  const unlocode = typeof raw === "object" ? pick(raw, "UNLocationCode", "unlocode") : null;
  const city = typeof raw === "object" ? pick(raw, "city") : null;
  const country = typeof raw === "object" ? pick(raw, "country", "countryCode") : null;

  if (unlocode) {
    const { data: existing } = await supabase.from("alc_locations").select("id").eq("unlocode", unlocode).maybeSingle();
    if (existing) return existing.id;
  }

  const { data } = await supabase
    .from("alc_locations")
    .insert({ location_name: typeof name === "string" ? name : JSON.stringify(name), unlocode, city, country })
    .select("id")
    .single();
  return data?.id || null;
}

async function resolveVessel(supabase: any, carrierId: string, raw: any): Promise<string | null> {
  if (!raw) return null;
  const vName = typeof raw === "string" ? raw : pick(raw, "vesselName", "name");
  if (!vName) return null;
  const imo = typeof raw === "object" ? pick(raw, "vesselIMONumber", "imoNumber") : null;

  const { data: existing } = await supabase.from("alc_vessels").select("id").eq("vessel_name", vName).maybeSingle();
  if (existing) return existing.id;

  const { data } = await supabase.from("alc_vessels").insert({ carrier_id: carrierId, vessel_name: vName, imo_number: imo }).select("id").single();
  return data?.id || null;
}

// ── Main transformation ──
async function transformTransportDocument(supabase: any, carrierId: string, rawId: string, p: any) {
  const tdRef = pick(p, "transportDocumentReference", "transport_document_reference");
  const blNumber = pick(p, "billOfLadingNumber", "bill_of_lading_number", "blNumber");
  const tdStatus = pick(p, "transportDocumentStatus", "documentStatus", "status") || "issued";
  const tdTypeCode = pick(p, "transportDocumentTypeCode", "document_type_code");
  const issueDate = pick(p, "issueDate", "issue_date");
  const shippedOnBoardDate = pick(p, "shippedOnBoardDate", "shipped_on_board_date");
  const receivedForShipmentDate = pick(p, "receivedForShipmentDate", "received_for_shipment_date");
  const declaredValue = pick(p, "declaredValue", "declared_value");
  const declaredValueCurrency = pick(p, "declaredValueCurrency", "declared_value_currency");
  const numberOfOriginals = pick(p, "numberOfOriginals", "number_of_originals");
  const numberOfCopies = pick(p, "numberOfCopies", "number_of_copies");
  const isElectronic = pick(p, "isElectronic", "is_electronic") ?? false;
  const isSurrendered = pick(p, "isSurrendered", "is_surrendered") ?? false;
  const freightPaymentTermCode = pick(p, "freightPaymentTermCode", "freight_payment_term_code");
  const originChargePaymentTermCode = pick(p, "originChargesPaymentTermCode", "origin_charge_payment_term_code");
  const destinationChargePaymentTermCode = pick(p, "destinationChargesPaymentTermCode", "destination_charge_payment_term_code");

  const carrierBookingRef = pick(p, "carrierBookingReference", "carrierBookingNumber", "booking_number");
  const siRef = pick(p, "shippingInstructionReference", "shipping_instruction_reference");

  // Resolve locations
  const issueLocRaw = pick(p, "issueLocation", "placeOfIssue");
  const placeOfReceiptRaw = pick(p, "placeOfReceipt", "origin");
  const polRaw = pick(p, "portOfLoading", "pol");
  const podRaw = pick(p, "portOfDischarge", "pod");
  const placeOfDeliveryRaw = pick(p, "placeOfDelivery", "destination");

  const [issueLocId, originLocId, polLocId, podLocId, destLocId] = await Promise.all([
    resolveLocation(supabase, issueLocRaw),
    resolveLocation(supabase, placeOfReceiptRaw),
    resolveLocation(supabase, polRaw),
    resolveLocation(supabase, podRaw),
    resolveLocation(supabase, placeOfDeliveryRaw),
  ]);

  // ── Find or create booking ──
  let bookingId: string | null = null;
  if (carrierBookingRef) {
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id, shipment_id")
      .eq("carrier_booking_number", carrierBookingRef)
      .eq("alc_carrier_id", carrierId)
      .maybeSingle();
    bookingId = existingBooking?.id || null;
  }

  // ── Find or create shipping instruction ──
  let siId: string | null = null;
  if (siRef) {
    const { data: existingSi } = await supabase
      .from("shipping_instructions")
      .select("id")
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
        .select("id")
        .single();
      siId = newSi?.id || null;
    }
  }

  // ── Find or create shipment ──
  let shipmentId: string | null = null;

  // Try to find via booking
  if (bookingId) {
    const { data: bk } = await supabase.from("bookings").select("shipment_id").eq("id", bookingId).maybeSingle();
    shipmentId = bk?.shipment_id || null;
  }

  // Try to find via BL number in shipment_references
  if (!shipmentId && blNumber) {
    const { data: ref } = await supabase
      .from("shipment_references")
      .select("shipment_id")
      .eq("reference_value", blNumber)
      .eq("reference_type", "bill_of_lading")
      .maybeSingle();
    shipmentId = ref?.shipment_id || null;
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
      .select("id")
      .single();
    shipmentId = newShip?.id || null;
  } else {
    await supabase.from("shipments").update({
      shipping_instruction_id: siId,
      origin_location_id: originLocId || undefined,
      pol_location_id: polLocId || undefined,
      pod_location_id: podLocId || undefined,
      destination_location_id: destLocId || undefined,
    }).eq("id", shipmentId);
  }

  // Update SI with shipment_id
  if (siId && shipmentId) {
    await supabase.from("shipping_instructions").update({ shipment_id: shipmentId }).eq("id", siId);
  }

  // ── Create or update transport_documents ──
  let tdId: string | null = null;
  if (tdRef) {
    const { data: existingTd } = await supabase
      .from("transport_documents")
      .select("id")
      .eq("transport_document_reference", tdRef)
      .eq("alc_carrier_id", carrierId)
      .maybeSingle();
    tdId = existingTd?.id || null;
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
    declared_value: declaredValue ? parseFloat(declaredValue) : null,
    declared_value_currency: declaredValueCurrency,
    number_of_originals: numberOfOriginals ? parseInt(numberOfOriginals) : null,
    number_of_copies: numberOfCopies ? parseInt(numberOfCopies) : null,
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
    tdId = newTd?.id || null;
  }

  // Update shipment with transport_document_id
  if (tdId && shipmentId) {
    await supabase.from("shipments").update({ transport_document_id: tdId }).eq("id", shipmentId);
  }

  // ── References ──
  const refs: any[] = [];
  if (blNumber) refs.push({ reference_type: "bill_of_lading", reference_value: blNumber, is_primary: true });
  if (tdRef && tdRef !== blNumber) refs.push({ reference_type: "transport_document", reference_value: tdRef, is_primary: false });
  if (carrierBookingRef) refs.push({ reference_type: "booking_number", reference_value: carrierBookingRef, is_primary: false });
  if (siRef) refs.push({ reference_type: "shipping_instruction", reference_value: siRef, is_primary: false });

  const extraRefs = pick(p, "references", "documentReferences") || [];
  if (Array.isArray(extraRefs)) {
    for (const r of extraRefs) {
      refs.push({
        reference_type: pick(r, "type", "referenceType") || "carrier_reference",
        reference_value: pick(r, "value", "referenceValue"),
        is_primary: false,
      });
    }
  }

  if (refs.length && tdId) {
    await supabase.from("shipment_references").delete().eq("transport_document_id", tdId);
    await supabase.from("shipment_references").insert(
      refs.filter(r => r.reference_value).map(r => ({
        ...r,
        shipment_id: shipmentId,
        booking_id: bookingId,
        shipping_instruction_id: siId,
        transport_document_id: tdId,
        alc_carrier_id: carrierId,
        source_message_id: rawId,
      }))
    );
  }

  // ── Parties ──
  const parties = pick(p, "documentParties", "parties") || [];
  if (Array.isArray(parties) && parties.length && tdId) {
    await supabase.from("shipment_parties").delete().eq("transport_document_id", tdId);
    const partyRows = parties.map((pt: any) => ({
      shipment_id: shipmentId,
      booking_id: bookingId,
      shipping_instruction_id: siId,
      transport_document_id: tdId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      party_role: pick(pt, "partyFunction", "role", "partyRole") || "unknown",
      company_name: pick(pt, "partyName", "name", "companyName"),
      address: pick(pt, "address", "addressLine1", "street"),
      city: pick(pt, "city"),
      state: pick(pt, "stateRegion", "state"),
      postal_code: pick(pt, "postCode", "postalCode"),
      country: pick(pt, "country", "countryCode"),
      contact_name: pick(pt, "contactName", "personName"),
      email: pick(pt, "email"),
      phone: pick(pt, "phone", "phoneNumber"),
      tax_id: pick(pt, "taxReference1", "taxId"),
    }));
    if (partyRows.length) await supabase.from("shipment_parties").insert(partyRows);
  }

  // ── Consignment items ──
  const consignmentItems = pick(p, "consignmentItems", "consignment_items") || [];
  if (Array.isArray(consignmentItems) && consignmentItems.length && tdId) {
    await supabase.from("transport_document_consignment_items").delete().eq("transport_document_id", tdId);
    const ciRows = consignmentItems.map((ci: any, idx: number) => ({
      transport_document_id: tdId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      consignment_item_number: pick(ci, "siLineItemNumber", "consignmentItemNumber") || idx + 1,
      cargo_item_number: pick(ci, "cargoItemNumber"),
      description: pick(ci, "descriptionOfGoods", "description"),
      harmonized_system_code: pick(ci, "HSCode", "hsCode", "harmonizedSystemCode"),
      national_commodity_code: pick(ci, "nationalCommodityCode"),
      package_quantity: pick(ci, "numberOfPackages", "packageQuantity"),
      package_type_code: pick(ci, "packageCode", "packageTypeCode"),
      gross_weight: pick(ci, "weight", "grossWeight"),
      net_weight: pick(ci, "netWeight"),
      volume: pick(ci, "volume"),
    }));
    await supabase.from("transport_document_consignment_items").insert(ciRows);
  }

  // ── Cargo details (linked to TD) ──
  const cargoLines = pick(p, "cargoItems", "cargo") || [];
  if (Array.isArray(cargoLines) && cargoLines.length && tdId) {
    await supabase.from("cargo_details").delete().eq("transport_document_id", tdId);
    const clRows = cargoLines.map((cl: any, idx: number) => ({
      transport_document_id: tdId,
      shipping_instruction_id: siId,
      booking_id: bookingId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      cargo_line_number: idx + 1,
      commodity_description: pick(cl, "descriptionOfGoods", "commodityDescription", "description"),
      hs_code: pick(cl, "HSCode", "hsCode"),
      package_count: pick(cl, "numberOfPackages", "packageCount"),
      package_type_code: pick(cl, "packageCode", "packageTypeCode"),
      gross_weight: pick(cl, "weight", "grossWeight"),
      net_weight: pick(cl, "netWeight"),
      volume: pick(cl, "volume"),
      marks_and_numbers: pick(cl, "marksAndNumbers"),
      dangerous_goods_flag: pick(cl, "isDangerousGoods", "dangerousGoodsFlag") ?? false,
    }));
    await supabase.from("cargo_details").insert(clRows);
  }

  // ── Equipment ──
  const equipments = pick(p, "utilizedTransportEquipments", "equipments", "containers") || [];
  if (Array.isArray(equipments) && equipments.length && tdId) {
    await supabase.from("transport_document_equipments").delete().eq("transport_document_id", tdId);
    const eqRows = equipments.map((eq: any) => ({
      transport_document_id: tdId,
      booking_id: bookingId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      equipment_reference: pick(eq, "equipmentReference"),
      container_number: pick(eq, "equipmentReference", "containerNumber"),
      iso_equipment_code: pick(eq, "ISOEquipmentCode", "isoEquipmentCode"),
      equipment_type_code: pick(eq, "equipmentTypeCode"),
      seal_number: (() => {
        const seals = pick(eq, "seals");
        if (Array.isArray(seals) && seals.length) return seals.map((s: any) => pick(s, "sealNumber", "number") || s).join(", ");
        return pick(eq, "sealNumber");
      })(),
      temperature_setting: pick(eq, "temperatureSetting", "temperature"),
      ventilation_setting: pick(eq, "ventilationSetting"),
      humidity_setting: pick(eq, "humiditySetting"),
      overdimension_flag: pick(eq, "isOverdimension", "overdimensionFlag") ?? false,
      dangerous_goods_flag: pick(eq, "isDangerousGoods", "dangerousGoodsFlag") ?? false,
    }));
    await supabase.from("transport_document_equipments").insert(eqRows);
  }

  // ── Transport plan / routing ──
  const transports = pick(p, "transports", "transportPlan", "routing") || [];
  if (Array.isArray(transports) && transports.length && tdId) {
    await supabase.from("transport_plans").delete().eq("transport_document_id", tdId);
    const tpRows = [];
    for (let i = 0; i < transports.length; i++) {
      const tp = transports[i];
      const [loadLocId, dischLocId] = await Promise.all([
        resolveLocation(supabase, pick(tp, "loadLocation", "portOfLoading")),
        resolveLocation(supabase, pick(tp, "dischargeLocation", "portOfDischarge")),
      ]);
      const vesselId = await resolveVessel(supabase, carrierId, pick(tp, "vessel"));
      tpRows.push({
        booking_id: bookingId,
        shipment_id: shipmentId,
        shipping_instruction_id: siId,
        transport_document_id: tdId,
        alc_carrier_id: carrierId,
        source_message_id: rawId,
        sequence_number: pick(tp, "transportPlanStageSequenceNumber", "sequenceNumber") || i + 1,
        transport_mode: pick(tp, "modeOfTransport", "transportMode") || "vessel",
        vessel_name: pick(tp, "vesselName") || (typeof pick(tp, "vessel") === "string" ? pick(tp, "vessel") : pick(tp, "vessel", "vesselName")),
        voyage_number: pick(tp, "carrierExportVoyageNumber", "voyageNumber"),
        load_location_id: loadLocId,
        discharge_location_id: dischLocId,
        planned_departure: pick(tp, "plannedDepartureDate", "etd"),
        planned_arrival: pick(tp, "plannedArrivalDate", "eta"),
        service_name: pick(tp, "serviceName"),
      });
    }
    if (tpRows.length) await supabase.from("transport_plans").insert(tpRows);
  }

  // ── Charges ──
  const charges = pick(p, "charges", "freightCharges") || [];
  if (Array.isArray(charges) && charges.length && tdId) {
    await supabase.from("transport_document_charges").delete().eq("transport_document_id", tdId);
    const chRows = charges.map((ch: any) => ({
      transport_document_id: tdId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      charge_code: pick(ch, "chargeType", "chargeCode"),
      charge_description: pick(ch, "chargeName", "chargeDescription"),
      amount: pick(ch, "currencyAmount", "amount") ? parseFloat(pick(ch, "currencyAmount", "amount")) : null,
      currency_code: pick(ch, "currencyCode", "currency"),
      payment_term_code: pick(ch, "paymentTermCode", "paymentTerm"),
      calculation_basis: pick(ch, "calculationBasis"),
    }));
    await supabase.from("transport_document_charges").insert(chRows);
  }

  // ── Instructions / clauses ──
  const clauses = pick(p, "clauses", "documentClauses", "instructions") || [];
  if (Array.isArray(clauses) && clauses.length && tdId) {
    await supabase.from("transport_document_instructions").delete().eq("transport_document_id", tdId);
    const instrRows = clauses.map((cl: any) => ({
      transport_document_id: tdId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      instruction_type: pick(cl, "clauseType", "instructionType", "type") || "bill_of_lading_clause",
      instruction_text: pick(cl, "clauseContent", "instructionText", "text") || (typeof cl === "string" ? cl : JSON.stringify(cl)),
    }));
    await supabase.from("transport_document_instructions").insert(instrRows);
  }

  // ── Document records ──
  if (tdId && shipmentId) {
    const { data: existingDoc } = await supabase
      .from("documents")
      .select("id")
      .eq("transport_document_id", tdId)
      .eq("document_type", tdTypeCode === "SWB" ? "seaway_bill" : "bill_of_lading")
      .maybeSingle();

    if (!existingDoc) {
      await supabase.from("documents").insert({
        shipment_id: shipmentId,
        booking_id: bookingId,
        shipping_instruction_id: siId,
        transport_document_id: tdId,
        alc_carrier_id: carrierId,
        source_message_id: rawId,
        document_type: tdTypeCode === "SWB" ? "seaway_bill" : "bill_of_lading",
        document_reference: blNumber || tdRef,
      });
    }
  }
}
