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

const pick = (obj: Record<string, any> | null | undefined, ...keys: string[]) => {
  if (!obj) return null;
  for (const k of keys) if (obj[k] != null) return obj[k];
  return null;
};

/* ═══════════════════════════════════════
   Location & Vessel helpers
   ═══════════════════════════════════════ */

async function resolveLocation(loc: any): Promise<{ id: string | null; name: string | null }> {
  if (!loc) return { id: null, name: null };
  const unlocode = pick(loc, "UNLocationCode", "unlocode", "portCode");
  const facilityCode = pick(loc, "facilityCode");
  const name = pick(loc, "locationName", "name", "city", "addressName");
  if (!unlocode && !facilityCode && !name) return { id: null, name: null };

  if (unlocode) {
    const { data } = await supabase
      .from("alc_locations").select("id, location_name")
      .eq("unlocode", unlocode).maybeSingle();
    if (data) return { id: data.id, name: data.location_name || name };
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
  return { id: created?.id ?? null, name };
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
    const now = new Date();
    if (connection.access_token_encrypted && connection.token_expires_at && new Date(connection.token_expires_at) > now) {
      return { Authorization: `Bearer ${connection.access_token_encrypted}` };
    }

    const clientId = connection.oauth_client_id || Deno.env.get("EVERGREEN_CLIENT_ID");
    const secretKeyName = connection.oauth_client_secret_key_name || "EVERGREEN_CLIENT_SECRET";
    const clientSecret = Deno.env.get(secretKeyName);
    const username = Deno.env.get("EVERGREEN_USERNAME");
    const password = Deno.env.get("EVERGREEN_PASSWORD");

    if (!clientId || !clientSecret) throw new Error("OAuth credentials not configured");
    if (!connection.oauth_token_url) throw new Error("OAuth token URL not configured");

    const params = new URLSearchParams({ grant_type: "password", client_id: clientId, client_secret: clientSecret });
    if (username) params.set("username", username);
    if (password) params.set("password", password);

    const tokenRes = await fetch(connection.oauth_token_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) throw new Error(`OAuth token refresh failed [${tokenRes.status}]: ${await tokenRes.text()}`);

    const tokenData = await tokenRes.json();
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    await supabase.from("carrier_connections").update({
      access_token_encrypted: tokenData.access_token,
      token_expires_at: expiresAt,
      last_success_at: new Date().toISOString(),
    }).eq("id", connection.id);

    return { Authorization: `Bearer ${tokenData.access_token}` };
  }

  throw new Error(`Unsupported auth type: ${connection.auth_type}`);
}

async function storeRawMessage(carrierId: string, channel: string, msgType: string, ref: string | null, reqPayload: any, resPayload: any = null, httpStatus: number | null = null, status = "pending") {
  const { data, error } = await supabase
    .from("carrier_raw_messages")
    .insert({
      carrier_id: carrierId,
      source_channel: channel,
      message_family: "booking",
      message_type: msgType,
      external_reference: ref,
      payload_format: "json",
      request_payload_json: reqPayload,
      response_payload_json: resPayload,
      http_status: httpStatus,
      processing_status: status,
      received_at: new Date().toISOString(),
      processed_at: status === "processed" ? new Date().toISOString() : null,
    })
    .select("id").single();
  if (error) throw error;
  return data!.id;
}

async function findShipmentByReferences(carrierId: string, refs: string[]): Promise<string | null> {
  for (const ref of refs.filter(Boolean)) {
    const { data } = await supabase
      .from("shipment_references")
      .select("shipment_id")
      .eq("reference_value", ref)
      .maybeSingle();
    if (data?.shipment_id) return data.shipment_id;

    const { data: byBooking } = await supabase
      .from("shipments")
      .select("id")
      .eq("booking_ref", ref)
      .maybeSingle();
    if (byBooking) return byBooking.id;
  }
  return null;
}

