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

/** Pick first non-nullish value from a list of candidate keys */
const pick = (obj: Record<string, any>, ...keys: string[]) => {
  for (const k of keys) if (obj?.[k] != null) return obj[k];
  return null;
};

/** Resolve or create a normalized location, returns id */
async function resolveLocation(loc: any): Promise<string | null> {
  if (!loc) return null;
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
      postal_code: pick(loc, "postalCode"),
      latitude: pick(loc, "latitude"),
      longitude: pick(loc, "longitude"),
    })
    .select("id").single();
  return created?.id ?? null;
}

/** Resolve or create a vessel record, returns id */
async function resolveVessel(v: any, carrierId: string): Promise<string | null> {
  const vesselName = pick(v, "vesselName", "vessel_name");
  if (!vesselName) return null;
  const imo = pick(v, "imoNumber", "imo_number");

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
      mmsi: pick(v, "mmsi"),
      operator_name: pick(v, "operatorName"),
    })
    .select("id").single();
  return created?.id ?? null;
}

/* ─── main handler ─── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { carrier_code, message_type, external_reference, payload } = body;

    if (!carrier_code || !payload)
      return json({ error: "carrier_code and payload are required" }, 400);

    // 1 — resolve carrier
    const { data: carrier } = await supabase
      .from("alc_carriers").select("id")
      .eq("carrier_code", carrier_code.toUpperCase()).maybeSingle();
    if (!carrier) return json({ error: `Unknown carrier: ${carrier_code}` }, 404);
    const carrierId = carrier.id;

    // 2 — save raw message
    const { data: rawMsg, error: rawErr } = await supabase
      .from("carrier_raw_messages")
      .insert({
        carrier_id: carrierId,
        source_channel: "api",
        message_family: "booking",
        message_type: message_type || "booking_confirmation",
        external_reference: external_reference || pick(payload, "carrierBookingNumber", "bookingNumber") || null,
        payload_format: "json",
        request_payload_json: payload,
        processing_status: "pending",
        received_at: new Date().toISOString(),
      })
      .select("id").single();
    if (rawErr) throw rawErr;
    const rawId = rawMsg.id;

    // 3 — create integration job
    const { data: job, error: jobErr } = await supabase
      .from("integration_jobs")
      .insert({
        raw_message_id: rawId,
        carrier_id: carrierId,
        job_type: "booking_transform",
        job_status: "running",
        attempt_count: 1,
        started_at: new Date().toISOString(),
      })
      .select("id").single();
    if (jobErr) throw jobErr;

    // 4 — transform
    try {
      const result = await transformBooking(carrierId, rawId, payload);

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
    console.error("booking-ingest error:", err);
    return json({ error: err.message }, 500);
  }
});

/* ═══════════════════════════════════════════════
   Transform raw booking payload → ALC canonical
   ═══════════════════════════════════════════════ */

