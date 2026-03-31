const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface BookingPayload {
  carrier_code: string;
  message_type?: string;
  external_reference?: string;
  payload: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: BookingPayload = await req.json();
    const { carrier_code, message_type, external_reference, payload } = body;

    if (!carrier_code || !payload) {
      return new Response(
        JSON.stringify({ error: "carrier_code and payload are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Resolve carrier
    const { data: carrier } = await supabase
      .from("alc_carriers")
      .select("id")
      .eq("carrier_code", carrier_code.toUpperCase())
      .maybeSingle();

    if (!carrier) {
      return new Response(
        JSON.stringify({ error: `Unknown carrier: ${carrier_code}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const carrierId = carrier.id;

    // 2. Save raw message
    const { data: rawMsg, error: rawErr } = await supabase
      .from("carrier_raw_messages")
      .insert({
        carrier_id: carrierId,
        source_channel: "api",
        message_family: "booking",
        message_type: message_type || "booking_confirmation",
        external_reference: external_reference || payload.carrierBookingNumber || null,
        payload_format: "json",
        request_payload_json: payload,
        processing_status: "pending",
        received_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (rawErr) throw rawErr;
    const rawMessageId = rawMsg.id;

    // 3. Create integration job
    const { data: job, error: jobErr } = await supabase
      .from("integration_jobs")
      .insert({
        raw_message_id: rawMessageId,
        carrier_id: carrierId,
        job_type: "booking_transform",
        job_status: "running",
        attempt_count: 1,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobErr) throw jobErr;

    // 4. Transform booking data
    try {
      const result = await transformBooking(carrierId, rawMessageId, payload);

      // Update job success
      await supabase
        .from("integration_jobs")
        .update({ job_status: "completed", completed_at: new Date().toISOString() })
        .eq("id", job.id);

      // Update raw message
      await supabase
        .from("carrier_raw_messages")
        .update({ processing_status: "processed", processed_at: new Date().toISOString() })
        .eq("id", rawMessageId);

      return new Response(
        JSON.stringify({ success: true, raw_message_id: rawMessageId, ...result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (transformErr: any) {
      await supabase
        .from("integration_jobs")
        .update({ job_status: "failed", last_error: transformErr.message, completed_at: new Date().toISOString() })
        .eq("id", job.id);

      await supabase
        .from("carrier_raw_messages")
        .update({ processing_status: "error", error_message: transformErr.message })
        .eq("id", rawMessageId);

      throw transformErr;
    }
  } catch (err: any) {
    console.error("booking-ingest error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/* ── Transform booking payload into normalized records ── */
async function transformBooking(carrierId: string, rawMessageId: string, p: Record<string, any>) {
  // Resolve or create locations
  const resolveLocation = async (loc: any): Promise<string | null> => {
    if (!loc) return null;
    const unlocode = loc.UNLocationCode || loc.unlocode || loc.portCode || null;
    const facilityCode = loc.facilityCode || null;
    const name = loc.locationName || loc.name || loc.city || null;

    if (!unlocode && !facilityCode && !name) return null;

    if (unlocode) {
      const { data: existing } = await supabase
        .from("alc_locations")
        .select("id")
        .eq("unlocode", unlocode)
        .maybeSingle();
      if (existing) return existing.id;
    }

    const { data: created } = await supabase
      .from("alc_locations")
      .insert({
        unlocode,
        facility_code: facilityCode,
        location_name: name,
        city: loc.city || null,
        state: loc.state || loc.stateRegion || null,
        country: loc.country || loc.countryCode || null,
        address_line1: loc.addressLine1 || loc.address || null,
        postal_code: loc.postalCode || null,
        latitude: loc.latitude || null,
        longitude: loc.longitude || null,
      })
      .select("id")
      .single();
    return created?.id || null;
  };

  // Resolve or create vessel
  const resolveVessel = async (v: any): Promise<string | null> => {
    if (!v?.vesselName && !v?.vessel_name) return null;
    const vesselName = v.vesselName || v.vessel_name;
    const imo = v.imoNumber || v.imo_number || null;

    if (imo) {
      const { data: existing } = await supabase
        .from("alc_vessels")
        .select("id")
        .eq("imo_number", imo)
        .maybeSingle();
      if (existing) return existing.id;
    }

    const { data: existing2 } = await supabase
      .from("alc_vessels")
      .select("id")
      .eq("vessel_name", vesselName)
      .maybeSingle();
    if (existing2) return existing2.id;

    const { data: created } = await supabase
      .from("alc_vessels")
      .insert({
        carrier_id: carrierId,
        vessel_name: vesselName,
        imo_number: imo,
        mmsi: v.mmsi || null,
        operator_name: v.operatorName || null,
      })
      .select("id")
      .single();
    return created?.id || null;
  };

  // Extract booking-level fields (DCSA-style normalized)
  const carrierBookingNumber = p.carrierBookingNumber || p.bookingNumber || p.booking_number || null;
  const bookingStatus = p.bookingStatus || p.status || "confirmed";
  const bookingRequestStatus = p.bookingRequestStatus || null;
  const bookingConfirmationStatus = p.bookingConfirmationStatus || null;
  const amendmentNumber = p.amendmentNumber || p.amendment_number || 0;
  const bookingDate = p.bookingDate || p.booking_date || new Date().toISOString();
  const receiptType = p.receiptTypeAtOrigin || p.receipt_type_at_origin || null;
  const deliveryType = p.deliveryTypeAtDestination || p.delivery_type_at_destination || null;
  const serviceContract = p.serviceContractReference || p.service_contract_reference || null;
  const paymentTermCode = p.paymentTermCode || p.payment_term_code || null;
  const quotationRef = p.quotationReference || p.quotation_reference || null;

  // Resolve locations
  const originLoc = await resolveLocation(p.placeOfReceipt || p.origin);
  const polLoc = await resolveLocation(p.portOfLoading || p.pol);
  const podLoc = await resolveLocation(p.portOfDischarge || p.pod);
  const destLoc = await resolveLocation(p.placeOfDelivery || p.destination);

  // Create or update booking
  let bookingId: string;
  if (carrierBookingNumber) {
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("carrier_booking_number", carrierBookingNumber)
      .eq("alc_carrier_id", carrierId)
      .maybeSingle();

    if (existingBooking) {
      bookingId = existingBooking.id;
      await supabase.from("bookings").update({
        source_message_id: rawMessageId,
        booking_status: bookingStatus,
        booking_request_status: bookingRequestStatus,
        booking_confirmation_status: bookingConfirmationStatus,
        amendment_number: amendmentNumber,
        booking_date: bookingDate,
        receipt_type_at_origin: receiptType,
        delivery_type_at_destination: deliveryType,
        service_contract_reference: serviceContract,
        payment_term_code: paymentTermCode,
        quotation_reference: quotationRef,
      }).eq("id", bookingId);
    } else {
      const { data: newBooking, error: bErr } = await supabase
        .from("bookings")
        .insert({
          alc_carrier_id: carrierId,
          source_message_id: rawMessageId,
          carrier_booking_number: carrierBookingNumber,
          booking_status: bookingStatus,
          booking_request_status: bookingRequestStatus,
          booking_confirmation_status: bookingConfirmationStatus,
          amendment_number: amendmentNumber,
          booking_date: bookingDate,
          receipt_type_at_origin: receiptType,
          delivery_type_at_destination: deliveryType,
          service_contract_reference: serviceContract,
          payment_term_code: paymentTermCode,
          quotation_reference: quotationRef,
        })
        .select("id")
        .single();
      if (bErr) throw bErr;
      bookingId = newBooking.id;
    }
  } else {
    const { data: newBooking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        alc_carrier_id: carrierId,
        source_message_id: rawMessageId,
        booking_status: bookingStatus,
        booking_date: bookingDate,
      })
      .select("id")
      .single();
    if (bErr) throw bErr;
    bookingId = newBooking.id;
  }

  // Create or update shipment linked to booking
  let shipmentId: string | null = null;
  const { data: existingLink } = await supabase
    .from("bookings")
    .select("shipment_id")
    .eq("id", bookingId)
    .single();

  if (existingLink?.shipment_id) {
    shipmentId = existingLink.shipment_id;
    // Update shipment with booking data
    await supabase.from("shipments").update({
      booking_ref: carrierBookingNumber,
      alc_carrier_id: carrierId,
      booking_id: bookingId,
      origin_port: p.placeOfReceipt?.locationName || p.origin?.name || null,
      destination_port: p.placeOfDelivery?.locationName || p.destination?.name || null,
      etd: p.expectedDepartureDate || p.etd || null,
      eta: p.expectedArrivalDate || p.eta || null,
      vessel: p.transportPlan?.[0]?.vesselName || p.vessel || null,
      voyage: p.transportPlan?.[0]?.voyageNumber || p.voyage || null,
    }).eq("id", shipmentId);
  }

  // Link booking to shipment
  if (shipmentId) {
    await supabase.from("bookings").update({ shipment_id: shipmentId }).eq("id", bookingId);
  }

  // Equipment
  const equipments = p.requestedEquipments || p.equipments || p.equipment || [];
  if (Array.isArray(equipments) && equipments.length > 0) {
    // Clear old equipment for this booking
    await supabase.from("booking_equipments").delete().eq("booking_id", bookingId);
    
    const eqRows = equipments.map((eq: any) => ({
      booking_id: bookingId,
      alc_carrier_id: carrierId,
      source_message_id: rawMessageId,
      equipment_type_code: eq.equipmentTypeCode || eq.type || null,
      iso_equipment_code: eq.ISOEquipmentCode || eq.iso_equipment_code || null,
      equipment_description: eq.description || eq.equipmentDescription || null,
      quantity: eq.quantity || eq.units || 1,
      is_shipper_owned: eq.isShipperOwned || eq.shipper_owned || false,
      temperature_setting: eq.temperatureSetting || eq.temperature || null,
      ventilation_setting: eq.ventilationSetting || null,
      humidity_setting: eq.humiditySetting || null,
      gross_weight: eq.grossWeight || eq.weight || null,
      volume: eq.volume || null,
      dangerous_goods_flag: eq.dangerousGoods || eq.dg || false,
      overdimension_flag: eq.overdimension || eq.oog || false,
      reefer_flag: eq.reefer || eq.isReefer || false,
    }));
    await supabase.from("booking_equipments").insert(eqRows);

    // Update counts
    await supabase.from("bookings").update({
      requested_equipment_count: eqRows.length,
      requested_container_count: eqRows.reduce((s: number, e: any) => s + (e.quantity || 1), 0),
    }).eq("id", bookingId);
  }

  // Cargo details
  const cargoLines = p.commodities || p.cargoDetails || p.cargo || [];
  if (Array.isArray(cargoLines) && cargoLines.length > 0) {
    await supabase.from("cargo_details").delete().eq("booking_id", bookingId);
    
    const cargoRows = cargoLines.map((c: any, i: number) => ({
      booking_id: bookingId,
      alc_carrier_id: carrierId,
      source_message_id: rawMessageId,
      cargo_line_number: c.lineNumber || c.sequence || i + 1,
      commodity_description: c.commodityDescription || c.description || c.commodity || null,
      hs_code: c.hsCode || c.hs_code || c.htsCode || null,
      package_count: c.packageCount || c.numberOfPackages || c.pieces || null,
      package_type_code: c.packageTypeCode || c.packageType || null,
      gross_weight: c.grossWeight || c.weight || null,
      net_weight: c.netWeight || null,
      volume: c.volume || null,
      marks_and_numbers: c.marksAndNumbers || c.marks || null,
      dangerous_goods_flag: c.dangerousGoods || c.isDG || false,
    }));
    await supabase.from("cargo_details").insert(cargoRows);

    await supabase.from("bookings").update({
      requested_commodity_count: cargoRows.length,
    }).eq("id", bookingId);
  }

  // Parties
  const parties = p.documentParties || p.parties || [];
  if (Array.isArray(parties) && parties.length > 0 && shipmentId) {
    for (const party of parties) {
      const role = (party.partyFunction || party.role || "unknown").toLowerCase();
      const partyName = party.partyName || party.name || party.companyName || "Unknown";

      await supabase.from("shipment_parties").upsert({
        shipment_id: shipmentId,
        booking_id: bookingId,
        alc_carrier_id: carrierId,
        source_message_id: rawMessageId,
        role: role,
        company_name: partyName,
        address: party.addressLine1 || party.address || null,
        city: party.city || null,
        state: party.state || party.stateRegion || null,
        postal_code: party.postalCode || null,
        country: party.country || party.countryCode || null,
        contact_name: party.contactName || party.contact || null,
        email: party.email || null,
        phone: party.phone || party.phoneNumber || null,
        tax_id: party.taxId || party.identifyingCode || null,
      }, { onConflict: "id" });
    }
  }

  // Transport plan legs
  const legs = p.transportPlan || p.transportLegs || p.legs || [];
  if (Array.isArray(legs) && legs.length > 0) {
    await supabase.from("transport_plans").delete().eq("booking_id", bookingId);

    const legRows = [];
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const vesselId = await resolveVessel(leg);
      const loadLocId = await resolveLocation(leg.loadLocation || leg.loadPort);
      const dischLocId = await resolveLocation(leg.dischargeLocation || leg.dischargePort);
      const receiptLocId = await resolveLocation(leg.placeOfReceipt);
      const deliveryLocId = await resolveLocation(leg.placeOfDelivery);

      legRows.push({
        booking_id: bookingId,
        shipment_id: shipmentId,
        alc_carrier_id: carrierId,
        source_message_id: rawMessageId,
        sequence_number: leg.sequenceNumber || leg.sequence || i + 1,
        transport_mode: leg.transportMode || leg.mode || "vessel",
        vessel_name: leg.vesselName || leg.vessel_name || null,
        voyage_number: leg.voyageNumber || leg.voyage || null,
        vessel_id: vesselId,
        load_location_id: loadLocId,
        discharge_location_id: dischLocId,
        place_of_receipt_location_id: receiptLocId,
        place_of_delivery_location_id: deliveryLocId,
        planned_departure: leg.plannedDepartureDate || leg.etd || null,
        planned_arrival: leg.plannedArrivalDate || leg.eta || null,
        service_name: leg.serviceName || leg.service || null,
      });
    }
    await supabase.from("transport_plans").insert(legRows);
  }

  // Charges
  const charges = p.charges || [];
  if (Array.isArray(charges) && charges.length > 0) {
    await supabase.from("booking_charges").delete().eq("booking_id", bookingId);

    const chargeRows = charges.map((ch: any) => ({
      booking_id: bookingId,
      alc_carrier_id: carrierId,
      source_message_id: rawMessageId,
      charge_code: ch.chargeCode || ch.code || null,
      charge_description: ch.chargeDescription || ch.description || ch.name || null,
      amount: ch.amount || ch.unitPrice || 0,
      currency_code: ch.currencyCode || ch.currency || "USD",
      payment_term_code: ch.paymentTermCode || ch.paymentTerm || null,
      calculation_basis: ch.calculationBasis || ch.basis || null,
    }));
    await supabase.from("booking_charges").insert(chargeRows);
  }

  // Instructions
  const instructions = p.bookingInstructions || p.instructions || [];
  if (Array.isArray(instructions) && instructions.length > 0) {
    await supabase.from("booking_instructions").delete().eq("booking_id", bookingId);

    const instrRows = instructions.map((instr: any) => ({
      booking_id: bookingId,
      alc_carrier_id: carrierId,
      source_message_id: rawMessageId,
      instruction_type: instr.instructionType || instr.type || "general",
      instruction_text: instr.instructionText || instr.text || instr.instruction || "",
    }));
    await supabase.from("booking_instructions").insert(instrRows);
  }

  // References
  const references = p.references || [];
  if (Array.isArray(references) && references.length > 0 && shipmentId) {
    for (const ref of references) {
      const refType = ref.referenceType || ref.type || "carrier_reference";
      const refValue = ref.referenceValue || ref.value || "";
      if (!refValue) continue;

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
          booking_id: bookingId,
          carrier_id: carrierId,
          reference_type: refType,
          reference_value: refValue,
          is_primary: ref.isPrimary || false,
          source_message_id: rawMessageId,
        });
      }
    }
  }

  // Documents
  const docs = p.documents || [];
  if (Array.isArray(docs) && docs.length > 0 && shipmentId) {
    for (const doc of docs) {
      await supabase.from("documents").insert({
        shipment_id: shipmentId,
        booking_id: bookingId,
        alc_carrier_id: carrierId,
        source_message_id: rawMessageId,
        doc_type: doc.documentType || doc.type || "booking_confirmation",
        document_reference: doc.documentReference || doc.reference || null,
        metadata_json: doc.metadata || null,
        status: "ready",
        user_id: "00000000-0000-0000-0000-000000000000",
        file_url: "",
      });
    }
  }

  return { booking_id: bookingId, shipment_id: shipmentId };
}