/* ═══════════════════════════════════════
   Main Handler
   ═══════════════════════════════════════ */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    if (!action) return json({ error: "action is required" }, 400);

    switch (action) {
      case "create": return await handleCreate(body);
      case "sync": return await handleSync(body);
      case "update": return await handleUpdate(body);
      case "notification": return await handleNotification(body);
      case "cancel": return await handleCancel(body);
      default: return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error("dcsa-booking error:", err);
    return json({ error: err.message }, 500);
  }
});

/* ═══════════════════════════════════════
   1. CREATE BOOKING
   ═══════════════════════════════════════ */

async function handleCreate(body: any) {
  const { carrier_code, shipment_id, payload } = body;
  if (!carrier_code || !payload) return json({ error: "carrier_code and payload required" }, 400);

  const { data: carrier } = await supabase
    .from("alc_carriers").select("id")
    .eq("carrier_code", carrier_code.toUpperCase()).maybeSingle();
  if (!carrier) return json({ error: `Unknown carrier: ${carrier_code}` }, 404);
  const carrierId = carrier.id;

  const connection = await getCarrierConnection(carrierId);

  // Store raw outbound request
  const rawId = await storeRawMessage(carrierId, "api", "booking_create", null, payload);

  // Create integration job
  const { data: job } = await supabase
    .from("integration_jobs")
    .insert({ raw_message_id: rawId, carrier_id: carrierId, job_type: "booking_create", job_status: "running", attempt_count: 1, started_at: new Date().toISOString() })
    .select("id").single();

  try {
    let carrierResponse: any = null;
    let carrierBookingRequestRef: string | null = null;

    // Call carrier Booking API
    if (connection?.base_url) {
      const authHeaders = await getCarrierAuthHeaders(connection);
      const apiRes = await fetch(`${connection.base_url}/v2/bookings`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      carrierResponse = await apiRes.json();
      await supabase.from("carrier_raw_messages").update({ response_payload_json: carrierResponse, http_status: apiRes.status }).eq("id", rawId);

      if (!apiRes.ok && apiRes.status !== 202) {
        throw new Error(`Carrier API returned ${apiRes.status}: ${JSON.stringify(carrierResponse)}`);
      }

      carrierBookingRequestRef = pick(carrierResponse, "carrierBookingRequestReference", "bookingRequestReference");
    }

    // Find or link shipment
    let linkedShipmentId = shipment_id || null;
    if (!linkedShipmentId && carrierBookingRequestRef) {
      linkedShipmentId = await findShipmentByReferences(carrierId, [carrierBookingRequestRef]);
    }

    // Create booking record
    const bookingData: Record<string, any> = {
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      shipment_id: linkedShipmentId,
      booking_status: pick(carrierResponse, "bookingStatus") || "RECEIVED",
      booking_status_internal: "submitted",
      carrier_booking_request_reference: carrierBookingRequestRef,
      submission_datetime: new Date().toISOString(),
      booking_date: new Date().toISOString(),
      receipt_type_at_origin: pick(payload, "receiptTypeAtOrigin"),
      delivery_type_at_destination: pick(payload, "deliveryTypeAtDestination"),
      cargo_movement_type_at_origin: pick(payload, "cargoMovementTypeAtOrigin"),
      cargo_movement_type_at_destination: pick(payload, "cargoMovementTypeAtDestination"),
      service_contract_reference: pick(payload, "serviceContractReference"),
      contract_quotation_reference: pick(payload, "contractQuotationReference"),
      carrier_service_name: pick(payload, "carrierServiceName"),
      carrier_service_code: pick(payload, "carrierServiceCode"),
      universal_service_reference: pick(payload, "universalServiceReference"),
      carrier_export_voyage_number: pick(payload, "carrierExportVoyageNumber"),
      universal_export_voyage_reference: pick(payload, "universalExportVoyageReference"),
      vessel_name: pick(payload, "vesselName"),
      vessel_imo_number: pick(payload, "vesselIMONumber"),
      freight_payment_term_code: pick(payload, "paymentTermCode", "freightPaymentTermCode"),
      payment_term_code: pick(payload, "paymentTermCode"),
      inco_terms: pick(payload, "incoTerms"),
      transport_document_type_code: pick(payload, "transportDocumentTypeCode"),
      booking_channel_reference: pick(payload, "bookingChannelReference"),
      is_partial_load_allowed: pick(payload, "isPartialLoadAllowed") ?? false,
      is_export_declaration_required: pick(payload, "isExportDeclarationRequired") ?? false,
      export_declaration_reference: pick(payload, "exportDeclarationReference"),
      is_equipment_substitution_allowed: pick(payload, "isEquipmentSubstitutionAllowed") ?? false,
      declared_value: pick(payload, "declaredValue"),
      declared_value_currency: pick(payload, "declaredValueCurrency"),
      expected_departure_date: pick(payload, "expectedDepartureDate"),
      expected_arrival_at_place_of_delivery_start_date: pick(payload, "expectedArrivalAtPlaceOfDeliveryStartDate"),
      expected_arrival_at_place_of_delivery_end_date: pick(payload, "expectedArrivalAtPlaceOfDeliveryEndDate"),
      dcsa_version: "3.0",
    };

    // Resolve invoice payable at location
    const invoiceLoc = pick(payload, "invoicePayableAt");
    if (invoiceLoc) {
      const resolved = await resolveLocation(invoiceLoc);
      if (resolved.id) bookingData.invoice_payable_at_location_id = resolved.id;
    }

    const blIssueLoc = pick(payload, "placeOfBLIssue");
    if (blIssueLoc) {
      const resolved = await resolveLocation(blIssueLoc);
      if (resolved.id) bookingData.place_of_bl_issue_location_id = resolved.id;
    }

    const { data: booking, error: bkErr } = await supabase.from("bookings").insert(bookingData).select("id").single();
    if (bkErr) throw bkErr;
    const bookingId = booking.id;

    // Map child records
    await Promise.all([
      mapLocations(bookingId, linkedShipmentId, carrierId, rawId, payload),
      mapParties(bookingId, linkedShipmentId, carrierId, rawId, payload),
      mapEquipmentAndCommodities(bookingId, linkedShipmentId, carrierId, rawId, payload),
      mapCustomsReferences(bookingId, linkedShipmentId, carrierId, rawId, payload),
    ]);

    // Complete job
    await supabase.from("integration_jobs").update({ job_status: "completed", completed_at: new Date().toISOString() }).eq("id", job!.id);
    await supabase.from("carrier_raw_messages").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", rawId);

    return json({ success: true, booking_id: bookingId, carrier_booking_request_reference: carrierBookingRequestRef, shipment_id: linkedShipmentId });
  } catch (err: any) {
    await supabase.from("integration_jobs").update({ job_status: "failed", last_error: err.message, completed_at: new Date().toISOString() }).eq("id", job!.id);
    await supabase.from("carrier_raw_messages").update({ processing_status: "error", error_message: err.message }).eq("id", rawId);
    throw err;
  }
}

/* ═══════════════════════════════════════
   2. SYNC BOOKING (Poll)
   ═══════════════════════════════════════ */

async function handleSync(body: any) {
  const { booking_id, amended_content } = body;
  if (!booking_id) return json({ error: "booking_id required" }, 400);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, alc_carrier_id, carrier_booking_request_reference, carrier_booking_number, shipment_id")
    .eq("id", booking_id).single();
  if (!booking) return json({ error: "Booking not found" }, 404);

  const ref = booking.carrier_booking_number || booking.carrier_booking_request_reference;
  if (!ref) return json({ error: "No carrier reference to sync" }, 400);

  const connection = await getCarrierConnection(booking.alc_carrier_id);
  if (!connection?.base_url) return json({ error: "No active carrier connection" }, 400);

  const authHeaders = await getCarrierAuthHeaders(connection);
  let apiUrl = `${connection.base_url}/v2/bookings/${encodeURIComponent(ref)}`;
  if (amended_content) apiUrl += "?amendedContent=true";

  const apiRes = await fetch(apiUrl, { method: "GET", headers: { ...authHeaders, Accept: "application/json" } });
  const carrierPayload = await apiRes.json();

  const rawId = await storeRawMessage(
    booking.alc_carrier_id, "api", "booking_sync", ref,
    null, carrierPayload, apiRes.status,
    apiRes.ok ? "processed" : "error"
  );

  if (!apiRes.ok) {
    return json({ error: `Carrier sync failed: ${apiRes.status}`, carrier_response: carrierPayload }, apiRes.status >= 500 ? 502 : apiRes.status);
  }

  // Update booking
  await updateBookingFromPayload(booking.id, booking.alc_carrier_id, booking.shipment_id, rawId, carrierPayload);

  return json({ success: true, booking_id: booking.id });
}

/* ═══════════════════════════════════════
   3. UPDATE BOOKING (PUT)
   ═══════════════════════════════════════ */

async function handleUpdate(body: any) {
  const { booking_id, payload } = body;
  if (!booking_id || !payload) return json({ error: "booking_id and payload required" }, 400);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, alc_carrier_id, carrier_booking_request_reference, carrier_booking_number, shipment_id")
    .eq("id", booking_id).single();
  if (!booking) return json({ error: "Booking not found" }, 404);

  // Use carrierBookingReference when confirmed, otherwise carrierBookingRequestReference
  const ref = booking.carrier_booking_number || booking.carrier_booking_request_reference;
  if (!ref) return json({ error: "No carrier reference for update" }, 400);

  const rawId = await storeRawMessage(booking.alc_carrier_id, "api", "booking_update", ref, payload);

  const connection = await getCarrierConnection(booking.alc_carrier_id);
  if (!connection?.base_url) {
    // Store locally without carrier API call
    await updateBookingFromPayload(booking.id, booking.alc_carrier_id, booking.shipment_id, rawId, payload);
    await supabase.from("carrier_raw_messages").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", rawId);
    return json({ success: true, booking_id: booking.id, mode: "local" });
  }

  const authHeaders = await getCarrierAuthHeaders(connection);
  const apiRes = await fetch(`${connection.base_url}/v2/bookings/${encodeURIComponent(ref)}`, {
    method: "PUT",
    headers: { ...authHeaders, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const carrierResponse = await apiRes.json();
  await supabase.from("carrier_raw_messages").update({
    response_payload_json: carrierResponse,
    http_status: apiRes.status,
    processing_status: apiRes.ok || apiRes.status === 202 ? "processed" : "error",
    processed_at: new Date().toISOString(),
    error_message: apiRes.ok || apiRes.status === 202 ? null : `Carrier returned ${apiRes.status}`,
  }).eq("id", rawId);

  if (!apiRes.ok && apiRes.status !== 202) {
    throw new Error(`Carrier update failed [${apiRes.status}]: ${JSON.stringify(carrierResponse)}`);
  }

  // After 202, don't change booking_status — wait for poll/notification
  // But update local payload mapping
  await updateBookingFromPayload(booking.id, booking.alc_carrier_id, booking.shipment_id, rawId, payload);

  return json({ success: true, booking_id: booking.id, http_status: apiRes.status });
}

/* ═══════════════════════════════════════
   4. NOTIFICATION (Inbound webhook)
   ═══════════════════════════════════════ */

async function handleNotification(body: any) {
  const { carrier_code, payload } = body;
  if (!payload) return json({ error: "payload required" }, 400);

  let carrierId: string;
  if (carrier_code) {
    const { data: carrier } = await supabase.from("alc_carriers").select("id").eq("carrier_code", carrier_code.toUpperCase()).maybeSingle();
    if (!carrier) return json({ error: `Unknown carrier: ${carrier_code}` }, 404);
    carrierId = carrier.id;
  } else {
    return json({ error: "carrier_code required" }, 400);
  }

  const reqRef = pick(payload, "carrierBookingRequestReference");
  const bkRef = pick(payload, "carrierBookingReference");
  const rawId = await storeRawMessage(carrierId, "webhook", "booking_notification", reqRef || bkRef, payload, null, null, "pending");

  // Create notification record
  const notifData: Record<string, any> = {
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    notification_id: pick(payload, "notificationId"),
    notification_type: pick(payload, "notificationType", "type") || "booking_status",
    notification_source: pick(payload, "source") || "carrier",
    notification_time: pick(payload, "notificationDateTime", "timestamp") || new Date().toISOString(),
    booking_status: pick(payload, "bookingStatus"),
    amended_booking_status: pick(payload, "amendedBookingStatus"),
    carrier_booking_request_reference: reqRef,
    carrier_booking_reference: bkRef,
    subscription_reference: pick(payload, "subscriptionReference"),
  };

  // Match booking
  let booking: any = null;
  if (reqRef) {
    const { data } = await supabase.from("bookings")
      .select("id, alc_carrier_id, shipment_id")
      .eq("carrier_booking_request_reference", reqRef)
      .eq("alc_carrier_id", carrierId).maybeSingle();
    booking = data;
  }
  if (!booking && bkRef) {
    const { data } = await supabase.from("bookings")
      .select("id, alc_carrier_id, shipment_id")
      .eq("carrier_booking_number", bkRef)
      .eq("alc_carrier_id", carrierId).maybeSingle();
    booking = data;
  }

  if (booking) {
    notifData.booking_id = booking.id;

    // Update booking status
    const updates: Record<string, any> = { source_message_id: rawId, updated_datetime: new Date().toISOString() };
    const newStatus = pick(payload, "bookingStatus");
    if (newStatus) updates.booking_status = newStatus;
    const amendedStatus = pick(payload, "amendedBookingStatus");
    if (amendedStatus) updates.amended_booking_status = amendedStatus;
    if (bkRef) updates.carrier_booking_number = bkRef;

    // Map internal status
    if (newStatus) {
      updates.booking_status_internal = mapInternalStatus(newStatus, amendedStatus);
    }

    await supabase.from("bookings").update(updates).eq("id", booking.id);
  } else {
    // Create placeholder booking for later reconciliation
    const { data: placeholder } = await supabase.from("bookings").insert({
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      carrier_booking_request_reference: reqRef,
      carrier_booking_number: bkRef,
      booking_status: pick(payload, "bookingStatus") || "RECEIVED",
      booking_status_internal: "placeholder",
      booking_date: new Date().toISOString(),
    }).select("id").single();
    if (placeholder) notifData.booking_id = placeholder.id;
  }

  await supabase.from("booking_notifications").insert(notifData);
  await supabase.from("carrier_raw_messages").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", rawId);

  return json({ success: true, matched: !!booking, booking_id: notifData.booking_id });
}

/* ═══════════════════════════════════════
   5. CANCEL BOOKING
   ═══════════════════════════════════════ */

async function handleCancel(body: any) {
  const { booking_id } = body;
  if (!booking_id) return json({ error: "booking_id required" }, 400);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, alc_carrier_id, carrier_booking_request_reference, carrier_booking_number")
    .eq("id", booking_id).single();
  if (!booking) return json({ error: "Booking not found" }, 404);

  const ref = booking.carrier_booking_number || booking.carrier_booking_request_reference;
  const rawId = await storeRawMessage(booking.alc_carrier_id, "api", "booking_cancel", ref, { bookingStatus: "CANCELLED" });

  const connection = await getCarrierConnection(booking.alc_carrier_id);
  if (connection?.base_url && ref) {
    try {
      const authHeaders = await getCarrierAuthHeaders(connection);
      const apiRes = await fetch(`${connection.base_url}/v2/bookings/${encodeURIComponent(ref)}`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ bookingStatus: "CANCELLED" }),
      });
      const resBody = await apiRes.json();
      await supabase.from("carrier_raw_messages").update({
        response_payload_json: resBody,
        http_status: apiRes.status,
        processing_status: "processed",
        processed_at: new Date().toISOString(),
      }).eq("id", rawId);
    } catch (e: any) {
      console.error("Cancel API call failed:", e.message);
      await supabase.from("carrier_raw_messages").update({ processing_status: "error", error_message: e.message }).eq("id", rawId);
    }
  }

  // After PATCH 202, set internal status to cancellation_requested — wait for poll/notification for final state
  await supabase.from("bookings").update({
    booking_status_internal: "cancellation_requested",
    updated_datetime: new Date().toISOString(),
  }).eq("id", booking.id);

  return json({ success: true, booking_id: booking_id, booking_status_internal: "cancellation_requested" });
}

/* ═══════════════════════════════════════
   Shared: Update booking from carrier payload
   ═══════════════════════════════════════ */

async function updateBookingFromPayload(bookingId: string, carrierId: string, shipmentId: string | null, rawId: string, p: Record<string, any>) {
  const updates: Record<string, any> = {
    source_message_id: rawId,
    updated_datetime: new Date().toISOString(),
  };

  // Status fields
  const bkStatus = pick(p, "bookingStatus");
  if (bkStatus) {
    updates.booking_status = bkStatus;
    updates.booking_status_internal = mapInternalStatus(bkStatus, pick(p, "amendedBookingStatus"));
  }
  const amendedStatus = pick(p, "amendedBookingStatus");
  if (amendedStatus) updates.amended_booking_status = amendedStatus;

  const carrierRef = pick(p, "carrierBookingReference");
  if (carrierRef) updates.carrier_booking_number = carrierRef;

  // Booking details
  const fieldMap: [string, ...string[]][] = [
    ["service_contract_reference", "serviceContractReference"],
    ["contract_quotation_reference", "contractQuotationReference"],
    ["carrier_service_name", "carrierServiceName"],
    ["carrier_service_code", "carrierServiceCode"],
    ["universal_service_reference", "universalServiceReference"],
    ["carrier_export_voyage_number", "carrierExportVoyageNumber"],
    ["universal_export_voyage_reference", "universalExportVoyageReference"],
    ["vessel_name", "vesselName"],
    ["vessel_imo_number", "vesselIMONumber"],
    ["freight_payment_term_code", "paymentTermCode", "freightPaymentTermCode"],
    ["inco_terms", "incoTerms"],
    ["transport_document_type_code", "transportDocumentTypeCode"],
    ["transport_document_reference", "transportDocumentReference"],
    ["expected_departure_date", "expectedDepartureDate"],
    ["expected_arrival_at_place_of_delivery_start_date", "expectedArrivalAtPlaceOfDeliveryStartDate"],
    ["expected_arrival_at_place_of_delivery_end_date", "expectedArrivalAtPlaceOfDeliveryEndDate"],
  ];

  for (const [dbCol, ...payloadKeys] of fieldMap) {
    const val = pick(p, ...payloadKeys);
    if (val !== null) updates[dbCol] = val;
  }

  // Resolve location FKs
  const invoiceLoc = pick(p, "invoicePayableAt");
  if (invoiceLoc) {
    const resolved = await resolveLocation(invoiceLoc);
    if (resolved.id) updates.invoice_payable_at_location_id = resolved.id;
  }

  const blIssueLoc = pick(p, "placeOfBLIssue");
  if (blIssueLoc) {
    const resolved = await resolveLocation(blIssueLoc);
    if (resolved.id) updates.place_of_bl_issue_location_id = resolved.id;
  }

  await supabase.from("bookings").update(updates).eq("id", bookingId);

  // Shipment linkage
  if (!shipmentId && carrierRef) {
    const foundShipment = await findShipmentByReferences(carrierId, [carrierRef, pick(p, "carrierBookingRequestReference")].filter(Boolean) as string[]);
    if (foundShipment) {
      await supabase.from("bookings").update({ shipment_id: foundShipment }).eq("id", bookingId);
      shipmentId = foundShipment;
    }
  }

  // Re-map child records
  await Promise.all([
    mapLocations(bookingId, shipmentId, carrierId, rawId, p),
    mapParties(bookingId, shipmentId, carrierId, rawId, p),
    mapEquipmentAndCommodities(bookingId, shipmentId, carrierId, rawId, p),
    mapCustomsReferences(bookingId, shipmentId, carrierId, rawId, p),
  ]);
}

function mapInternalStatus(bookingStatus: string, amendedStatus?: string | null): string {
  const s = bookingStatus?.toUpperCase();
  if (s === "RECEIVED") return "received";
  if (s === "PENDING_UPDATE") return "pending_update";
  if (s === "UPDATE_RECEIVED") return "update_received";
  if (s === "CONFIRMED") return "confirmed";
  if (s === "PENDING_AMENDMENT") return "pending_amendment";
  if (s === "AMENDMENT_RECEIVED") return "amendment_received";
  if (s === "CANCELLED") return "cancelled";
  if (s === "REJECTED" || s === "DECLINED") return "declined";
  return "unknown";
}

/* ═══════════════════════════════════════
   Child Record Mappers
   ═══════════════════════════════════════ */

async function mapLocations(bookingId: string, shipmentId: string | null, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "shipmentLocations", "locations");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("booking_locations").delete().eq("booking_id", bookingId);

  const rows = [];
  for (const loc of items) {
    const locObj = pick(loc, "location") || loc;
    const resolved = await resolveLocation(locObj);
    rows.push({
      booking_id: bookingId,
      shipment_id: shipmentId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      location_type_code: pick(loc, "shipmentLocationTypeCode", "locationTypeCode", "type") || "unknown",
      location_id: resolved.id,
      location_name_snapshot: resolved.name || pick(locObj, "locationName", "name", "addressName"),
    });
  }
  if (rows.length) await supabase.from("booking_locations").insert(rows);
}

