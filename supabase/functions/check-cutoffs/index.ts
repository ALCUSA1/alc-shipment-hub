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

    const now = new Date();
    const hours24 = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const hours48 = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

    // Get shipments with cutoffs approaching within 48 hours
    const { data: shipments, error } = await supabase
      .from("shipments")
      .select("id, shipment_ref, user_id, cy_cutoff, si_cutoff, vgm_cutoff, doc_cutoff")
      .not("status", "in", '("delivered","draft")')
      .or(`cy_cutoff.lte.${hours48},si_cutoff.lte.${hours48},vgm_cutoff.lte.${hours48},doc_cutoff.lte.${hours48}`);

    if (error) throw error;
    if (!shipments || shipments.length === 0) {
      return new Response(JSON.stringify({ message: "No approaching cutoffs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsCreated = 0;
    const today = now.toISOString().split("T")[0];

    const cutoffTypes = [
      { key: "cy_cutoff", label: "CY Cutoff" },
      { key: "si_cutoff", label: "SI Cutoff" },
      { key: "vgm_cutoff", label: "VGM Cutoff" },
      { key: "doc_cutoff", label: "Doc Cutoff" },
    ];

    for (const shipment of shipments) {
      for (const ct of cutoffTypes) {
        const cutoffDate = (shipment as any)[ct.key];
        if (!cutoffDate) continue;

        const cutoff = new Date(cutoffDate);
        if (cutoff < now || cutoff > new Date(hours48)) continue;

        const hoursLeft = Math.round((cutoff.getTime() - now.getTime()) / (1000 * 60 * 60));
        const urgency = hoursLeft <= 24 ? "URGENT" : "WARNING";

        // Deduplicate: check if we already sent this alert today
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", shipment.user_id)
          .eq("type", "cutoff_alert")
          .gte("created_at", today)
          .contains("metadata", { shipment_id: shipment.id, cutoff_type: ct.key });

        if (existing && existing.length > 0) continue;

        await supabase.from("notifications").insert({
          user_id: shipment.user_id,
          title: `${urgency}: ${ct.label} in ${hoursLeft}h — ${shipment.shipment_ref}`,
          message: `${ct.label} for ${shipment.shipment_ref} is due ${new Date(cutoffDate).toLocaleDateString()} ${new Date(cutoffDate).toLocaleTimeString()}. ${hoursLeft} hours remaining.`,
          type: "cutoff_alert",
          metadata: { shipment_id: shipment.id, cutoff_type: ct.key, hours_remaining: hoursLeft },
        });

        notificationsCreated++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Checked ${shipments.length} shipments, created ${notificationsCreated} cutoff alerts` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking cutoffs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
