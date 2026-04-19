import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Hapag-Lloyd DCSA Commercial Schedules
 *  - point_to_point  → /point-to-point-routes
 *  - vessel_schedule → /vessel-schedules
 *
 * Auth: IBM API Connect (X-IBM-Client-Id + X-IBM-Client-Secret)
 * Falls back to a deterministic simulation when credentials are missing
 * so the rest of the platform stays functional in dev.
 */

const HLAG_CARRIER_CODE = "HLCU";
const HLAG_BASE_URL = "https://api.hlag.com/hlag/external/v1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/* ── helpers ── */
async function resolveCarrier(): Promise<string> {
  const { data, error } = await supabase
    .from("alc_carriers")
    .select("id")
    .eq("carrier_code", HLAG_CARRIER_CODE)
    .single();
  if (error || !data) throw new Error(`Carrier ${HLAG_CARRIER_CODE} not found`);
  return data.id;
}

async function resolveLocation(loc: any): Promise<string | null> {
  if (!loc) return null;
  const unlocode = loc.UNLocationCode || loc.unLocationCode || loc.unlocode || null;
  const name = loc.locationName || loc.facilityName || loc.name || null;
  const city = loc.city || loc.cityName || null;
  const country = loc.country || loc.countryCode || null;
  if (!unlocode && !name && !city) return null;

  if (unlocode) {
    const { data: ex } = await supabase
      .from("alc_locations")
      .select("id")
      .eq("unlocode", unlocode)
      .maybeSingle();
    if (ex) return ex.id;
  }
  const { data } = await supabase
    .from("alc_locations")
    .insert({
      unlocode, location_name: name, city, country,
      facility_code: loc.facilityCode || null,
      latitude: loc.latitude ?? null, longitude: loc.longitude ?? null,
    })
    .select("id").single();
  return data?.id ?? null;
}

async function resolveVessel(carrierId: string, v: any): Promise<string | null> {
  if (!v) return null;
  const imo = v.vesselIMONumber || v.imoNumber || v.imo || null;
  const name = v.vesselName || v.name || null;
  if (!imo && !name) return null;
  if (imo) {
    const { data: ex } = await supabase
      .from("alc_vessels").select("id").eq("imo_number", imo).maybeSingle();
    if (ex) return ex.id;
  }
  const { data } = await supabase
    .from("alc_vessels")
    .insert({
      carrier_id: carrierId,
      vessel_name: name || "Unknown",
      imo_number: imo,
      operator_name: v.operatorName || "Hapag-Lloyd",
    })
    .select("id").single();
  return data?.id ?? null;
}

async function storeRaw(carrierId: string, type: string, payload: any) {
  const { data } = await supabase.from("carrier_raw_messages").insert({
    carrier_id: carrierId,
    source_channel: "api",
    message_family: "commercial_schedule",
    message_type: type,
    payload_format: "json",
    response_payload_json: payload,
    processing_status: "pending",
    received_at: new Date().toISOString(),
  }).select("id").single();
  return data!.id;
}

/* ── HLAG API call ── */
async function callHlag(path: string, params: Record<string, any>) {
  const clientId = Deno.env.get("HLAG_CLIENT_ID");
  const clientSecret = Deno.env.get("HLAG_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return { simulated: true, payload: simulatePayload(path, params) };
  }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") qs.set(k, String(v));
  }
  const url = `${HLAG_BASE_URL}${path}?${qs}`;
  try {
    const resp = await fetch(url, {
      headers: {
        "X-IBM-Client-Id": clientId,
        "X-IBM-Client-Secret": clientSecret,
        "Accept": "application/json",
        "API-Version": "1",
      },
    });
    let text = "";
    try { text = await resp.text(); } catch (_) { text = ""; }
    if (!resp.ok) {
      console.warn(`HLAG ${path} → ${resp.status}: ${text.slice(0, 300)} — simulation fallback`);
      return { simulated: true, payload: simulatePayload(path, params), upstreamStatus: resp.status, upstreamBody: text.slice(0, 300) };
    }
    let parsed: any = {};
    try { parsed = text ? JSON.parse(text) : {}; } catch (_) { parsed = {}; }
    return {
      simulated: false,
      payload: parsed,
      nextCursor: resp.headers.get("Next-Page-Cursor"),
    };
  } catch (err) {
    console.warn(`HLAG ${path} fetch error: ${(err as Error).message} — simulation fallback`);
    return { simulated: true, payload: simulatePayload(path, params), upstreamError: (err as Error).message };
  }
}

