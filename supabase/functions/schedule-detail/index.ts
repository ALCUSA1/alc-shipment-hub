import { createClient } from "npm:@supabase/supabase-js";
import { requireUser, corsHeaders as _sharedCors } from "../_shared/auth.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const _auth = await requireUser(req);
  if (!_auth.ok) return _auth.response;

  try {
    const url = new URL(req.url);
    const scheduleId = url.searchParams.get("schedule_id");
    const queryType = url.searchParams.get("query_type");
    const serviceCode = url.searchParams.get("service_code");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    if (scheduleId) {
      // Single schedule detail
      const [schedRes, legsRes, placesRes, cutoffsRes, refsRes, portRes, vesRes] = await Promise.all([
        supabase.from("commercial_schedules").select("*, alc_carriers(carrier_code, carrier_name)").eq("id", scheduleId).single(),
        supabase.from("schedule_legs").select("*, alc_locations!schedule_legs_load_location_id_fkey(unlocode, location_name, city, country), alc_locations!schedule_legs_discharge_location_id_fkey(unlocode, location_name, city, country), alc_vessels(vessel_name, imo_number)").eq("commercial_schedule_id", scheduleId).order("sequence_number"),
        supabase.from("schedule_places").select("*, alc_locations(unlocode, location_name, city, country)").eq("commercial_schedule_id", scheduleId).order("sequence_number"),
        supabase.from("schedule_cutoffs").select("*, alc_locations(unlocode, location_name, city, country)").eq("commercial_schedule_id", scheduleId),
        supabase.from("schedule_references").select("*").eq("commercial_schedule_id", scheduleId),
        supabase.from("port_schedules").select("*, alc_locations(unlocode, location_name, city, country), alc_vessels(vessel_name, imo_number)").eq("commercial_schedule_id", scheduleId).order("call_sequence"),
        supabase.from("vessel_schedules").select("*, alc_vessels(vessel_name, imo_number), alc_locations!vessel_schedules_first_port_location_id_fkey(unlocode, location_name), alc_locations!vessel_schedules_last_port_location_id_fkey(unlocode, location_name)").eq("commercial_schedule_id", scheduleId),
      ]);

      return new Response(JSON.stringify({
        schedule: schedRes.data,
        legs: legsRes.data || [],
        places: placesRes.data || [],
        cutoffs: cutoffsRes.data || [],
        references: refsRes.data || [],
        port_calls: portRes.data || [],
        vessel_schedule: vesRes.data || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // List schedules with optional filters
    let query = supabase.from("commercial_schedules")
      .select("*, alc_carriers(carrier_code, carrier_name)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (queryType) query = query.eq("schedule_type", queryType);
    if (serviceCode) query = query.eq("service_code", serviceCode);

    const { data, error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({ schedules: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: UnsafeAny) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