async function transformBooking(carrierId: string, rawId: string, p: Record<string, any>) {
  // ── extract canonical fields (carrier-agnostic) ──
  const carrierBookingNumber = pick(p, "carrierBookingNumber", "bookingNumber", "booking_number");
  const bookingStatus       = pick(p, "bookingStatus", "status") || "confirmed";
  const amendmentNumber     = pick(p, "amendmentNumber", "amendment_number") || 0;
  const bookingDate         = pick(p, "bookingDate", "booking_date") || new Date().toISOString();

  // ── resolve locations ──
  const [originLocId, polLocId, podLocId, destLocId] = await Promise.all([
    resolveLocation(pick(p, "placeOfReceipt", "origin")),
    resolveLocation(pick(p, "portOfLoading", "pol")),
    resolveLocation(pick(p, "portOfDischarge", "pod")),
    resolveLocation(pick(p, "placeOfDelivery", "destination")),
  ]);

  // ── upsert booking ──
  const bookingCore = {
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    booking_status: bookingStatus,
    booking_request_status: pick(p, "bookingRequestStatus"),
    booking_confirmation_status: pick(p, "bookingConfirmationStatus"),
    amendment_number: amendmentNumber,
    booking_date: bookingDate,
    receipt_type_at_origin: pick(p, "receiptTypeAtOrigin", "receipt_type_at_origin"),
    delivery_type_at_destination: pick(p, "deliveryTypeAtDestination", "delivery_type_at_destination"),
    service_contract_reference: pick(p, "serviceContractReference", "service_contract_reference"),
    payment_term_code: pick(p, "paymentTermCode", "payment_term_code"),
    quotation_reference: pick(p, "quotationReference", "quotation_reference"),
  };

  let bookingId: string;
  if (carrierBookingNumber) {
    const { data: existing } = await supabase
      .from("bookings").select("id")
      .eq("carrier_booking_number", carrierBookingNumber)
      .eq("alc_carrier_id", carrierId).maybeSingle();

    if (existing) {
      bookingId = existing.id;
      await supabase.from("bookings").update(bookingCore).eq("id", bookingId);
    } else {
      const { data: nb, error } = await supabase.from("bookings")
        .insert({ ...bookingCore, carrier_booking_number: carrierBookingNumber })
        .select("id").single();
      if (error) throw error;
      bookingId = nb.id;
    }
  } else {
    const { data: nb, error } = await supabase.from("bookings")
      .insert(bookingCore).select("id").single();
    if (error) throw error;
    bookingId = nb.id;
  }

  // ── link / update shipment ──
  let shipmentId: string | null = null;
  const { data: bk } = await supabase.from("bookings").select("shipment_id").eq("id", bookingId).single();
  if (bk?.shipment_id) {
    shipmentId = bk.shipment_id;
    await supabase.from("shipments").update({
      booking_ref: carrierBookingNumber,
      alc_carrier_id: carrierId,
      booking_id: bookingId,
      origin_port: pick(p, "placeOfReceipt")?.locationName ?? pick(p, "origin")?.name ?? null,
      destination_port: pick(p, "placeOfDelivery")?.locationName ?? pick(p, "destination")?.name ?? null,
      etd: pick(p, "expectedDepartureDate", "etd"),
      eta: pick(p, "expectedArrivalDate", "eta"),
      vessel: pick(p, "transportPlan")?.[0]?.vesselName ?? pick(p, "vessel"),
      voyage: pick(p, "transportPlan")?.[0]?.voyageNumber ?? pick(p, "voyage"),
    }).eq("id", shipmentId);
  }

  if (shipmentId) {
    await supabase.from("bookings").update({ shipment_id: shipmentId }).eq("id", bookingId);
  }

  // ── equipment ──
  await writeEquipment(bookingId, carrierId, rawId, p);

  // ── cargo ──
  await writeCargo(bookingId, carrierId, rawId, p);

  // ── parties ──
  await writeParties(bookingId, shipmentId, carrierId, rawId, p);

  // ── transport plan ──
  await writeTransportPlan(bookingId, shipmentId, carrierId, rawId, p);

  // ── charges ──
  await writeCharges(bookingId, carrierId, rawId, p);

  // ── instructions ──
  await writeInstructions(bookingId, carrierId, rawId, p);

  // ── references ──
  await writeReferences(bookingId, shipmentId, carrierId, rawId, p);

  // ── documents ──
  await writeDocuments(bookingId, shipmentId, carrierId, rawId, p);

  return { booking_id: bookingId, shipment_id: shipmentId };
}

/* ─── child record writers ─── */