/* ── simulation fallback (no creds) ── */
function simulatePayload(path: string, params: Record<string, any>) {
  const por = params.placeOfReceipt || "DEHAM";
  const pod = params.placeOfDelivery || "USNYC";
  const today = new Date();
  const etd = new Date(today.getTime() + 5 * 86400000);
  const eta = new Date(etd.getTime() + 18 * 86400000);
  if (path === "/point-to-point-routes") {
    return [
      {
        carrierServiceCode: "ATX",
        carrierServiceName: "Atlantic Express",
        transitTime: 18,
        placeOfReceipt: { UNLocationCode: por },
        placeOfDelivery: { UNLocationCode: pod },
        legs: [{
          modeOfTransport: "vessel",
          vesselName: "Hamburg Express",
          vesselIMONumber: "9450478",
          carrierExportVoyageNumber: "025W",
          departureLocation: { UNLocationCode: por },
          arrivalLocation: { UNLocationCode: pod },
          departureDateTime: etd.toISOString(),
          arrivalDateTime: eta.toISOString(),
          transitTime: 18,
        }],
      },
    ];
  }
  return [];
}

/* ── ingest a routing solution ── */
async function ingestPointToPoint(carrierId: string, params: any, payload: any) {
  const rawId = await storeRaw(carrierId, "point_to_point_response", payload);
  const solutions = payload.routingSolutions || payload.routings || payload || [];
  const arr = Array.isArray(solutions) ? solutions : [solutions];

  const [porLocId, podlLocId] = await Promise.all([
    resolveLocation({ UNLocationCode: params.placeOfReceipt }),
    resolveLocation({ UNLocationCode: params.placeOfDelivery }),
  ]);

  const { data: queryRec } = await supabase
    .from("commercial_schedule_queries").insert({
      carrier_id: carrierId,
      source_message_id: rawId,
      query_type: "point_to_point",
      place_of_receipt_location_id: porLocId,
      place_of_delivery_location_id: podlLocId,
      departure_date_from: params.departureStartDate || null,
      departure_date_to: params.departureEndDate || null,
    }).select("id").single();

  const scheduleIds: string[] = [];
  const summaries: any[] = [];

  for (const sol of arr) {
    const legs = sol.legs || sol.transportLegs || [];
    const legArr = Array.isArray(legs) ? legs : [legs];

    const { data: schedRec } = await supabase
      .from("commercial_schedules").insert({
        carrier_id: carrierId,
        source_message_id: rawId,
        query_id: queryRec?.id,
        schedule_type: "point_to_point",
        schedule_source_type: "route_solution",
        service_code: sol.carrierServiceCode || sol.serviceCode || null,
        service_name: sol.carrierServiceName || sol.serviceName || null,
        transit_time_days: sol.transitTime || sol.transitTimeDays || null,
        total_leg_count: legArr.length || 1,
        is_direct_service: legArr.length <= 1,
      }).select("id").single();

    const schedId = schedRec!.id;
    scheduleIds.push(schedId);

    let firstDep: string | null = null;
    let lastArr: string | null = null;

    for (let i = 0; i < legArr.length; i++) {
      const leg = legArr[i];
      const [loadLocId, dischLocId] = await Promise.all([
        resolveLocation(leg.departureLocation || leg.loadPort || leg.fromLocation),
        resolveLocation(leg.arrivalLocation || leg.dischargePort || leg.toLocation),
      ]);
      const vesselId = await resolveVessel(carrierId, leg.vessel || {
        vesselName: leg.vesselName, vesselIMONumber: leg.vesselIMONumber,
      });

      const dep = leg.departureDateTime || leg.plannedDeparture || leg.ETD || null;
      const arr2 = leg.arrivalDateTime || leg.plannedArrival || leg.ETA || null;
      if (i === 0) firstDep = dep;
      if (i === legArr.length - 1) lastArr = arr2;

      await supabase.from("schedule_legs").insert({
        commercial_schedule_id: schedId,
        carrier_id: carrierId,
        source_message_id: rawId,
        sequence_number: i + 1,
        transport_mode: leg.modeOfTransport || "vessel",
        vessel_id: vesselId,
        vessel_name: leg.vesselName || null,
        voyage_number: leg.carrierExportVoyageNumber || leg.voyageNumber || null,
        load_location_id: loadLocId,
        discharge_location_id: dischLocId,
        planned_departure: dep,
        planned_arrival: arr2,
        leg_transit_time_days: leg.transitTime || null,
        service_code: leg.carrierServiceCode || sol.carrierServiceCode || null,
        service_name: leg.carrierServiceName || sol.carrierServiceName || null,
      });
    }

    summaries.push({
      schedule_id: schedId,
      carrier: "Hapag-Lloyd",
      service_code: sol.carrierServiceCode || null,
      service_name: sol.carrierServiceName || null,
      transit_days: sol.transitTime || null,
      etd: firstDep,
      eta: lastArr,
      leg_count: legArr.length || 1,
      is_direct: legArr.length <= 1,
    });
  }

  await supabase.from("carrier_raw_messages").update({
    processing_status: "processed",
    processed_at: new Date().toISOString(),
  }).eq("id", rawId);

  return { schedule_ids: scheduleIds, raw_message_id: rawId, sailings: summaries };
}

