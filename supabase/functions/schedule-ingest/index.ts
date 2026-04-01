import { createClient } from "npm:@supabase/supabase-js";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/* ── helpers ── */
function pick(obj: any, ...keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

async function resolveLocation(loc: any): Promise<string | null> {
  if (!loc) return null;
  const unlocode = pick(loc, "UNLocationCode", "unLocationCode", "unlocode", "portCode");
  const name = pick(loc, "locationName", "facilityName", "name", "city");
  const city = pick(loc, "city", "cityName");
  const country = pick(loc, "country", "countryCode");
  const facilityCode = pick(loc, "facilityCode", "terminalCode");

  if (!unlocode && !name && !city) return null;

  if (unlocode) {
    const { data: existing } = await supabase
      .from("alc_locations")
      .select("id")
      .eq("unlocode", unlocode)
      .maybeSingle();
    if (existing) return existing.id;
  }

  const { data, error } = await supabase
    .from("alc_locations")
    .insert({
      unlocode,
      facility_code: facilityCode,
      location_name: name,
      city,
      country,
      latitude: pick(loc, "latitude", "lat"),
      longitude: pick(loc, "longitude", "lng"),
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

async function resolveVessel(carrierId: string, v: any): Promise<string | null> {
  if (!v) return null;
  const vesselName = pick(v, "vesselName", "vessel_name", "name");
  const imo = pick(v, "vesselIMONumber", "imoNumber", "imo");
  if (!vesselName && !imo) return null;

  if (imo) {
    const { data: existing } = await supabase
      .from("alc_vessels")
      .select("id")
      .eq("imo_number", imo)
      .maybeSingle();
    if (existing) return existing.id;
  }

  const { data } = await supabase
    .from("alc_vessels")
    .insert({
      carrier_id: carrierId,
      vessel_name: vesselName,
      imo_number: imo,
      mmsi: pick(v, "mmsi"),
      operator_name: pick(v, "operatorName", "carrierName"),
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

function detectQueryType(p: any): string {
  const qt = pick(p, "queryType", "query_type", "scheduleType", "type");
  if (qt) {
    const lower = qt.toLowerCase().replace(/[\s-]/g, "_");
    if (lower.includes("port")) return "port_schedule";
    if (lower.includes("vessel")) return "vessel_schedule";
    return "point_to_point";
  }
  if (p.vesselIMONumber || p.vessel) return "vessel_schedule";
  if (p.portOfCall || p.port) return "port_schedule";
  return "point_to_point";
}

/* ── main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const carrierId = body.carrier_id;
    const payload = body.payload || body;

    if (!carrierId) {
      return new Response(JSON.stringify({ error: "carrier_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Save raw message
    const { data: raw } = await supabase
      .from("carrier_raw_messages")
      .insert({
        carrier_id: carrierId,
        source_channel: "api",
        message_family: "commercial_schedule",
        message_type: pick(payload, "messageType") || "schedule_response",
        external_reference: pick(payload, "scheduleID", "requestID"),
        payload_format: "json",
        response_payload_json: payload,
        processing_status: "pending",
        received_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const rawId = raw!.id;

    // 2. Integration job
    const { data: job } = await supabase
      .from("integration_jobs")
      .insert({
        raw_message_id: rawId,
        carrier_id: carrierId,
        job_type: "schedule_transform",
        job_status: "running",
        attempt_count: 1,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    const queryType = detectQueryType(payload);

    // 3. Resolve locations
    const schedules = payload.schedules || payload.routings || [payload];
    const results: string[] = [];

    for (const sched of Array.isArray(schedules) ? schedules : [schedules]) {
      // Resolve query locations
      const [porLocId, polLocId, podLocId, podlLocId, podepLocId, poarrLocId] = await Promise.all([
        resolveLocation(pick(sched, "placeOfReceipt", "originPlace")),
        resolveLocation(pick(sched, "portOfLoading", "loadPort")),
        resolveLocation(pick(sched, "portOfDischarge", "dischargePort")),
        resolveLocation(pick(sched, "placeOfDelivery", "destinationPlace")),
        resolveLocation(pick(sched, "placeOfDeparture", "departurePlace")),
        resolveLocation(pick(sched, "placeOfArrival", "arrivalPlace")),
      ]);

      // 4. Create query record
      const { data: queryRec } = await supabase
        .from("commercial_schedule_queries")
        .insert({
          carrier_id: carrierId,
          source_message_id: rawId,
          query_type: queryType,
          place_of_receipt_location_id: porLocId,
          place_of_delivery_location_id: podlLocId,
          place_of_departure_location_id: podepLocId,
          place_of_arrival_location_id: poarrLocId,
          port_of_loading_location_id: polLocId,
          port_of_discharge_location_id: podLocId,
          service_code: pick(sched, "serviceCode", "service"),
          departure_date_from: pick(sched, "departureDateFrom", "departureStart"),
          departure_date_to: pick(sched, "departureDateTo", "departureEnd"),
          arrival_date_from: pick(sched, "arrivalDateFrom", "arrivalStart"),
          arrival_date_to: pick(sched, "arrivalDateTo", "arrivalEnd"),
        })
        .select("id")
        .single();

      const queryId = queryRec?.id;

      // 5. Legs
      const legs = sched.legs || sched.transportLegs || sched.routeLegs || [];
      const legArr = Array.isArray(legs) ? legs : [legs];
      const isDirect = legArr.length <= 1;

      // 6. Create schedule
      const { data: schedRec } = await supabase
        .from("commercial_schedules")
        .insert({
          carrier_id: carrierId,
          source_message_id: rawId,
          query_id: queryId,
          schedule_reference: pick(sched, "scheduleID", "scheduleReference", "id"),
          schedule_type: queryType,
          service_code: pick(sched, "serviceCode", "service"),
          service_name: pick(sched, "serviceName", "serviceDescription"),
          transit_time_days: pick(sched, "transitTime", "transitTimeDays", "totalTransitTime"),
          total_leg_count: legArr.length || 1,
          is_direct_service: isDirect,
        })
        .select("id")
        .single();

      const schedId = schedRec!.id;
      results.push(schedId);

      // 7. Write legs
      for (let i = 0; i < legArr.length; i++) {
        const leg = legArr[i];
        const [loadLocId, dischLocId] = await Promise.all([
          resolveLocation(pick(leg, "departureLocation", "loadPort", "fromLocation")),
          resolveLocation(pick(leg, "arrivalLocation", "dischargePort", "toLocation")),
        ]);
        const vesselId = await resolveVessel(carrierId, pick(leg, "vessel", "vesselDetails") || {
          vesselName: pick(leg, "vesselName"),
          vesselIMONumber: pick(leg, "vesselIMONumber"),
        });

        const voyageNum = pick(leg, "voyageNumber", "voyage", "exportVoyageNumber");

        await supabase.from("schedule_legs").insert({
          commercial_schedule_id: schedId,
          carrier_id: carrierId,
          source_message_id: rawId,
          sequence_number: i + 1,
          transport_mode: pick(leg, "modeOfTransport", "transportMode") || "vessel",
          vessel_id: vesselId,
          vessel_name: pick(leg, "vesselName"),
          voyage_number: voyageNum,
          load_location_id: loadLocId,
          discharge_location_id: dischLocId,
          planned_departure: pick(leg, "departureDateTime", "plannedDeparture", "etd"),
          planned_arrival: pick(leg, "arrivalDateTime", "plannedArrival", "eta"),
          leg_transit_time_days: pick(leg, "transitTime", "transitTimeDays"),
          service_code: pick(leg, "serviceCode"),
          service_name: pick(leg, "serviceName"),
        });

        // Cutoffs per leg
        const cutoffs = leg.cutoffs || leg.cutOffTimes || [];
        for (const co of Array.isArray(cutoffs) ? cutoffs : []) {
          const coLocId = await resolveLocation(pick(co, "location"));
          await supabase.from("schedule_cutoffs").insert({
            commercial_schedule_id: schedId,
            schedule_leg_id: null, // could link if needed
            carrier_id: carrierId,
            source_message_id: rawId,
            cutoff_type: pick(co, "cutOffDateTimeCode", "cutoffType", "type") || "cargo_cutoff",
            cutoff_datetime: pick(co, "cutOffDateTime", "cutoffDate", "datetime"),
            location_id: coLocId,
          });
        }
      }

      // 8. Port calls
      const portCalls = sched.portCalls || sched.portSchedule || [];
      for (let i = 0; i < (Array.isArray(portCalls) ? portCalls : []).length; i++) {
        const pc = portCalls[i];
        const locId = await resolveLocation(pc);
        const vesId = await resolveVessel(carrierId, pick(pc, "vessel") || { vesselName: pick(pc, "vesselName") });
        await supabase.from("port_schedules").insert({
          commercial_schedule_id: schedId,
          carrier_id: carrierId,
          source_message_id: rawId,
          location_id: locId,
          facility_code: pick(pc, "facilityCode", "terminalCode"),
          call_sequence: i + 1,
          arrival_datetime: pick(pc, "arrivalDateTime", "eta"),
          departure_datetime: pick(pc, "departureDateTime", "etd"),
          cutoff_datetime: pick(pc, "cutOffDateTime"),
          service_code: pick(pc, "serviceCode"),
          service_name: pick(pc, "serviceName"),
          vessel_id: vesId,
          vessel_name: pick(pc, "vesselName"),
          voyage_number: pick(pc, "voyageNumber", "voyage"),
        });
      }

      // 9. Vessel schedule summary
      if (queryType === "vessel_schedule") {
        const vesId = await resolveVessel(carrierId, pick(sched, "vessel") || {
          vesselName: pick(sched, "vesselName"),
          vesselIMONumber: pick(sched, "vesselIMONumber"),
        });
        const [fpLocId, lpLocId] = await Promise.all([
          resolveLocation(pick(sched, "firstPort", "departurePort")),
          resolveLocation(pick(sched, "lastPort", "arrivalPort")),
        ]);
        await supabase.from("vessel_schedules").insert({
          commercial_schedule_id: schedId,
          carrier_id: carrierId,
          source_message_id: rawId,
          vessel_id: vesId,
          vessel_name: pick(sched, "vesselName"),
          voyage_number: pick(sched, "voyageNumber", "voyage"),
          service_code: pick(sched, "serviceCode"),
          service_name: pick(sched, "serviceName"),
          first_port_location_id: fpLocId,
          last_port_location_id: lpLocId,
          first_departure_datetime: pick(sched, "firstDeparture", "departureDateTime"),
          final_arrival_datetime: pick(sched, "finalArrival", "arrivalDateTime"),
        });
      }

      // 10. Schedule places
      const placeRoles: [string, string | null][] = [
        ["place_of_receipt", porLocId],
        ["port_of_loading", polLocId],
        ["port_of_discharge", podLocId],
        ["place_of_delivery", podlLocId],
        ["place_of_departure", podepLocId],
        ["place_of_arrival", poarrLocId],
      ];
      for (let i = 0; i < placeRoles.length; i++) {
        const [role, locId] = placeRoles[i];
        if (!locId) continue;
        await supabase.from("schedule_places").insert({
          commercial_schedule_id: schedId,
          carrier_id: carrierId,
          source_message_id: rawId,
          place_role: role,
          location_id: locId,
          sequence_number: i + 1,
        });
      }

      // Transshipment ports from legs
      if (legArr.length > 1) {
        for (let i = 0; i < legArr.length - 1; i++) {
          const tsLocId = await resolveLocation(
            pick(legArr[i], "arrivalLocation", "dischargePort", "toLocation")
          );
          if (tsLocId) {
            await supabase.from("schedule_places").insert({
              commercial_schedule_id: schedId,
              carrier_id: carrierId,
              source_message_id: rawId,
              place_role: "transshipment_port",
              location_id: tsLocId,
              sequence_number: 100 + i,
            });
          }
        }
      }

      // 11. Schedule references
      const refs: [string, any][] = [
        ["service_code", pick(sched, "serviceCode")],
        ["service_name", pick(sched, "serviceName")],
        ["carrier_reference", pick(sched, "carrierReference", "scheduleID")],
      ];
      for (const [type, val] of refs) {
        if (!val) continue;
        await supabase.from("schedule_references").insert({
          commercial_schedule_id: schedId,
          carrier_id: carrierId,
          source_message_id: rawId,
          reference_type: type,
          reference_value: String(val),
          is_primary: type === "service_code",
        });
      }

      // Top-level cutoffs
      const topCutoffs = sched.cutoffs || sched.cutOffTimes || [];
      for (const co of Array.isArray(topCutoffs) ? topCutoffs : []) {
        const coLocId = await resolveLocation(pick(co, "location"));
        await supabase.from("schedule_cutoffs").insert({
          commercial_schedule_id: schedId,
          carrier_id: carrierId,
          source_message_id: rawId,
          cutoff_type: pick(co, "cutOffDateTimeCode", "cutoffType") || "cargo_cutoff",
          cutoff_datetime: pick(co, "cutOffDateTime", "cutoffDate"),
          location_id: coLocId,
        });
      }
    }

    // Update job
    await supabase.from("integration_jobs").update({
      job_status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", job!.id);

    await supabase.from("carrier_raw_messages").update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
    }).eq("id", rawId);

    return new Response(JSON.stringify({ success: true, schedule_ids: results, raw_message_id: rawId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
