import { createClient } from "npm:@supabase/supabase-js";
import { corsHeaders } from "npm:@supabase/supabase-js/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SAVANNAH_TERMINAL = {
  code: "GPA-GCT",
  name: "Garden City Terminal",
  port_unlocode: "USSAV",
  port_name: "Savannah",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Try Firecrawl first for structured scraping
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    let vesselData: any[] = [];

    if (firecrawlKey) {
      // Use Firecrawl to scrape GPA vessel schedule page
      const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: "https://gaports.com/facilities/garden-city-terminal/vessel-schedule/",
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      });

      if (scrapeResp.ok) {
        const scrapeData = await scrapeResp.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

        // Parse markdown table rows for vessel schedule data
        const lines = markdown.split("\n").filter((l: string) => l.includes("|") && !l.includes("---"));

        // Skip header row
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split("|").map((c: string) => c.trim()).filter(Boolean);
          if (cols.length >= 4) {
            vesselData.push({
              vesselName: cols[0] || null,
              voyage: cols[1] || null,
              carrier: cols[2] || null,
              eta: cols[3] || null,
              etd: cols[4] || null,
              berth: cols[5] || null,
              cutoff: cols[6] || null,
            });
          }
        }
      } else {
        console.error("Firecrawl scrape failed:", scrapeResp.status);
      }
    } else {
      // Fallback: direct HTML fetch
      const htmlResp = await fetch("https://gaports.com/facilities/garden-city-terminal/vessel-schedule/");
      if (htmlResp.ok) {
        const html = await htmlResp.text();
        // Basic regex extraction for vessel schedule tables
        const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
        if (tableMatch) {
          for (const table of tableMatch) {
            const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
            for (let i = 1; i < rows.length; i++) {
              const cells = rows[i].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
              const values = cells.map(c => c.replace(/<[^>]+>/g, "").trim());
              if (values.length >= 4) {
                vesselData.push({
                  vesselName: values[0] || null,
                  voyage: values[1] || null,
                  carrier: values[2] || null,
                  eta: values[3] || null,
                  etd: values[4] || null,
                  berth: values[5] || null,
                  cutoff: values[6] || null,
                });
              }
            }
          }
        }
      }
    }

    let totalUpserted = 0;

    for (const visit of vesselData) {
      const externalId = `${SAVANNAH_TERMINAL.code}-${visit.vesselName}-${visit.voyage || visit.eta}`;

      // Try to parse date strings
      const parseDate = (d: string | null): string | null => {
        if (!d) return null;
        try {
          const parsed = new Date(d);
          return isNaN(parsed.getTime()) ? null : parsed.toISOString();
        } catch {
          return null;
        }
      };

      const record = {
        terminal_code: SAVANNAH_TERMINAL.code,
        terminal_name: SAVANNAH_TERMINAL.name,
        port_unlocode: SAVANNAH_TERMINAL.port_unlocode,
        port_name: SAVANNAH_TERMINAL.port_name,
        vessel_name: visit.vesselName,
        vessel_imo: null,
        voyage_number: visit.voyage,
        service_code: null,
        carrier_code: visit.carrier,
        berth: visit.berth,
        eta: parseDate(visit.eta),
        ata: null,
        etd: parseDate(visit.etd),
        atd: null,
        begin_receive_date: null,
        cargo_cutoff_date: parseDate(visit.cutoff),
        hazmat_cutoff_date: null,
        reefer_cutoff_date: null,
        data_source: "gpa_scrape",
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

    return new Response(JSON.stringify({ 
      success: true, 
      upserted: totalUpserted,
      scraped: vesselData.length,
      method: firecrawlKey ? "firecrawl" : "direct_html",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("terminal-schedule-scrape error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
