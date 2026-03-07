import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active rate alerts
    const { data: alerts, error: alertsError } = await supabase
      .from("rate_alerts")
      .select("*")
      .eq("is_active", true);

    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ message: "No active alerts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    let notificationsCreated = 0;

    for (const alert of alerts) {
      // Find current rates matching this alert
      let query = supabase
        .from("carrier_rates")
        .select("*")
        .eq("origin_port", alert.origin_port)
        .eq("destination_port", alert.destination_port)
        .eq("container_type", alert.container_type)
        .gte("valid_until", today);

      if (alert.carrier) {
        query = query.eq("carrier", alert.carrier);
      }

      const { data: rates, error: ratesError } = await query;
      if (ratesError) {
        console.error("Error fetching rates for alert", alert.id, ratesError);
        continue;
      }

      if (!rates) continue;

      // Check each rate against threshold
      for (const rate of rates) {
        const surcharges = Array.isArray(rate.surcharges) ? rate.surcharges : [];
        const surchargeTotal = surcharges.reduce((sum: number, s: any) => sum + (Number(s?.amount) || 0), 0);
        const allInRate = rate.base_rate + surchargeTotal;

        if (allInRate <= alert.threshold_rate) {
          // Check if we already notified for this rate today
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", alert.user_id)
            .eq("type", "rate_alert")
            .gte("created_at", today)
            .contains("metadata", { rate_id: rate.id, alert_id: alert.id });

          if (existing && existing.length > 0) continue;

          // Create in-app notification
          await supabase.from("notifications").insert({
            user_id: alert.user_id,
            title: `Rate Alert: ${rate.carrier} dropped to $${allInRate.toLocaleString()}`,
            message: `${rate.origin_port} → ${rate.destination_port} (${rate.container_type.toUpperCase()}) is now $${allInRate.toLocaleString()}, below your $${alert.threshold_rate.toLocaleString()} threshold.`,
            type: "rate_alert",
            metadata: { rate_id: rate.id, alert_id: alert.id, carrier: rate.carrier, all_in_rate: allInRate },
          });

          notificationsCreated++;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Checked ${alerts.length} alerts, created ${notificationsCreated} notifications` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking rate alerts:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
