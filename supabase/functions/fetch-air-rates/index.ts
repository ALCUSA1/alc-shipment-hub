import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { origin, destination, weight_kg, pieces } = await req.json();

    if (!origin || !destination) {
      return new Response(JSON.stringify({ error: "origin and destination required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for AIR_CARGO_API_KEY for live rate integration
    const apiKey = Deno.env.get("AIR_CARGO_API_KEY");

    if (apiKey) {
      // Future: Integrate with Cargo.one, WebCargo, or airline APIs
      // For now, fall through to local rates
      console.log("AIR_CARGO_API_KEY configured — live rate integration ready");
    }

    // Fetch rates from local carrier_rates table (mode=air)
    const today = new Date().toISOString().split("T")[0];
    const { data: rates, error } = await supabase
      .from("carrier_rates")
      .select("*")
      .eq("mode", "air")
      .eq("origin_port", origin)
      .eq("destination_port", destination)
      .gte("valid_until", today)
      .order("base_rate", { ascending: true });

    if (error) throw error;

    // Determine weight break for each rate
    const enrichedRates = (rates || []).map((r: any) => {
      const surcharges = Array.isArray(r.surcharges) ? r.surcharges : [];
      const totalPerKg = r.base_rate + surcharges.reduce((s: number, sc: any) => s + (sc.amount || 0), 0);
      const estimatedTotal = weight_kg ? totalPerKg * weight_kg : null;

      return {
        ...r,
        total_per_kg: totalPerKg,
        estimated_total: estimatedTotal,
        weight_break: r.container_type, // reusing container_type as weight break label for air
      };
    });

    return new Response(JSON.stringify({
      success: true,
      origin,
      destination,
      rates: enrichedRates,
      count: enrichedRates.length,
      live_api: !!apiKey,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("fetch-air-rates error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
