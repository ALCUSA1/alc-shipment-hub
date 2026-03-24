import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Gather user context in parallel
    const [profileRes, shipmentsRes, companiesRes, rfqRes, feedbackRes, existingRes] = await Promise.all([
      supabase.from("profiles").select("full_name, company_name, company_type, trade_lanes, bio").eq("user_id", user.id).maybeSingle(),
      supabase.from("shipments").select("origin_port, destination_port, mode, status, carrier").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("companies").select("company_name, company_type, industry, service_area, port_coverage").eq("user_id", user.id).limit(10),
      supabase.from("rfq_posts").select("id, title, origin, destination, volume, budget_range, category, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("ai_match_feedback").select("match_id, feedback").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_matches").select("source_id, source_type").eq("user_id", user.id).eq("status", "active"),
    ]);

    const profile = profileRes.data;
    const shipments = shipmentsRes.data || [];
    const companies = companiesRes.data || [];
    const rfqs = rfqRes.data || [];
    const feedback = feedbackRes.data || [];
    const existing = existingRes.data || [];

    // Build context for AI
    const tradeLanes = shipments
      .filter(s => s.origin_port && s.destination_port)
      .map(s => `${s.origin_port} → ${s.destination_port}`)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5);

    const dismissedTypes = feedback.filter(f => f.feedback === "not_interested").length;
    const existingSourceIds = new Set(existing.map(e => e.source_id).filter(Boolean));

    const contextPrompt = `You are a logistics AI matching engine. Given the user context below, generate 3-5 highly relevant opportunity matches.

USER PROFILE:
- Name: ${profile?.full_name || "Unknown"}
- Company: ${profile?.company_name || "Unknown"}  
- Type: ${profile?.company_type || "Unknown"}
- Trade Lanes: ${tradeLanes.length > 0 ? tradeLanes.join(", ") : "Not enough data yet"}

RECENT SHIPMENT HISTORY (${shipments.length} shipments):
${shipments.slice(0, 5).map(s => `- ${s.origin_port || "?"} → ${s.destination_port || "?"} (${s.mode || "ocean"}, ${s.status})`).join("\n")}

USER'S CRM COMPANIES (${companies.length}):
${companies.slice(0, 3).map(c => `- ${c.company_name} (${c.company_type}, ${c.industry || "general"})`).join("\n")}

ACTIVE RFQs ON PLATFORM (${rfqs.length}):
${rfqs.slice(0, 8).map(r => `- [${r.id}] "${r.title}" ${r.origin || "?"} → ${r.destination || "?"} Vol: ${r.volume || "?"} Budget: ${r.budget_range || "?"}`).join("\n")}

FEEDBACK: User has dismissed ${dismissedTypes} matches previously. Prioritize relevance.

RULES:
- Generate realistic logistics opportunities
- Match based on user's trade lanes and company type
- Include estimated earnings (realistic $25-$500 range)
- Match scores should be 60-98 range
- Types: shipment, partner, capacity, high_earning
- If user has trade lanes, prioritize those routes
- Include a mix of match types
- Source from available RFQs when possible (use their IDs)

Return a JSON array of matches.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You generate logistics opportunity matches. Always respond with valid JSON only." },
          { role: "user", content: contextPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_matches",
              description: "Generate AI-powered opportunity matches for a logistics user",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        match_type: { type: "string", enum: ["shipment", "partner", "capacity", "high_earning"] },
                        title: { type: "string" },
                        trade_lane: { type: "string" },
                        origin: { type: "string" },
                        destination: { type: "string" },
                        deal_type: { type: "string", enum: ["shipment", "capacity", "partnership"] },
                        estimated_earnings: { type: "number" },
                        match_score: { type: "number" },
                        reason: { type: "string" },
                        source_rfq_id: { type: "string", description: "RFQ post ID if matched from platform RFQs" },
                      },
                      required: ["match_type", "title", "estimated_earnings", "match_score", "reason"],
                    },
                  },
                },
                required: ["matches"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_matches" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { matches } = JSON.parse(toolCall.function.arguments);

    // Clear old active matches (keep engaged/saved)
    await supabase.from("ai_matches").delete().eq("user_id", user.id).eq("status", "active");

    // Insert new matches
    const inserts = matches.map((m: any) => ({
      user_id: user.id,
      match_type: m.match_type,
      title: m.title,
      trade_lane: m.trade_lane || null,
      origin: m.origin || null,
      destination: m.destination || null,
      deal_type: m.deal_type || "shipment",
      estimated_earnings: m.estimated_earnings || 0,
      match_score: m.match_score || 75,
      reason: m.reason,
      source_type: m.source_rfq_id ? "rfq" : null,
      source_id: m.source_rfq_id || null,
      status: "active",
    }));

    const { data: inserted, error: insertError } = await supabase.from("ai_matches").insert(inserts).select();
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ matches: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-matches error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