/* ── ingest vessel schedule ── */
async function ingestVesselSchedule(carrierId: string, params: any, payload: any) {
  const rawId = await storeRaw(carrierId, "vessel_schedule_response", payload);
  const arr = Array.isArray(payload?.vesselSchedules)
    ? payload.vesselSchedules
    : Array.isArray(payload) ? payload : [payload];

  const scheduleIds: string[] = [];

  for (const sched of arr) {
    const vesselId = await resolveVessel(carrierId, {
      vesselName: sched.vesselName,
      vesselIMONumber: sched.vesselIMONumber || params.vesselIMONumber,
    });

    const { data: schedRec } = await supabase
      .from("commercial_schedules").insert({
        carrier_id: carrierId,
        source_message_id: rawId,
        schedule_type: "vessel_schedule",
        schedule_source_type: "vessel_schedule",
        service_code: sched.carrierServiceCode || null,
        service_name: sched.carrierServiceName || null,
      }).select("id").single();

    const schedId = schedRec!.id;
    scheduleIds.push(schedId);

    const calls = sched.transportCalls || sched.portCalls || [];
    let firstLocId: string | null = null;
    let lastLocId: string | null = null;
    let firstDep: string | null = null;
    let lastArr: string | null = null;
    const callArr = Array.isArray(calls) ? calls : [];

    for (let i = 0; i < callArr.length; i++) {
      const pc = callArr[i];
      const locId = await resolveLocation(pc.location || pc);
      const ts = pc.timestamps || [];
      const arrTime = ts.find?.((t: any) => t.eventTypeCode === "ARRI")?.eventDateTime
        || pc.arrivalDateTime || pc.eta || null;
      const depTime = ts.find?.((t: any) => t.eventTypeCode === "DEPA")?.eventDateTime
        || pc.departureDateTime || pc.etd || null;

      if (i === 0) { firstLocId = locId; firstDep = depTime; }
      if (i === callArr.length - 1) { lastLocId = locId; lastArr = arrTime; }

      await supabase.from("port_schedules").insert({
        commercial_schedule_id: schedId,
        carrier_id: carrierId,
        source_message_id: rawId,
        location_id: locId,
        facility_code: pc.facilityCode || null,
        call_sequence: i + 1,
        arrival_datetime: arrTime,
        departure_datetime: depTime,
        service_code: sched.carrierServiceCode || null,
        vessel_id: vesselId,
        vessel_name: sched.vesselName || null,
        voyage_number: sched.carrierVoyageNumber || pc.carrierExportVoyageNumber || null,
      });
    }

    await supabase.from("vessel_schedules").insert({
      commercial_schedule_id: schedId,
      carrier_id: carrierId,
      source_message_id: rawId,
      vessel_id: vesselId,
      vessel_name: sched.vesselName || null,
      voyage_number: sched.carrierVoyageNumber || null,
      service_code: sched.carrierServiceCode || null,
      service_name: sched.carrierServiceName || null,
      first_port_location_id: firstLocId,
      last_port_location_id: lastLocId,
      first_departure_datetime: firstDep,
      final_arrival_datetime: lastArr,
    });
  }

  await supabase.from("carrier_raw_messages").update({
    processing_status: "processed",
    processed_at: new Date().toISOString(),
  }).eq("id", rawId);

  return { schedule_ids: scheduleIds, raw_message_id: rawId };
}

