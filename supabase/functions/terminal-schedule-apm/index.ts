import { createClient } from "npm:@supabase/supabase-js";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const APM_TERMINALS = [
  { code: "APMT-LA", name: "APM Terminals Pier 400", port_unlocode: "USLAX", port_name: "Los Angeles" },
  { code: "APMT-NYNJ", name: "APM Terminals Port Elizabeth", port_unlocode: "USNYC", port_name: "New York / New Jersey" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("APM_TERMINALS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "APM_TERMINALS_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json() : {};
    const terminalFilter = body.terminal_code || null;

    const terminals = terminalFilter
      ? APM_TERMINALS.filter(t => t.code === terminalFilter)
      : APM_TERMINALS;

    let totalUpserted = 0;

    for (const terminal of terminals) {
      try {
        // APM Terminals vessel schedule API endpoint
        const facilityCode = terminal.code === "APMT-LA" ? "USLAXPIER400" : "USNYCELIZBTH";
        const apiUrl = `https://api.apmterminals.com/v1/facilities/${facilityCode}/vessel-visits?limit=50`;

        const resp = await fetch(apiUrl, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/json",
          },
        });

        if (!resp.ok) {
          console.error(`APM API error for ${terminal.code}: ${resp.status} ${await resp.text()}`);
          continue;
        }

        const data = await resp.json();
        const visits = data.vesselVisits || data.data || data.items || [];

        for (const visit of visits) {
          const externalId = visit.id || visit.vesselVisitId || `${terminal.code}-${visit.vesselName}-${visit.eta || visit.inboundVoyage}`;

          const record = {
            terminal_code: terminal.code,
            terminal_name: terminal.name,
            port_unlocode: terminal.port_unlocode,
            port_name: terminal.port_name,
            vessel_name: visit.vesselName || visit.vessel?.name || null,
            vessel_imo: visit.imoNumber || visit.vessel?.imoNumber || null,
            voyage_number: visit.inboundVoyage || visit.outboundVoyage || null,
            service_code: visit.serviceCode || visit.service?.code || null,
            carrier_code: visit.carrierCode || visit.shippingLine || null,
            berth: visit.berthName || visit.berth || null,
            eta: visit.eta || visit.estimatedTimeOfArrival || null,
            ata: visit.ata || visit.actualTimeOfArrival || null,
            etd: visit.etd || visit.estimatedTimeOfDeparture || null,
            atd: visit.atd || visit.actualTimeOfDeparture || null,
            begin_receive_date: visit.beginReceiveDate || visit.earliestReceivingDate || null,
            cargo_cutoff_date: visit.cargoCutoffDate || visit.cargoCutOff || null,
            hazmat_cutoff_date: visit.hazmatCutoffDate || visit.hazCargoCutOff || null,
            reefer_cutoff_date: visit.reeferCutoffDate || visit.reeferCutOff || null,
            data_source: "apm_terminals",
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
    console.error("terminal-schedule-apm error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