async function writeEquipment(bookingId: string, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "requestedEquipments", "equipments", "equipment");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("booking_equipments").delete().eq("booking_id", bookingId);

  const rows = items.map((eq: any) => ({
    booking_id: bookingId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    equipment_type_code: pick(eq, "equipmentTypeCode", "type"),
    iso_equipment_code: pick(eq, "ISOEquipmentCode", "iso_equipment_code"),
    equipment_description: pick(eq, "description", "equipmentDescription"),
    quantity: pick(eq, "quantity", "units") ?? 1,
    is_shipper_owned: pick(eq, "isShipperOwned", "shipper_owned") ?? false,
    temperature_setting: pick(eq, "temperatureSetting", "temperature"),
    ventilation_setting: pick(eq, "ventilationSetting"),
    humidity_setting: pick(eq, "humiditySetting"),
    gross_weight: pick(eq, "grossWeight", "weight"),
    volume: pick(eq, "volume"),
    dangerous_goods_flag: pick(eq, "dangerousGoods", "dg") ?? false,
    overdimension_flag: pick(eq, "overdimension", "oog") ?? false,
    reefer_flag: pick(eq, "reefer", "isReefer") ?? false,
  }));

  await supabase.from("booking_equipments").insert(rows);
  await supabase.from("bookings").update({
    requested_equipment_count: rows.length,
    requested_container_count: rows.reduce((s: number, r: any) => s + (r.quantity || 1), 0),
  }).eq("id", bookingId);
}

async function writeCargo(bookingId: string, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "commodities", "cargoDetails", "cargo");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("cargo_details").delete().eq("booking_id", bookingId);

  const rows = items.map((c: any, i: number) => ({
    booking_id: bookingId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    cargo_line_number: pick(c, "lineNumber", "sequence") ?? i + 1,
    commodity_description: pick(c, "commodityDescription", "description", "commodity"),
    hs_code: pick(c, "hsCode", "hs_code", "htsCode"),
    package_count: pick(c, "packageCount", "numberOfPackages", "pieces"),
    package_type_code: pick(c, "packageTypeCode", "packageType"),
    gross_weight: pick(c, "grossWeight", "weight"),
    net_weight: pick(c, "netWeight"),
    volume: pick(c, "volume"),
    marks_and_numbers: pick(c, "marksAndNumbers", "marks"),
    dangerous_goods_flag: pick(c, "dangerousGoods", "isDG") ?? false,
  }));

  await supabase.from("cargo_details").insert(rows);
  await supabase.from("bookings").update({ requested_commodity_count: rows.length }).eq("id", bookingId);
}

async function writeParties(bookingId: string, shipmentId: string | null, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "documentParties", "parties");
  if (!Array.isArray(items) || !items.length || !shipmentId) return;

  // Delete existing parties for this booking to avoid duplicates on amendment
  await supabase.from("shipment_parties")
    .delete()
    .eq("shipment_id", shipmentId)
    .eq("booking_id", bookingId);

  const rows = items.map((party: any) => ({
    shipment_id: shipmentId,
    booking_id: bookingId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    role: (pick(party, "partyFunction", "role") || "unknown").toLowerCase(),
    company_name: pick(party, "partyName", "name", "companyName") || "Unknown",
    address: pick(party, "addressLine1", "address"),
    city: pick(party, "city"),
    state: pick(party, "state", "stateRegion"),
    postal_code: pick(party, "postalCode"),
    country: pick(party, "country", "countryCode"),
    contact_name: pick(party, "contactName", "contact"),
    email: pick(party, "email"),
    phone: pick(party, "phone", "phoneNumber"),
    tax_id: pick(party, "taxId", "identifyingCode"),
  }));

  await supabase.from("shipment_parties").insert(rows);
}

