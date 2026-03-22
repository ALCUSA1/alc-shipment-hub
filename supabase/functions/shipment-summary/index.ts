import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { shipment_context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an expert freight forwarding assistant. Generate a brief shipment intelligence report.

Return a JSON object with this exact structure:
{
  "summary": "One paragraph (2-3 sentences) plain-English summary of the shipment's current state",
  "risks": ["Array of 0-3 risk/concern strings, each under 15 words"],
  "next_actions": ["Array of 1-3 recommended next actions, each under 15 words"],
  "health": "green" | "yellow" | "red"
}

Health scoring:
- green: On track, no issues
- yellow: Minor concerns (approaching cutoffs, missing docs, etc.)
- red: Critical issues (missed cutoffs, customs problems, payment failures)

Be specific to this shipment. Reference actual dates, ports, and parties. Don't be generic.`
          },
          {
            role: "user",
            content: `Generate intelligence report for this shipment:\n${JSON.stringify(shipment_context)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "shipment_report",
              description: "Generate a structured shipment intelligence report",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "2-3 sentence summary" },
                  risks: { type: "array", items: { type: "string" }, description: "0-3 risk items" },
                  next_actions: { type: "array", items: { type: "string" }, description: "1-3 next action items" },
                  health: { type: "string", enum: ["green", "yellow", "red"] }
                },
                required: ["summary", "risks", "next_actions", "health"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "shipment_report" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    
    // Extract structured output from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let report;
    if (toolCall?.function?.arguments) {
      report = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content || "";
      try {
        report = JSON.parse(content);
      } catch {
        report = {
          summary: "Unable to generate summary at this time.",
          risks: [],
          next_actions: ["Review shipment details manually"],
          health: "yellow"
        };
      }
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("shipment-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
