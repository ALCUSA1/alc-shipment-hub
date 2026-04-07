import { createClient } from "npm:@supabase/supabase-js";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// APM Terminals with their UN Location Codes
// Full list from API spec - US terminals plus international
const APM_TERMINALS = [
  { code: "USLAX", name: "APM Terminals Pacific (Pier 400)", port_name: "Los Angeles" },
  { code: "USNWK", name: "APM Terminals Port Elizabeth", port_name: "New York / New Jersey" },
  { code: "USMOB", name: "APM Terminals Mobile", port_name: "Mobile" },
  { code: "USMIA", name: "APM Terminals Miami", port_name: "Miami" },
];

const BASE_URL = Deno.env.get("APM_TERMINALS_BASE_URL") || "https://api.apmterminals.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const consumerKey = Deno.env.get("APM_TERMINALS_CONSUMER_KEY");
    const apiToken = Deno.env.get("APM_TERMINALS_API_TOKEN");

    if (!consumerKey) {
      return new Response(JSON.stringify({ error: "APM_TERMINALS_CONSUMER_KEY not configured" }), {
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
        // APM Terminals vessel schedule API - real endpoint per OpenAPI spec
        const apiUrl = `${BASE_URL}/all-vessel-schedules?terminal=${terminal.code}`;

        const headers: Record<string, string> = {
          "Consumer-Key": consumerKey,
          "Accept": "application/json",
        };
        if (apiToken) {
          headers["Authorization"] = `Bearer ${apiToken}`;
        }

        const resp = await fetch(apiUrl, { headers });

        if (!resp.ok) {
          console.error(`APM API error for ${terminal.code}: ${resp.status} ${await resp.text()}`);
          continue;
        }

        const data = await resp.json();
        const visits = data.vesselSchedule || [];

        for (const visit of visits) {
          // Build a stable external ID from vessel + voyage
          const externalId = `${terminal.code}-${visit.vesselLloydsCode || visit.vesselName}-${visit.inboundVoyageNumber}`;

          const record = {
            terminal_code: terminal.code,
            terminal_name: terminal.name,
            port_unlocode: terminal.code,
            port_name: terminal.port_name,
            vessel_name: visit.vesselName || null,
            vessel_imo: visit.vesselLloydsCode || null,
            voyage_number: visit.inboundVoyageNumber || visit.outboundVoyageNumber || null,
            service_code: null,
            carrier_code: visit.vesselOperator || null,
            berth: visit.berthName || null,
            // Use estimated over scheduled, fall back gracefully
            eta: visit.estimatedArrivalDateTimeLocal || visit.scheduledArrivalDateTimeLocal || null,
            ata: visit.actualArrivalDateTimeLocal || null,
            etd: visit.estimatedDepartureDateTimeLocal || visit.scheduledDepartureDateTimeLocal || null,
            atd: visit.actualDepartureDateTimeLocal || null,
            begin_receive_date: visit.startReceiveDateTimeLocal || null,
            cargo_cutoff_date: visit.cargoCutoffDateTimeLocal || null,
            hazmat_cutoff_date: visit.hazardousCutoffDateTimeLocal || null,
            reefer_cutoff_date: visit.reeferCutoffDateTimeLocal || null,
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