async function mapParties(bookingId: string, shipmentId: string | null, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "documentParties", "parties");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("booking_parties").delete().eq("booking_id", bookingId);

  const rows = items.map((party: any) => {
    const partyObj = pick(party, "party") || party;
    return {
      booking_id: bookingId,
      shipment_id: shipmentId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      party_role: pick(party, "partyFunction", "role", "partyRole") || "unknown",
      party_name: pick(partyObj, "partyName", "name", "companyName") || "Unknown",
      party_reference: pick(party, "partyReference"),
      unlocation_code: pick(partyObj, "UNLocationCode", "unlocode"),
      address_line1: pick(partyObj, "addressLine1", "address", "streetName"),
      address_line2: pick(partyObj, "addressLine2", "streetNumber"),
      city: pick(partyObj, "city", "cityName"),
      state_region: pick(partyObj, "stateRegion", "state"),
      postal_code: pick(partyObj, "postalCode"),
      country_code: pick(partyObj, "countryCode", "country"),
      contact_name: pick(partyObj, "contactName", "contact"),
      contact_email: pick(partyObj, "email"),
      contact_phone: pick(partyObj, "phone", "phoneNumber"),
      code_list_provider: pick(partyObj, "codeListProvider"),
      party_code: pick(partyObj, "partyCode"),
      tax_reference_type: pick(partyObj, "taxReferenceType"),
      tax_reference_value: pick(partyObj, "taxReference", "taxReferenceValue", "taxId"),
      purchase_order_reference: pick(party, "purchaseOrderReference"),
    };
  });
  if (rows.length) await supabase.from("booking_parties").insert(rows);
}

