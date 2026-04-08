import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { origin, destination, mode, carrier, containerType, commodity, shipmentId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Gather contextual data for AI analysis
    const [rateHistory, recentShipments, detentionData, scheduleData] = await Promise.all([
      // Historical rates on this lane
      sb.from("carrier_rates")
        .select("carrier, base_rate, valid_from, valid_until, transit_days, free_time_days, surcharges")
        .eq("origin_port", origin || "")
        .eq("destination_port", destination || "")
        .order("valid_from", { ascending: false })
        .limit(10),
      // Recent shipments on similar routes for pattern detection
      sb.from("shipments")
        .select("carrier, status, lifecycle_stage, origin_port, destination_port, etd, eta, mode")
        .eq("origin_port", origin || "")
        .eq("destination_port", destination || "")
        .order("created_at", { ascending: false })
        .limit(5),
      // Detention/demurrage history
      sb.from("demurrage_charges")
        .select("charge_type, total_amount, carrier, free_days, accrued_days")
        .limit(10),
      // Recent schedule queries for this route
      sb.from("commercial_schedules")
        .select("carrier_name, transit_time, direct_service, number_of_stops")
        .eq("origin_port_code", origin || "")
        .eq("destination_port_code", destination || "")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Build context for AI
    const context = {
      route: { origin, destination, mode, carrier, containerType, commodity },
      rateHistory: rateHistory.data || [],
      recentShipments: recentShipments.data || [],
      detentionHistory: detentionData.data || [],
      scheduleOptions: scheduleData.data || [],
      currentDate: new Date().toISOString(),
    };

    const systemPrompt = `You are a freight logistics intelligence system. Analyze the shipping context and provide actionable insights.

CONTEXT:
${JSON.stringify(context, null, 2)}

Respond with a JSON object using this exact structure (use tool calling):
{
  "alerts": [
    {"type": "warning|info|success", "title": "short title", "message": "details", "category": "route_risk|rate_change|detention|compliance|schedule|weather"}
  ],
  "recommendations": [
    {"title": "short title", "description": "actionable suggestion", "priority": "high|medium|low"}
  ],
  "routeInsight": "One paragraph summary of route conditions, pricing trends, and risks",
  "detentionRisk": "low|medium|high",
  "detentionNote": "Brief explanation of detention risk",
  "complianceChecklist": ["list of compliance items needed for this route/commodity"],
  "estimatedTotalCost": {
    "freight": 0,
    "surcharges": 0,
    "trucking_estimate": 0,
    "documentation": 150,
    "total_estimate": 0,
    "note": "explanation"
  }
}

RULES:
- Be specific about THIS route and carrier
- Flag any global disruptions affecting this trade lane (Red Sea, canal issues, port congestion)
- If detention history exists, calculate risk
- Recommend compliance requirements based on commodity and destination
- Estimate costs based on historical rate data
- Keep alerts actionable and concise`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this shipping route: ${origin} to ${destination} via ${mode} with ${carrier || "any carrier"}. Commodity: ${commodity || "general cargo"}. Provide intelligence insights.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_intelligence",
              description: "Return structured shipping intelligence",
              parameters: {
                type: "object",
                properties: {
                  alerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["warning", "info", "success"] },
                        title: { type: "string" },
                        message: { type: "string" },
                        category: { type: "string", enum: ["route_risk", "rate_change", "detention", "compliance", "schedule", "weather"] },
                      },
                      required: ["type", "title", "message", "category"],
                    },
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["title", "description", "priority"],
                    },
                  },
                  routeInsight: { type: "string" },
                  detentionRisk: { type: "string", enum: ["low", "medium", "high"] },
                  detentionNote: { type: "string" },
                  complianceChecklist: { type: "array", items: { type: "string" } },
                  estimatedTotalCost: {
                    type: "object",
                    properties: {
                      freight: { type: "number" },
                      surcharges: { type: "number" },
                      trucking_estimate: { type: "number" },
                      documentation: { type: "number" },
                      total_estimate: { type: "number" },
                      note: { type: "string" },
                    },
                    required: ["freight", "total_estimate", "note"],
                  },
                },
                required: ["alerts", "recommendations", "routeInsight", "detentionRisk", "complianceChecklist"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_intelligence" } },
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
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let intelligence = {};
    if (toolCall?.function?.arguments) {
      try {
        intelligence = JSON.parse(toolCall.function.arguments);
      } catch {
        intelligence = { alerts: [], recommendations: [], routeInsight: "Unable to analyze route.", detentionRisk: "unknown", complianceChecklist: [] };
      }
    }

    return new Response(JSON.stringify(intelligence), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("booking-intelligence error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
