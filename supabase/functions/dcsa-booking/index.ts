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

const pick = (obj: Record<string, any>, ...keys: string[]) => {
  for (const k of keys) if (obj?.[k] != null) return obj[k];
  return null;
};

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

async function getCarrierConnection(carrierId: string) {
  const { data } = await supabase
    .from("carrier_connections")
    .select("*")
    .eq("carrier_id", carrierId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

async function getCarrierAuthHeaders(connection: any): Promise<Record<string, string>> {
  if (!connection) throw new Error("No active carrier connection found");

  if (connection.auth_type === "api_key") {
    const keyName = connection.credential_key_name;
    const apiKey = keyName ? Deno.env.get(keyName) : null;
    if (!apiKey) throw new Error(`API key secret ${keyName} not configured`);
    return { [connection.api_key_header_name || "Authorization"]: apiKey };
  }

  if (connection.auth_type === "oauth2") {
    // Check token expiry
    const now = new Date();
    if (connection.access_token_encrypted && connection.token_expires_at && new Date(connection.token_expires_at) > now) {
      return { Authorization: `Bearer ${connection.access_token_encrypted}` };
    }
    // Refresh token
    const clientId = connection.oauth_client_id || Deno.env.get("EVERGREEN_CLIENT_ID");
    const secretKeyName = connection.oauth_client_secret_key_name || "EVERGREEN_CLIENT_SECRET";
    const clientSecret = Deno.env.get(secretKeyName);
    const username = Deno.env.get("EVERGREEN_USERNAME");
    const password = Deno.env.get("EVERGREEN_PASSWORD");

    if (!clientId || !clientSecret) throw new Error("OAuth credentials not configured");

    const tokenUrl = connection.oauth_token_url;
    if (!tokenUrl) throw new Error("OAuth token URL not configured");

    const params = new URLSearchParams({ grant_type: "password", client_id: clientId, client_secret: clientSecret });
    if (username) params.set("username", username);
    if (password) params.set("password", password);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      throw new Error(`OAuth token refresh failed [${tokenRes.status}]: ${errBody}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await supabase.from("carrier_connections").update({
      access_token_encrypted: accessToken,
      token_expires_at: expiresAt,
      last_success_at: new Date().toISOString(),
    }).eq("id", connection.id);

    return { Authorization: `Bearer ${accessToken}` };
  }

  throw new Error(`Unsupported auth type: ${connection.auth_type}`);
}

/* ─── main handler ─── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, carrier_code, shipment_id, booking_id, payload } = body;

    if (!action) return json({ error: "action is required" }, 400);

    switch (action) {
      case "create":
        return await handleCreate(carrier_code, shipment_id, payload);
      case "sync":
        return await handleSync(booking_id);
      case "notification":
        return await handleNotification(carrier_code, payload);
      case "cancel":
        return await handleCancel(booking_id);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error("dcsa-booking error:", err);
    return json({ error: err.message }, 500);
  }
});

/* ═══════════════════════════════════════
   ACTION: Create Booking
   ═══════════════════════════════════════ */

async function handleCreate(carrierCode: string, shipmentId: string | null, payload: Record<string, any>) {
  if (!carrierCode || !payload) return json({ error: "carrier_code and payload required" }, 400);

  // Resolve carrier
  const { data: carrier } = await supabase
    .from("alc_carriers").select("id")
    .eq("carrier_code", carrierCode.toUpperCase()).maybeSingle();
  if (!carrier) return json({ error: `Unknown carrier: ${carrierCode}` }, 404);
  const carrierId = carrier.id;

  // Get connection for API call
  const connection = await getCarrierConnection(carrierId);

  // Store raw outbound request
  const { data: rawMsg, error: rawErr } = await supabase
    .from("carrier_raw_messages")
    .insert({
      carrier_id: carrierId,
      source_channel: "api",
      message_family: "booking",
      message_type: "booking_request",
      payload_format: "json",
      request_payload_json: payload,
      processing_status: "pending",
      received_at: new Date().toISOString(),
    })
    .select("id").single();
  if (rawErr) throw rawErr;
  const rawId = rawMsg.id;

  // Create integration job
  const { data: job } = await supabase
    .from("integration_jobs")
    .insert({
      raw_message_id: rawId,
      carrier_id: carrierId,
      job_type: "booking_create",
      job_status: "running",
      attempt_count: 1,
      started_at: new Date().toISOString(),
    })
    .select("id").single();

  try {
    let carrierResponse: any = null;
    let carrierBookingRequestRef: string | null = null;

    // Call carrier API if connection exists
    if (connection?.base_url) {
      const authHeaders = await getCarrierAuthHeaders(connection);
      const apiUrl = `${connection.base_url}/v2/bookings`;

      const apiRes = await fetch(apiUrl, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      carrierResponse = await apiRes.json();

      // Store response
      await supabase.from("carrier_raw_messages").update({
        response_payload_json: carrierResponse,
        http_status: apiRes.status,
      }).eq("id", rawId);

      if (!apiRes.ok) {
        throw new Error(`Carrier API returned ${apiRes.status}: ${JSON.stringify(carrierResponse)}`);
      }

      carrierBookingRequestRef = pick(carrierResponse, "carrierBookingRequestReference", "bookingRequestReference");
    }

    // Create booking record
    const bookingData: Record<string, any> = {
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      booking_status: "RECEIVED",
      carrier_booking_request_reference: carrierBookingRequestRef,
      submission_datetime: new Date().toISOString(),
      booking_date: new Date().toISOString(),
      receipt_type_at_origin: pick(payload, "receiptTypeAtOrigin"),
      delivery_type_at_destination: pick(payload, "deliveryTypeAtDestination"),
      service_contract_reference: pick(payload, "serviceContractReference"),
      payment_term_code: pick(payload, "paymentTermCode"),
      transport_document_type_code: pick(payload, "transportDocumentTypeCode"),
      is_partial_load_allowed: pick(payload, "isPartialLoadAllowed") ?? false,
      is_export_declaration_required: pick(payload, "isExportDeclarationRequired") ?? false,
      is_import_license_required: pick(payload, "isImportLicenseRequired") ?? false,
      communication_channel_code: pick(payload, "communicationChannelCode"),
      is_equipment_substitution_allowed: pick(payload, "isEquipmentSubstitutionAllowed") ?? false,
      vessel_imo_number: pick(payload, "vesselIMONumber"),
      expected_departure_date: pick(payload, "expectedDepartureDate"),
      expected_arrival_date: pick(payload, "expectedArrivalDate"),
      dcsa_version: "2.0",
    };

    if (shipmentId) bookingData.shipment_id = shipmentId;

    const { data: booking, error: bkErr } = await supabase
      .from("bookings").insert(bookingData).select("id").single();
    if (bkErr) throw bkErr;
    const bookingId = booking.id;

    // Write child records
    await Promise.all([
      writeBookingLocations(bookingId, carrierId, rawId, payload),
      writeBookingParties(bookingId, carrierId, rawId, payload),
      writeBookingEquipments(bookingId, carrierId, rawId, payload),
      writeBookingCommodities(bookingId, carrierId, rawId, payload),
    ]);

    // Mark job complete
    await supabase.from("integration_jobs")
      .update({ job_status: "completed", completed_at: new Date().toISOString() })
      .eq("id", job!.id);
    await supabase.from("carrier_raw_messages")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("id", rawId);

    return json({ success: true, booking_id: bookingId, carrier_booking_request_reference: carrierBookingRequestRef });
  } catch (err: any) {
    await supabase.from("integration_jobs")
      .update({ job_status: "failed", last_error: err.message, completed_at: new Date().toISOString() })
      .eq("id", job!.id);
    await supabase.from("carrier_raw_messages")
      .update({ processing_status: "error", error_message: err.message })
      .eq("id", rawId);
    throw err;
  }
}

/* ═══════════════════════════════════════
   ACTION: Sync Booking (poll carrier)
   ═══════════════════════════════════════ */

async function handleSync(bookingId: string) {
  if (!bookingId) return json({ error: "booking_id required" }, 400);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, alc_carrier_id, carrier_booking_request_reference, carrier_booking_number")
    .eq("id", bookingId).single();
  if (!booking) return json({ error: "Booking not found" }, 404);

  const ref = booking.carrier_booking_number || booking.carrier_booking_request_reference;
  if (!ref) return json({ error: "No carrier reference to sync" }, 400);

  const connection = await getCarrierConnection(booking.alc_carrier_id);
  if (!connection?.base_url) return json({ error: "No active carrier connection" }, 400);

  const authHeaders = await getCarrierAuthHeaders(connection);
  const apiUrl = `${connection.base_url}/v2/bookings/${encodeURIComponent(ref)}`;

  const apiRes = await fetch(apiUrl, {
    method: "GET",
    headers: { ...authHeaders, Accept: "application/json" },
  });

  const carrierPayload = await apiRes.json();

  // Store raw response
  const { data: rawMsg } = await supabase
    .from("carrier_raw_messages")
    .insert({
      carrier_id: booking.alc_carrier_id,
      source_channel: "api",
      message_family: "booking",
      message_type: "booking_sync",
      external_reference: ref,
      payload_format: "json",
      response_payload_json: carrierPayload,
      http_status: apiRes.status,
      processing_status: apiRes.ok ? "processed" : "error",
      received_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      error_message: apiRes.ok ? null : `Carrier returned ${apiRes.status}`,
    })
    .select("id").single();

  if (!apiRes.ok) {
    return json({ error: `Carrier sync failed: ${apiRes.status}`, carrier_response: carrierPayload }, apiRes.status >= 500 ? 502 : apiRes.status);
  }

  // Update booking with carrier response
  const updates: Record<string, any> = {
    source_message_id: rawMsg!.id,
    updated_datetime: new Date().toISOString(),
  };

  const newStatus = pick(carrierPayload, "bookingStatus", "booking_status");
  if (newStatus) updates.booking_status = newStatus;

  const amendedStatus = pick(carrierPayload, "amendedBookingStatus");
  if (amendedStatus) updates.amended_booking_status = amendedStatus;

  const carrierRef = pick(carrierPayload, "carrierBookingReference", "carrier_booking_reference");
  if (carrierRef) updates.carrier_booking_number = carrierRef;

  await supabase.from("bookings").update(updates).eq("id", bookingId);

  // Re-map child records if present
  await Promise.all([
    writeBookingLocations(bookingId, booking.alc_carrier_id, rawMsg!.id, carrierPayload),
    writeBookingParties(bookingId, booking.alc_carrier_id, rawMsg!.id, carrierPayload),
    writeBookingEquipments(bookingId, booking.alc_carrier_id, rawMsg!.id, carrierPayload),
    writeBookingCommodities(bookingId, booking.alc_carrier_id, rawMsg!.id, carrierPayload),
  ]);

  return json({ success: true, booking_status: updates.booking_status || booking.carrier_booking_number });
}

/* ═══════════════════════════════════════
   ACTION: Webhook Notification
   ═══════════════════════════════════════ */

async function handleNotification(carrierCode: string, payload: Record<string, any>) {
  if (!payload) return json({ error: "payload required" }, 400);

  // Resolve carrier
  let carrierId: string;
  if (carrierCode) {
    const { data: carrier } = await supabase
      .from("alc_carriers").select("id")
      .eq("carrier_code", carrierCode.toUpperCase()).maybeSingle();
    if (!carrier) return json({ error: `Unknown carrier: ${carrierCode}` }, 404);
    carrierId = carrier.id;
  } else {
    return json({ error: "carrier_code required for notifications" }, 400);
  }

  // Store raw notification
  const bookingRef = pick(payload, "carrierBookingRequestReference", "carrierBookingReference", "bookingReference");
  const { data: rawMsg } = await supabase
    .from("carrier_raw_messages")
    .insert({
      carrier_id: carrierId,
      source_channel: "webhook",
      message_family: "booking",
      message_type: "booking_notification",
      external_reference: bookingRef,
      payload_format: "json",
      request_payload_json: payload,
      processing_status: "pending",
      received_at: new Date().toISOString(),
    })
    .select("id").single();

  // Find matching booking
  let booking: any = null;
  if (bookingRef) {
    const { data } = await supabase
      .from("bookings")
      .select("id, alc_carrier_id, shipment_id")
      .or(`carrier_booking_request_reference.eq.${bookingRef},carrier_booking_number.eq.${bookingRef}`)
      .eq("alc_carrier_id", carrierId)
      .maybeSingle();
    booking = data;
  }

  if (!booking) {
    await supabase.from("carrier_raw_messages")
      .update({ processing_status: "unmatched", error_message: "No matching booking found" })
      .eq("id", rawMsg!.id);
    return json({ success: true, matched: false, message: "Notification stored but no matching booking found" });
  }

  // Update booking status
  const updates: Record<string, any> = {
    source_message_id: rawMsg!.id,
    updated_datetime: new Date().toISOString(),
  };

  const newStatus = pick(payload, "bookingStatus", "booking_status");
  if (newStatus) updates.booking_status = newStatus;

  const amendedStatus = pick(payload, "amendedBookingStatus");
  if (amendedStatus) updates.amended_booking_status = amendedStatus;

  const carrierRef = pick(payload, "carrierBookingReference");
  if (carrierRef) updates.carrier_booking_number = carrierRef;

  await supabase.from("bookings").update(updates).eq("id", booking.id);

  await supabase.from("carrier_raw_messages")
    .update({ processing_status: "processed", processed_at: new Date().toISOString() })
    .eq("id", rawMsg!.id);

  return json({ success: true, matched: true, booking_id: booking.id, booking_status: newStatus });
}

/* ═══════════════════════════════════════
   ACTION: Cancel Booking
   ═══════════════════════════════════════ */

async function handleCancel(bookingId: string) {
  if (!bookingId) return json({ error: "booking_id required" }, 400);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, alc_carrier_id, carrier_booking_request_reference, carrier_booking_number")
    .eq("id", bookingId).single();
  if (!booking) return json({ error: "Booking not found" }, 404);

  const ref = booking.carrier_booking_request_reference;
  const connection = await getCarrierConnection(booking.alc_carrier_id);

  // Call carrier cancel API if available
  if (connection?.base_url && ref) {
    try {
      const authHeaders = await getCarrierAuthHeaders(connection);
      const apiUrl = `${connection.base_url}/v2/bookings/${encodeURIComponent(ref)}`;
      await fetch(apiUrl, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ bookingStatus: "CANCELLED" }),
      });
    } catch (e: any) {
      console.error("Cancel API call failed:", e.message);
    }
  }

  await supabase.from("bookings")
    .update({ booking_status: "CANCELLED", updated_datetime: new Date().toISOString() })
    .eq("id", bookingId);

  return json({ success: true, booking_id: bookingId, booking_status: "CANCELLED" });
}

/* ─── child record writers ─── */

async function writeBookingLocations(bookingId: string, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "shipmentLocations", "locations");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("booking_locations").delete().eq("booking_id", bookingId);

  const rows = [];
  for (const loc of items) {
    const locationId = await resolveLocation(pick(loc, "location"));
    rows.push({
      booking_id: bookingId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      location_type: pick(loc, "shipmentLocationTypeCode", "locationType", "type") || "unknown",
      location_id: locationId,
      un_location_code: pick(loc, "location", "")?.UNLocationCode || pick(loc, "UNLocationCode", "unlocode"),
      facility_code: pick(loc, "location", "")?.facilityCode || pick(loc, "facilityCode"),
      facility_code_list_provider: pick(loc, "facilityCodeListProvider"),
      address_name: pick(loc, "location", "")?.locationName || pick(loc, "addressName", "name"),
    });
  }

  if (rows.length) await supabase.from("booking_locations").insert(rows);
}

async function writeBookingParties(bookingId: string, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "documentParties", "parties");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("booking_parties").delete().eq("booking_id", bookingId);

  const rows = items.map((party: any) => ({
    booking_id: bookingId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    party_function: pick(party, "partyFunction", "role", "function") || "unknown",
    party_name: pick(party, "partyName", "name", "companyName") || "Unknown",
    address_line_1: pick(party, "addressLine1", "address"),
    address_line_2: pick(party, "addressLine2"),
    city: pick(party, "city"),
    state_region: pick(party, "stateRegion", "state"),
    postal_code: pick(party, "postalCode"),
    country_code: pick(party, "countryCode", "country"),
    tax_id: pick(party, "taxId", "identifyingCode"),
    contact_name: pick(party, "contactName", "contact"),
    contact_email: pick(party, "email"),
    contact_phone: pick(party, "phone", "phoneNumber"),
    identifying_codes: pick(party, "identifyingCodes"),
    is_to_be_notified: pick(party, "isToBeNotified") ?? false,
  }));

  if (rows.length) await supabase.from("booking_parties").insert(rows);
}

async function writeBookingEquipments(bookingId: string, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "requestedEquipments", "equipments", "equipment");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("booking_equipments").delete().eq("booking_id", bookingId);

  const rows = items.map((eq: any) => ({
    booking_id: bookingId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    equipment_type_code: pick(eq, "ISOEquipmentCode", "equipmentTypeCode", "type"),
    iso_equipment_code: pick(eq, "ISOEquipmentCode", "iso_equipment_code"),
    equipment_description: pick(eq, "description", "equipmentDescription"),
    quantity: pick(eq, "units", "quantity") ?? 1,
    is_shipper_owned: pick(eq, "isShipperOwned") ?? false,
    temperature_setting: pick(eq, "activeReeferSettings")?.temperatureSetpoint || pick(eq, "temperatureSetting"),
    ventilation_setting: pick(eq, "activeReeferSettings")?.ventilationSetpoint || pick(eq, "ventilationSetting"),
    humidity_setting: pick(eq, "activeReeferSettings")?.humiditySetpoint || pick(eq, "humiditySetting"),
    gross_weight: pick(eq, "tareWeight", "grossWeight", "weight"),
    volume: pick(eq, "volume"),
    dangerous_goods_flag: pick(eq, "isNonOperatingReefer") !== null ? false : (pick(eq, "dangerousGoods") ?? false),
    overdimension_flag: pick(eq, "overdimension", "oog") ?? false,
    reefer_flag: pick(eq, "activeReeferSettings") !== null || (pick(eq, "isNonOperatingReefer") ?? false),
  }));

  if (rows.length) await supabase.from("booking_equipments").insert(rows);
}

async function writeBookingCommodities(bookingId: string, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "commodities", "cargo", "cargoDetails");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("booking_commodities").delete().eq("booking_id", bookingId);

  const rows = items.map((c: any) => ({
    booking_id: bookingId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    commodity_type: pick(c, "commodityType"),
    commodity_subreference: pick(c, "commoditySubreference", "subreference"),
    description_of_goods: pick(c, "descriptionOfGoods", "commodityDescription", "description"),
    hs_code: pick(c, "hsCode", "HSCode", "hs_code"),
    weight: pick(c, "weight", "grossWeight"),
    weight_unit: pick(c, "weightUnit") || "KGM",
    volume: pick(c, "volume"),
    volume_unit: pick(c, "volumeUnit") || "MTQ",
    number_of_packages: pick(c, "numberOfPackages", "packageCount"),
    package_code: pick(c, "packageCode", "packageTypeCode"),
    package_name_on_bl: pick(c, "packageNameOnBL"),
    export_license_required: pick(c, "exportLicenseRequired") ?? false,
    export_license_expiry_date: pick(c, "exportLicenseExpiryDate"),
  }));

  if (rows.length) await supabase.from("booking_commodities").insert(rows);
}