async function mapEquipmentAndCommodities(bookingId: string, shipmentId: string | null, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "requestedEquipments", "equipments", "equipment");
  if (!Array.isArray(items) || !items.length) return;

  // Delete existing
  await supabase.from("booking_commodities").delete().eq("booking_id", bookingId);
  await supabase.from("booking_equipments").delete().eq("booking_id", bookingId);

  for (const eq of items) {
    // Resolve pickup and positioning locations
    const pickupLoc = pick(eq, "emptyPickupLocation");
    const posLoc = pick(eq, "containerPositioningLocation");
    const [pickupResolved, posResolved] = await Promise.all([
      resolveLocation(pickupLoc),
      resolveLocation(posLoc),
    ]);

    const equipRow: Record<string, any> = {
      booking_id: bookingId,
      shipment_id: shipmentId,
      alc_carrier_id: carrierId,
      source_message_id: rawId,
      iso_equipment_code: pick(eq, "ISOEquipmentCode", "isoEquipmentCode", "equipmentTypeCode"),
      equipment_type_code: pick(eq, "ISOEquipmentCode", "equipmentTypeCode"),
      units: pick(eq, "units", "quantity") ?? 1,
      is_shipper_owned: pick(eq, "isShipperOwned") ?? false,
      is_non_operating_reefer: pick(eq, "isNonOperatingReefer") ?? false,
      tare_weight_value: pick(eq, "tareWeight", "tareWeightValue"),
      tare_weight_unit: pick(eq, "tareWeightUnit") || "KGM",
      cargo_gross_weight_value: pick(eq, "cargoGrossWeight", "cargoGrossWeightValue"),
      cargo_gross_weight_unit: pick(eq, "cargoGrossWeightUnit") || "KGM",
      equipment_reference_type: pick(eq, "equipmentReferenceType"),
      equipment_reference_value: pick(eq, "equipmentReference", "equipmentReferenceValue"),
      empty_pickup_datetime: pick(eq, "emptyPickupDateTime"),
      empty_pickup_location_id: pickupResolved.id,
      container_positioning_datetime: pick(eq, "containerPositioningDateTime"),
      container_positioning_location_id: posResolved.id,
      reefer_flag: pick(eq, "activeReeferSettings") != null || (pick(eq, "isNonOperatingReefer") ?? false),
      dangerous_goods_flag: false,
    };

    // Reefer settings
    const reefer = pick(eq, "activeReeferSettings");
    if (reefer) {
      equipRow.temperature_setting = pick(reefer, "temperatureSetpoint", "temperature");
      equipRow.ventilation_setting = pick(reefer, "ventilationSetpoint");
      equipRow.humidity_setting = pick(reefer, "humiditySetpoint");
    }

    const { data: insertedEquip } = await supabase.from("booking_equipments").insert(equipRow).select("id").single();
    if (!insertedEquip) continue;

    // Map commodities under this equipment
    const commodities = pick(eq, "commodities", "cargo") || [];
    if (Array.isArray(commodities) && commodities.length) {
      const commodityRows = commodities.map((c: any) => ({
        booking_equipment_id: insertedEquip.id,
        booking_id: bookingId,
        shipment_id: shipmentId,
        alc_carrier_id: carrierId,
        source_message_id: rawId,
        commodity_sub_reference: pick(c, "commoditySubreference", "commoditySubReference"),
        commodity_type: pick(c, "commodityType"),
        hs_code: pick(c, "hsCode", "HSCode"),
        cargo_gross_weight_value: pick(c, "cargoGrossWeight", "weight"),
        cargo_gross_weight_unit: pick(c, "cargoGrossWeightUnit", "weightUnit") || "KGM",
        cargo_gross_volume_value: pick(c, "cargoGrossVolume", "volume"),
        cargo_gross_volume_unit: pick(c, "cargoGrossVolumeUnit", "volumeUnit") || "MTQ",
        cargo_net_weight_value: pick(c, "cargoNetWeight"),
        cargo_net_weight_unit: pick(c, "cargoNetWeightUnit"),
        cargo_net_volume_value: pick(c, "cargoNetVolume"),
        cargo_net_volume_unit: pick(c, "cargoNetVolumeUnit"),
        package_code: pick(c, "packageCode", "packageTypeCode"),
        number_of_packages: pick(c, "numberOfPackages", "packageCount"),
        package_description: pick(c, "packageNameOnBL", "packageDescription", "descriptionOfGoods"),
      }));
      await supabase.from("booking_commodities").insert(commodityRows);
    }
  }
}

async function mapCustomsReferences(bookingId: string, shipmentId: string | null, carrierId: string, rawId: string, p: Record<string, any>) {
  const items = pick(p, "customsReferences", "customs");
  if (!Array.isArray(items) || !items.length) return;

  await supabase.from("booking_customs_references").delete().eq("booking_id", bookingId);

  const rows = items.map((cr: any) => ({
    booking_id: bookingId,
    shipment_id: shipmentId,
    alc_carrier_id: carrierId,
    source_message_id: rawId,
    customs_reference_type: pick(cr, "type", "customsReferenceType") || "unknown",
    country_code: pick(cr, "countryCode", "country"),
    reference_value: pick(cr, "value", "referenceValue") || "",
  }));
  if (rows.length) await supabase.from("booking_customs_references").insert(rows);
}
