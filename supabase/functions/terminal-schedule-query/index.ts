import { createClient } from "npm:@supabase/supabase-js";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const portUnlocode = url.searchParams.get("port_unlocode");
    const terminalCode = url.searchParams.get("terminal_code");
    const vessel = url.searchParams.get("vessel");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    let query = supabase
      .from("terminal_schedules")
      .select("*")
      .order("eta", { ascending: true, nullsFirst: false })
      .limit(limit);

    if (portUnlocode) query = query.eq("port_unlocode", portUnlocode.toUpperCase());
    if (terminalCode) query = query.eq("terminal_code", terminalCode);
    if (vessel) query = query.ilike("vessel_name", `%${vessel}%`);
    if (dateFrom) query = query.gte("eta", dateFrom);
    if (dateTo) query = query.lte("eta", dateTo);

    const { data, error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({ schedules: data || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
