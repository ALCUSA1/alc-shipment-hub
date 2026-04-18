// Cron-triggered batch poller for Evergreen TNT.
// Iterates active EGLV shipments and invokes evergreen-tnt for each.
// Designed to be called by pg_cron via net.http_post.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EVERGREEN_CARRIER_CODE = "EGLV";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Resolve EGLV carrier id
    const { data: carrier } = await supabase
      .from("alc_carriers")
      .select("id")
      .eq("carrier_code", EVERGREEN_CARRIER_CODE)
      .single();
    if (!carrier) throw new Error("Evergreen carrier not registered");

    // Pull active shipments tied to EGLV with at least one ref to query
    const { data: ships, error } = await supabase
      .from("shipments")
      .select("id, booking_ref, bill_of_lading")
      .eq("alc_carrier_id", carrier.id)
      .in("status", ["booked", "in_transit"])
      .limit(100);
    if (error) throw error;

    const targets = (ships || []).filter((s) => s.booking_ref || s.bill_of_lading);
    let invoked = 0;
    const results: Array<{ shipment_id: string; ok: boolean; error?: string }> = [];

    // Sequential — Evergreen QA tier is rate-limited; cron is async, latency doesn't matter
    for (const s of targets) {
      try {
        const body: Record<string, string> = {};
        if (s.bill_of_lading) body.bill_of_lading_number = s.bill_of_lading;
        else if (s.booking_ref) body.booking_number = s.booking_ref;

        const resp = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/evergreen-tnt`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify(body),
          },
        );
        const ok = resp.ok;
        invoked++;
        results.push({ shipment_id: s.id, ok });
      } catch (err: any) {
        results.push({ shipment_id: s.id, ok: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        carrier: EVERGREEN_CARRIER_CODE,
        eligible: targets.length,
        invoked,
        results,
        ran_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[evergreen-tnt-cron] error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