/* ── HTTP handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const queryType = body.query_type || "point_to_point";
    if (!["point_to_point", "vessel_schedule"].includes(queryType)) {
      return new Response(JSON.stringify({ error: "query_type must be point_to_point or vessel_schedule" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const carrierId = await resolveCarrier();

    if (queryType === "point_to_point") {
      if (!body.placeOfReceipt || !body.placeOfDelivery) {
        return new Response(JSON.stringify({ error: "placeOfReceipt and placeOfDelivery required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const params = {
        placeOfReceipt: body.placeOfReceipt,
        placeOfDelivery: body.placeOfDelivery,
        departureStartDate: body.departureStartDate || null,
        departureEndDate: body.departureEndDate || null,
        arrivalStartDate: body.arrivalStartDate || null,
        arrivalEndDate: body.arrivalEndDate || null,
        maxTranshipment: body.maxTranshipment ?? null,
        receiptTypeAtOrigin: body.receiptTypeAtOrigin || null,
        deliveryTypeAtDestination: body.deliveryTypeAtDestination || null,
        limit: body.limit || 10,
        cursor: body.cursor || null,
      };
      const { simulated, payload } = await callHlag("/point-to-point-routes", params);
      const result = await ingestPointToPoint(carrierId, params, payload);
      return new Response(JSON.stringify({ success: true, simulated, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // vessel_schedule
    const params = {
      vesselIMONumber: body.vesselIMONumber || null,
      vesselName: body.vesselName || null,
      carrierServiceCode: body.carrierServiceCode || null,
      universalServiceReference: body.universalServiceReference || null,
      carrierVoyageNumber: body.carrierVoyageNumber || null,
      universalVoyageReference: body.universalVoyageReference || null,
      UNLocationCode: body.UNLocationCode || null,
      facilitySMDGCode: body.facilitySMDGCode || null,
      vesselOperatorCarrierCode: body.vesselOperatorCarrierCode || null,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      limit: body.limit || 50,
      cursor: body.cursor || null,
    };
    const hasFilter = Object.entries(params).some(
      ([k, v]) => v != null && !["limit", "cursor", "startDate", "endDate"].includes(k),
    );
    if (!hasFilter) {
      return new Response(JSON.stringify({ error: "At least one vessel filter is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { simulated, payload } = await callHlag("/vessel-schedules", params);
    const result = await ingestVesselSchedule(carrierId, params, payload);
    return new Response(JSON.stringify({ success: true, simulated, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("hapag-schedules error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
