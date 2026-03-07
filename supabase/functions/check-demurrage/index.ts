import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all accruing demurrage charges with shipment info
    const { data: charges, error: chargesError } = await supabase
      .from("demurrage_charges")
      .select("*, shipments!inner(shipment_ref, user_id, destination_port, origin_port)")
      .eq("status", "accruing");

    if (chargesError) throw chargesError;
    if (!charges || charges.length === 0) {
      return new Response(
        JSON.stringify({ message: "No accruing charges found", notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group charges by user to avoid duplicate notifications
    const userCharges: Record<string, typeof charges> = {};
    for (const charge of charges) {
      const userId = (charge as any).shipments.user_id;
      if (!userCharges[userId]) userCharges[userId] = [];
      userCharges[userId].push(charge);
    }

    let notified = 0;

    for (const [userId, userChargeList] of Object.entries(userCharges)) {
      // Check if we already sent a notification today for this user
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "demurrage_alert")
        .gte("created_at", `${today}T00:00:00Z`)
        .limit(1);

      if (existing && existing.length > 0) continue; // Already notified today

      // Build notification content
      const totalAccruing = userChargeList.reduce(
        (sum, c) => sum + (c.total_amount || 0),
        0
      );
      const totalDailyRate = userChargeList.reduce(
        (sum, c) => sum + (c.daily_rate || 0),
        0
      );
      const chargeCount = userChargeList.length;

      // Get the most urgent charge (highest daily rate)
      const urgent = userChargeList.reduce((prev, curr) =>
        (curr.daily_rate || 0) > (prev.daily_rate || 0) ? curr : prev
      );
      const urgentShipRef = (urgent as any).shipments.shipment_ref;
      const urgentType =
        urgent.charge_type === "demurrage"
          ? "Demurrage"
          : urgent.charge_type === "detention"
          ? "Detention"
          : urgent.charge_type;

      const title =
        chargeCount === 1
          ? `${urgentType} accruing on ${urgentShipRef}`
          : `${chargeCount} D&D charges accruing — $${totalDailyRate.toFixed(0)}/day`;

      const lines: string[] = [];
      if (chargeCount === 1) {
        lines.push(
          `$${urgent.daily_rate}/day · Total so far: $${urgent.total_amount.toLocaleString()}`
        );
        if (urgent.container_number)
          lines.push(`Container: ${urgent.container_number}`);
        if (urgent.end_date)
          lines.push(`Deadline: ${urgent.end_date}`);
        if (urgent.carrier) lines.push(`Carrier: ${urgent.carrier}`);
      } else {
        lines.push(
          `Total accruing: $${totalAccruing.toLocaleString()} across ${chargeCount} charges at $${totalDailyRate.toFixed(0)}/day`
        );
        // List top 3 by daily rate
        const top3 = [...userChargeList]
          .sort((a, b) => (b.daily_rate || 0) - (a.daily_rate || 0))
          .slice(0, 3);
        for (const c of top3) {
          const ref = (c as any).shipments.shipment_ref;
          lines.push(
            `• ${ref}: $${c.daily_rate}/day (${c.charge_type})`
          );
        }
      }

      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type: "demurrage_alert",
          title,
          message: lines.join("\n"),
          metadata: {
            charge_count: chargeCount,
            total_accruing: totalAccruing,
            total_daily_rate: totalDailyRate,
            charge_ids: userChargeList.map((c) => c.id),
          },
        });

      if (insertError) {
        console.error(`Failed to notify user ${userId}:`, insertError);
      } else {
        notified++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Demurrage check complete", notified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-demurrage:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
