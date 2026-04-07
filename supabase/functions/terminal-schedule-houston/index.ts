import { createClient } from "npm:@supabase/supabase-js";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const HOUSTON_TERMINALS = [
  { code: "PH-BARBOURS", name: "Barbours Cut Terminal", port_unlocode: "USHOU", port_name: "Houston" },
  { code: "PH-BAYPORT", name: "Bayport Container Terminal", port_unlocode: "USHOU", port_name: "Houston" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("PORT_HOUSTON_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "PORT_HOUSTON_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalUpserted = 0;

    for (const terminal of HOUSTON_TERMINALS) {
      try {
        const facilityCode = terminal.code === "PH-BARBOURS" ? "barbours-cut" : "bayport";
        const apiUrl = `https://lynx.porthouston.com/api/v1/vessel-schedule?facility=${facilityCode}&limit=50`;

        const resp = await fetch(apiUrl, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/json",
          },
        });

        if (!resp.ok) {
          console.error(`Houston API error for ${terminal.code}: ${resp.status} ${await resp.text()}`);
          continue;
        }

        const data = await resp.json();
        const visits = data.vesselSchedules || data.data || data.items || [];

        for (const visit of visits) {
          const externalId = visit.id || `${terminal.code}-${visit.vesselName}-${visit.voyage || visit.eta}`;

          const record = {
            terminal_code: terminal.code,
            terminal_name: terminal.name,
            port_unlocode: terminal.port_unlocode,
            port_name: terminal.port_name,
            vessel_name: visit.vesselName || visit.vessel || null,
            vessel_imo: visit.imoNumber || visit.imo || null,
            voyage_number: visit.voyage || visit.voyageNumber || null,
            service_code: visit.serviceCode || visit.service || null,
            carrier_code: visit.carrierCode || visit.shippingLine || null,
            berth: visit.berth || visit.berthNumber || null,
            eta: visit.eta || visit.estimatedArrival || null,
            ata: visit.ata || visit.actualArrival || null,
            etd: visit.etd || visit.estimatedDeparture || null,
            atd: visit.atd || visit.actualDeparture || null,
            begin_receive_date: visit.beginReceive || visit.earlyReceiving || null,
            cargo_cutoff_date: visit.cargoCutoff || visit.cutoffDate || null,
            hazmat_cutoff_date: visit.hazmatCutoff || null,
            reefer_cutoff_date: visit.reeferCutoff || null,
            data_source: "port_houston",
            external_id: externalId,
            raw_data: visit,
          };

          const { error: upsertErr } = await supabase
            .from("terminal_schedules")
            .upsert(record, { onConflict: "data_source,external_id" });

          if (upsertErr) {
            console.error(`Upsert error: ${upsertErr.message}`);
          } else {
            totalUpserted++;
          }
        }
      } catch (termErr) {
        console.error(`Error processing ${terminal.code}:`, termErr);
      }
    }

    return new Response(JSON.stringify({ success: true, upserted: totalUpserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("terminal-schedule-houston error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
