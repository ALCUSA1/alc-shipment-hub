import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const EVERGREEN_CARRIER_CODE = "EGLV";

/* ── Auth helpers (reuse evergreen-auth pattern) ── */
async function resolveCarrier(code: string) {
  const { data, error } = await supabase
    .from("alc_carriers").select("id").eq("carrier_code", code).single();
  if (error || !data) throw new Error(`Carrier not found: ${code}`);
  return data.id;
}

async function getConnection(carrierId: string) {
  const { data, error } = await supabase
    .from("carrier_connections").select("*")
    .eq("carrier_id", carrierId).eq("environment", "production").eq("status", "active").single();
  if (error) throw new Error(`No active connection: ${error.message}`);
  return data;
}

async function getOAuthToken(conn: any): Promise<string> {
  // Commercial Schedules requires scope=DCSA_CS, tokens last 60s — always request fresh
  const tokenUrl = conn.oauth_token_url;
  const username =
    Deno.env.get("EVERGREEN_USERNAME") ||
    conn.oauth_client_id ||
    Deno.env.get("EVERGREEN_CLIENT_ID");
  const password =
    Deno.env.get("EVERGREEN_PASSWORD") ||
    Deno.env.get(conn.oauth_client_secret_key_name || "EVERGREEN_CLIENT_SECRET");
  if (!tokenUrl || !username || !password) throw new Error("Evergreen OAuth config missing");

  const u = new URL(tokenUrl);
  u.searchParams.set("grant_type", "client_credentials");
  u.searchParams.set("scope", "DCSA_CS");

  const resp = await fetch(u.toString(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!resp.ok) throw new Error(`OAuth (DCSA_CS) failed (${resp.status}): ${await resp.text()}`);
  const td = await resp.json();
  await supabase.from("carrier_connections").update({
    last_success_at: new Date().toISOString(),
  }).eq("id", conn.id);
  return td.access_token;
}

async function getAuthHeaders(conn: any) {
  if (conn.auth_type === "oauth") {
    return { Authorization: `Bearer ${await getOAuthToken(conn)}`, "Content-Type": "application/json" };
  }
  const key = Deno.env.get(conn.credential_key_name);
  if (!key) throw new Error(`API key not set`);
  return { [conn.api_key_header_name || "X-API-Key"]: key, "Content-Type": "application/json" };
}

/* ── Location / Vessel resolution ── */
async function resolveLocation(loc: any): Promise<string | null> {
  if (!loc) return null;
  const unlocode = loc.UNLocationCode || loc.unLocationCode || loc.unlocode || null;
  const name = loc.locationName || loc.facilityName || loc.name || null;
  const city = loc.city || loc.cityName || null;
  const country = loc.country || loc.countryCode || null;
  if (!unlocode && !name && !city) return null;

  if (unlocode) {
    const { data: ex } = await supabase.from("alc_locations").select("id").eq("unlocode", unlocode).maybeSingle();
    if (ex) return ex.id;
  }
  const { data } = await supabase.from("alc_locations").insert({
    unlocode, location_name: name, city, country,
    facility_code: loc.facilityCode || null,
    latitude: loc.latitude || null, longitude: loc.longitude || null,
  }).select("id").single();
  return data?.id ?? null;
}

async function resolveVessel(carrierId: string, v: any): Promise<string | null> {
  if (!v) return null;
  const imo = v.vesselIMONumber || v.imoNumber || v.imo || null;
  const name = v.vesselName || v.vessel_name || v.name || null;
  if (!imo && !name) return null;

  if (imo) {
    const { data: ex } = await supabase.from("alc_vessels").select("id").eq("imo_number", imo).maybeSingle();
    if (ex) return ex.id;
  }
  const { data } = await supabase.from("alc_vessels").insert({
    carrier_id: carrierId, vessel_name: name || "Unknown", imo_number: imo,
    mmsi: v.mmsi || null, operator_name: v.operatorName || null,
  }).select("id").single();
  return data?.id ?? null;
}

/* ── Store raw message ── */
async function storeRaw(carrierId: string, family: string, type: string, payload: any) {
  const { data } = await supabase.from("carrier_raw_messages").insert({
    carrier_id: carrierId, source_channel: "api", message_family: family,
    message_type: type, payload_format: "json", response_payload_json: payload,
    processing_status: "pending", received_at: new Date().toISOString(),
  }).select("id").single();
  return data!.id;
}

/* ── Point-to-Point handler ── */
async function handlePointToPoint(carrierId: string, baseUrl: string, headers: Record<string, string>, params: any) {
  const qs = new URLSearchParams();
  if (params.placeOfReceipt) qs.set("placeOfReceipt", params.placeOfReceipt);
  if (params.placeOfDelivery) qs.set("placeOfDelivery", params.placeOfDelivery);
  if (params.portOfLoading) qs.set("UNLocationCodeOfLoadPort", params.portOfLoading);
  if (params.portOfDischarge) qs.set("UNLocationCodeOfDischargePort", params.portOfDischarge);
  if (params.departureDate) qs.set("startDate", params.departureDate);
  if (params.endDate) qs.set("endDate", params.endDate);
  if (params.carrierServiceCode) qs.set("carrierServiceCode", params.carrierServiceCode);
  if (params.maxTranshipment != null) qs.set("maxTranshipment", String(params.maxTranshipment));
  if (params.receiptTypeAtOrigin) qs.set("receiptTypeAtOrigin", params.receiptTypeAtOrigin);
  if (params.deliveryTypeAtDestination) qs.set("deliveryTypeAtDestination", params.deliveryTypeAtDestination);
  if (params.cursor) qs.set("cursor", params.cursor);
  qs.set("limit", String(params.limit || 20));

  const cleanBase = (baseUrl || "").replace(/\/$/, "");
  const url = `${cleanBase}/server/sol/route/commercial/v1/point-to-point-routes?${qs}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`Point-to-Point API error (${resp.status}): ${await resp.text()}`);

  const payload = await resp.json();
  const nextCursor = resp.headers.get("Next-Page-Cursor") || null;

  // Store raw
  const rawId = await storeRaw(carrierId, "commercial_schedule", "point_to_point_response", payload);

  // Resolve query locations
  const [porLocId, podlLocId, polLocId, podLocId] = await Promise.all([
    resolveLocation({ UNLocationCode: params.placeOfReceipt }),
    resolveLocation({ UNLocationCode: params.placeOfDelivery }),
    resolveLocation({ UNLocationCode: params.portOfLoading }),
    resolveLocation({ UNLocationCode: params.portOfDischarge }),
  ]);

  // Create query record
  const { data: queryRec } = await supabase.from("commercial_schedule_queries").insert({
    carrier_id: carrierId, source_message_id: rawId, query_type: "point_to_point",
    place_of_receipt_location_id: porLocId, place_of_delivery_location_id: podlLocId,
    port_of_loading_location_id: polLocId, port_of_discharge_location_id: podLocId,
    departure_date_from: params.departureDate || null, departure_date_to: params.endDate || null,
    service_code: params.carrierServiceCode || null,
    max_transhipment: params.maxTranshipment != null ? Number(params.maxTranshipment) : null,
    receipt_type_at_origin: params.receiptTypeAtOrigin || null,
    delivery_type_at_destination: params.deliveryTypeAtDestination || null,
    next_page_cursor: nextCursor,
  }).select("id").single();

  const queryId = queryRec?.id;

  // Parse routing solutions
  const solutions = payload.routingSolutions || payload.routings || payload || [];
  const scheduleIds: string[] = [];

  for (const sol of Array.isArray(solutions) ? solutions : [solutions]) {
    const legs = sol.legs || sol.transportLegs || [];
    const legArr = Array.isArray(legs) ? legs : [legs];

    const { data: schedRec } = await supabase.from("commercial_schedules").insert({
      carrier_id: carrierId, source_message_id: rawId, query_id: queryId,
      schedule_type: "point_to_point", schedule_source_type: "route_solution",
      service_code: sol.carrierServiceCode || sol.serviceCode || null,
      service_name: sol.carrierServiceName || sol.serviceName || null,
      transit_time_days: sol.transitTime || sol.transitTimeDays || null,
      total_leg_count: legArr.length || 1,
      is_direct_service: legArr.length <= 1,
    }).select("id").single();

    const schedId = schedRec!.id;
    scheduleIds.push(schedId);

    // Write legs
    for (let i = 0; i < legArr.length; i++) {
      const leg = legArr[i];
      const [loadLocId, dischLocId] = await Promise.all([
        resolveLocation(leg.departureLocation || leg.loadPort || leg.fromLocation),
        resolveLocation(leg.arrivalLocation || leg.dischargePort || leg.toLocation),
      ]);
      const vesselId = await resolveVessel(carrierId, leg.vessel || { vesselName: leg.vesselName, vesselIMONumber: leg.vesselIMONumber });

      await supabase.from("schedule_legs").insert({
        commercial_schedule_id: schedId, carrier_id: carrierId, source_message_id: rawId,
        sequence_number: i + 1,
        transport_mode: leg.modeOfTransport || leg.transportMode || "vessel",
        vessel_id: vesselId, vessel_name: leg.vesselName || leg.vessel?.vesselName || null,
        voyage_number: leg.carrierExportVoyageNumber || leg.voyageNumber || null,
        load_location_id: loadLocId, discharge_location_id: dischLocId,
        planned_departure: leg.departureDateTime || leg.plannedDeparture || leg.ETD || null,
        planned_arrival: leg.arrivalDateTime || leg.plannedArrival || leg.ETA || null,
        leg_transit_time_days: leg.transitTime || null,
        service_code: leg.carrierServiceCode || leg.serviceCode || null,
        service_name: leg.carrierServiceName || leg.serviceName || null,
      });

      // Cutoffs per leg
      const cutoffs = leg.cutOffTimes || leg.cutoffs || [];
      for (const co of Array.isArray(cutoffs) ? cutoffs : []) {
        const coLocId = await resolveLocation(co.location);
        await supabase.from("schedule_cutoffs").insert({
          commercial_schedule_id: schedId, carrier_id: carrierId, source_message_id: rawId,
          cutoff_type: co.cutOffDateTimeCode || co.cutoffType || "cargo_cutoff",
          cutoff_datetime: co.cutOffDateTime || co.cutoffDate || null,
          location_id: coLocId,
        });
      }
    }

    // Schedule places
    const placeOfReceipt = sol.placeOfReceipt || sol.originPlace;
    const placeOfDelivery = sol.placeOfDelivery || sol.destinationPlace;
    const placePairs: [string, any][] = [
      ["place_of_receipt", placeOfReceipt],
      ["port_of_loading", legArr[0]?.departureLocation || legArr[0]?.loadPort],
      ["port_of_discharge", legArr[legArr.length - 1]?.arrivalLocation || legArr[legArr.length - 1]?.dischargePort],
      ["place_of_delivery", placeOfDelivery],
    ];
    for (let i = 0; i < placePairs.length; i++) {
      const [role, loc] = placePairs[i];
      const locId = await resolveLocation(loc);
      if (locId) {
        await supabase.from("schedule_places").insert({
          commercial_schedule_id: schedId, carrier_id: carrierId, source_message_id: rawId,
          place_role: role, location_id: locId, sequence_number: i + 1,
        });
      }
    }

    // Transshipment ports
    if (legArr.length > 1) {
      for (let i = 0; i < legArr.length - 1; i++) {
        const tsLocId = await resolveLocation(legArr[i].arrivalLocation || legArr[i].dischargePort || legArr[i].toLocation);
        if (tsLocId) {
          await supabase.from("schedule_places").insert({
            commercial_schedule_id: schedId, carrier_id: carrierId, source_message_id: rawId,
            place_role: "transshipment_port", location_id: tsLocId, sequence_number: 100 + i,
          });
        }
      }
    }
  }

  // Mark raw as processed
  await supabase.from("carrier_raw_messages").update({
    processing_status: "processed", processed_at: new Date().toISOString(),
  }).eq("id", rawId);

  return { schedule_ids: scheduleIds, query_id: queryId, next_cursor: nextCursor, raw_message_id: rawId };
}

/* ── Port Schedule handler ── */
async function handlePortSchedule(carrierId: string, baseUrl: string, headers: Record<string, string>, params: any) {
  const qs = new URLSearchParams();
  if (params.unLocationCode) qs.set("UNLocationCode", params.unLocationCode);
  if (params.startDate) qs.set("startDate", params.startDate);
  if (params.endDate) qs.set("endDate", params.endDate);
  if (params.carrierServiceCode) qs.set("carrierServiceCode", params.carrierServiceCode);
  if (params.cursor) qs.set("cursor", params.cursor);
  qs.set("limit", String(params.limit || 50));

  const cleanBase = (baseUrl || "").replace(/\/$/, "");
  const url = `${cleanBase}/server/sol/mvs1api/commSch/v1/port?${qs}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`Port Schedule API error (${resp.status}): ${await resp.text()}`);

  const payload = await resp.json();
  const nextCursor = resp.headers.get("Next-Page-Cursor") || null;
  const rawId = await storeRaw(carrierId, "commercial_schedule", "port_schedule_response", payload);

  const portLocId = await resolveLocation({ UNLocationCode: params.unLocationCode });

  const { data: queryRec } = await supabase.from("commercial_schedule_queries").insert({
    carrier_id: carrierId, source_message_id: rawId, query_type: "port_schedule",
    un_location_code: params.unLocationCode || null,
    port_of_loading_location_id: portLocId,
    departure_date_from: params.startDate || null, departure_date_to: params.endDate || null,
    service_code: params.carrierServiceCode || null,
    next_page_cursor: nextCursor,
  }).select("id").single();

  const queryId = queryRec?.id;
  const scheduleIds: string[] = [];

  const calls = payload.portSchedules || payload.vesselSchedules || payload || [];
  for (const call of Array.isArray(calls) ? calls : [calls]) {
    const vesselId = await resolveVessel(carrierId, call.vessel || { vesselName: call.vesselName, vesselIMONumber: call.vesselIMONumber });

    const { data: schedRec } = await supabase.from("commercial_schedules").insert({
      carrier_id: carrierId, source_message_id: rawId, query_id: queryId,
      schedule_type: "port_schedule", schedule_source_type: "port_schedule",
      service_code: call.carrierServiceCode || call.serviceCode || null,
      service_name: call.carrierServiceName || null,
    }).select("id").single();

    const schedId = schedRec!.id;
    scheduleIds.push(schedId);

    // Port call timestamps
    const timestamps = call.timestamps || call.transportCallTimestamps || [];
    const arrTime = timestamps.find?.((t: any) => t.eventTypeCode === "ARRI")?.eventDateTime || call.arrivalDateTime || call.eta || null;
    const depTime = timestamps.find?.((t: any) => t.eventTypeCode === "DEPA")?.eventDateTime || call.departureDateTime || call.etd || null;

    await supabase.from("port_schedules").insert({
      commercial_schedule_id: schedId, carrier_id: carrierId, source_message_id: rawId,
      location_id: portLocId,
      facility_code: call.facilityCode || call.terminalCode || null,
      call_sequence: 1,
      arrival_datetime: arrTime, departure_datetime: depTime,
      service_code: call.carrierServiceCode || null,
      service_name: call.carrierServiceName || null,
      vessel_id: vesselId, vessel_name: call.vesselName || call.vessel?.vesselName || null,
      voyage_number: call.carrierExportVoyageNumber || call.voyageNumber || null,
      cutoff_datetime: null,
    });

    // Cutoffs
    const cutoffs = call.cutOffTimes || call.cutoffs || [];
    for (const co of Array.isArray(cutoffs) ? cutoffs : []) {
      await supabase.from("schedule_cutoffs").insert({
        commercial_schedule_id: schedId, carrier_id: carrierId, source_message_id: rawId,
        cutoff_type: co.cutOffDateTimeCode || co.cutoffType || "cargo_cutoff",
        cutoff_datetime: co.cutOffDateTime || co.cutoffDate || null,
        location_id: portLocId,
      });
    }
  }

  await supabase.from("carrier_raw_messages").update({
    processing_status: "processed", processed_at: new Date().toISOString(),
  }).eq("id", rawId);

  return { schedule_ids: scheduleIds, query_id: queryId, next_cursor: nextCursor, raw_message_id: rawId };
}