async function writeTransportPlan(bookingId: string, shipmentId: string | null, carrierId: string, rawId: string, p: Record<string, any>) {
  const legs = pick(p, "transportPlan", "transportLegs", "legs");
  if (!Array.isArray(legs) || !legs.length) return;

  await supabase.from("transport_plans").delete().eq("booking_id", bookingId);

  const rows = [];
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const [vesselId, loadLocId, dischLocId, receiptLocId, deliveryLocId] = await Promise.all([
      resolveVessel(leg, carrierId),
      resolveLocation(pick(leg, "loadLocation", "loadPort")),
      resolveLocation(pick(leg, "dischargeLocation", "dischargePort")),
      resolveLocation(pick(leg, "placeOfReceipt")),
      resolveLocation(pick(leg, "placeOfDelivery")),
    ]);

    rows.push({
      booking_id: bookingId,
      shipment_id: shipmentId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      sequence_number: pick(leg, "sequenceNumber", "sequence") ?? i + 1,
      transport_mode: pick(leg, "transportMode", "mode") || "vessel",
      vessel_name: pick(leg, "vesselName", "vessel_name"),
      voyage_number: pick(leg, "voyageNumber", "voyage"),
      vessel_id: vesselId,
      load_location_id: loadLocId,
      discharge_location_id: dischLocId,
      place_of_receipt_location_id: receiptLocId,
      place_of_delivery_location_id: deliveryLocId,
      planned_departure: pick(leg, "plannedDepartureDate", "etd"),
      planned_arrival: pick(leg, "plannedArrivalDate", "eta"),
      service_name: pick(leg, "serviceName", "service"),
    });
  }
  await supabase.from("transport_plans").insert(rows);
}

async function writeCharges(bookingId: string, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "charges");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("booking_charges").delete().eq("booking_id", bookingId);

  const rows = items.map((ch: any) => ({
    booking_id: bookingId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    charge_code: pick(ch, "chargeCode", "code"),
    charge_description: pick(ch, "chargeDescription", "description", "name"),
    amount: pick(ch, "amount", "unitPrice") ?? 0,
    currency_code: pick(ch, "currencyCode", "currency") || "USD",
    payment_term_code: pick(ch, "paymentTermCode", "paymentTerm"),
    calculation_basis: pick(ch, "calculationBasis", "basis"),
  }));
  await supabase.from("booking_charges").insert(rows);
}

async function writeInstructions(bookingId: string, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "bookingInstructions", "instructions");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("booking_instructions").delete().eq("booking_id", bookingId);

  const rows = items.map((instr: any) => ({
    booking_id: bookingId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    instruction_type: pick(instr, "instructionType", "type") || "general",
    instruction_text: pick(instr, "instructionText", "text", "instruction") || "",
  }));
  await supabase.from("booking_instructions").insert(rows);
}

async function writeReferences(bookingId: string, shipmentId: string | null, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "references");
  if (!Array.isArray(items) || !items.length || !shipmentId) return;

  for (const ref of items) {
    const refType = pick(ref, "referenceType", "type") || "carrier_reference";
    const refValue = pick(ref, "referenceValue", "value") || "";
    if (!refValue) continue;

    const { data: existing } = await supabase
      .from("shipment_references").select("id")
      .eq("shipment_id", shipmentId)
      .eq("reference_type", refType)
      .eq("reference_value", refValue)
      .maybeSingle();

    if (!existing) {
      await supabase.from("shipment_references").insert({
        shipment_id: shipmentId,
        booking_id: bookingId,
        carrier_id: carrierId,
        reference_type: refType,
        reference_value: refValue,
        is_primary: pick(ref, "isPrimary") ?? false,
        source_message_id: rawId,
      });
    }
  }
}

async function writeDocuments(bookingId: string, shipmentId: string | null, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "documents");
  if (!Array.isArray(items) || !items.length || !shipmentId) return;

  for (const doc of items) {
    await supabase.from("documents").insert({
      shipment_id: shipmentId,
      booking_id: bookingId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      doc_type: pick(doc, "documentType", "type") || "booking_confirmation",
      document_reference: pick(doc, "documentReference", "reference"),
      metadata_json: pick(doc, "metadata"),
      status: "ready",
      user_id: "00000000-0000-0000-0000-000000000000",
      file_url: "",
    });
  }
}