/* ── Vessel Schedule handler ── */
async function handleVesselSchedule(carrierId: string, baseUrl: string, headers: Record<string, string>, params: any) {
  const qs = new URLSearchParams();
  if (params.vesselIMONumber) qs.set("vesselIMONumber", params.vesselIMONumber);
  if (params.carrierServiceCode) qs.set("carrierServiceCode", params.carrierServiceCode);
  if (params.carrierVoyageNumber) qs.set("carrierVoyageNumber", params.carrierVoyageNumber);
  if (params.startDate) qs.set("startDate", params.startDate);
  if (params.endDate) qs.set("endDate", params.endDate);
  if (params.cursor) qs.set("cursor", params.cursor);
  qs.set("limit", String(params.limit || 50));

  const cleanBase = (baseUrl || "").replace(/\/$/, "");
  const url = `${cleanBase}/server/sol/mvs1api/commSch/v1/vessel?${qs}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`Vessel Schedule API error (${resp.status}): ${await resp.text()}`);

  const payload = await resp.json();
  const nextCursor = resp.headers.get("Next-Page-Cursor") || null;
  const rawId = await storeRaw(carrierId, "commercial_schedule", "vessel_schedule_response", payload);

  const vesselId = await resolveVessel(carrierId, { vesselIMONumber: params.vesselIMONumber, vesselName: params.vesselName });

  const { data: queryRec } = await supabase.from("commercial_schedule_queries").insert({
    carrier_id: carrierId, source_message_id: rawId, query_type: "vessel_schedule",
    vessel_id: vesselId, vessel_imo_number: params.vesselIMONumber || null,
    carrier_voyage_number: params.carrierVoyageNumber || null,
    service_code: params.carrierServiceCode || null,
    departure_date_from: params.startDate || null, departure_date_to: params.endDate || null,
    next_page_cursor: nextCursor,
  }).select("id").single();

  const queryId = queryRec?.id;
  const scheduleIds: string[] = [];

  const schedules = payload.vesselSchedules || payload || [];
  for (const sched of Array.isArray(schedules) ? schedules : [schedules]) {
    const schedVesselId = await resolveVessel(carrierId, sched.vessel || { vesselName: sched.vesselName, vesselIMONumber: sched.vesselIMONumber || params.vesselIMONumber });

    const { data: schedRec } = await supabase.from("commercial_schedules").insert({
      carrier_id: carrierId, source_message_id: rawId, query_id: queryId,
      schedule_type: "vessel_schedule", schedule_source_type: "vessel_schedule",
      service_code: sched.carrierServiceCode || sched.serviceCode || null,
      service_name: sched.carrierServiceName || null,
    }).select("id").single();

    const schedId = schedRec!.id;
    scheduleIds.push(schedId);

    // Transport calls (full rotation)
    const calls = sched.transportCalls || sched.portCalls || [];
    let firstLocId: string | null = null;
    let lastLocId: string | null = null;
    let firstDeparture: string | null = null;
    let finalArrival: string | null = null;

    for (let i = 0; i < (Array.isArray(calls) ? calls : []).length; i++) {
      const pc = calls[i];
      const locId = await resolveLocation(pc.location || pc);
      const pcVesselId = await resolveVessel(carrierId, pc.vessel || { vesselName: pc.vesselName || sched.vesselName });

      const timestamps = pc.timestamps || [];
      const arrTime = timestamps.find?.((t: any) => t.eventTypeCode === "ARRI")?.eventDateTime || pc.arrivalDateTime || pc.eta || null;
      const depTime = timestamps.find?.((t: any) => t.eventTypeCode === "DEPA")?.eventDateTime || pc.departureDateTime || pc.etd || null;

      if (i === 0) { firstLocId = locId; firstDeparture = depTime; }
      if (i === calls.length - 1) { lastLocId = locId; finalArrival = arrTime; }

      await supabase.from("port_schedules").insert({
        commercial_schedule_id: schedId, carrier_id: carrierId, source_message_id: rawId,
        location_id: locId,
        facility_code: pc.facilityCode || pc.terminalCode || null,
        call_sequence: i + 1,
        arrival_datetime: arrTime, departure_datetime: depTime,
        service_code: sched.carrierServiceCode || null,
        vessel_id: pcVesselId, vessel_name: pc.vesselName || sched.vesselName || null,
        voyage_number: pc.carrierExportVoyageNumber || pc.voyageNumber || sched.carrierVoyageNumber || null,
      });

      // Cutoffs
      const cutoffs = pc.cutOffTimes || [];
      for (const co of Array.isArray(cutoffs) ? cutoffs : []) {
        await supabase.from("schedule_cutoffs").insert({
          commercial_schedule_id: schedId, carrier_id: carrierId, source_message_id: rawId,
          cutoff_type: co.cutOffDateTimeCode || "cargo_cutoff",
          cutoff_datetime: co.cutOffDateTime || null,
          location_id: locId,
        });
      }
    }

    // Vessel schedule summary
    await supabase.from("vessel_schedules").insert({
      commercial_schedule_id: schedId, carrier_id: carrierId, source_message_id: rawId,
      vessel_id: schedVesselId,
      vessel_name: sched.vesselName || sched.vessel?.vesselName || null,
      voyage_number: sched.carrierVoyageNumber || sched.voyageNumber || null,
      service_code: sched.carrierServiceCode || null,
      service_name: sched.carrierServiceName || null,
      first_port_location_id: firstLocId,
      last_port_location_id: lastLocId,
      first_departure_datetime: firstDeparture,
      final_arrival_datetime: finalArrival,
    });
  }

  await supabase.from("carrier_raw_messages").update({
    processing_status: "processed", processed_at: new Date().toISOString(),
  }).eq("id", rawId);

  return { schedule_ids: scheduleIds, query_id: queryId, next_cursor: nextCursor, raw_message_id: rawId };
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const queryType = body.query_type;
    if (!queryType || !["point_to_point", "port_schedule", "vessel_schedule"].includes(queryType)) {
      return new Response(JSON.stringify({ error: "query_type must be point_to_point, port_schedule, or vessel_schedule" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const carrierId = await resolveCarrier(EVERGREEN_CARRIER_CODE);
    const conn = await getConnection(carrierId);
    const headers = await getAuthHeaders(conn);
    const baseUrl = conn.base_url || Deno.env.get("EVERGREEN_BASE_URL") || "";

    let result;
    switch (queryType) {
      case "point_to_point":
        result = await handlePointToPoint(carrierId, baseUrl, headers, body);
        break;
      case "port_schedule":
        result = await handlePortSchedule(carrierId, baseUrl, headers, body);
        break;
      case "vessel_schedule":
        result = await handleVesselSchedule(carrierId, baseUrl, headers, body);
        break;
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
