import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const EVERGREEN_CARRIER_CODE = "EGLV";

// ─── Resolve auth + base URL for Commercial Schedules (scope=DCSA_CS) ───
async function getCommercialScheduleAuth(env = "production") {
  const { data: carrier } = await supabase
    .from("alc_carriers").select("id").eq("carrier_code", EVERGREEN_CARRIER_CODE).single();
  if (!carrier) throw new Error("Evergreen carrier not found");

  const { data: conn } = await supabase
    .from("carrier_connections").select("*")
    .eq("carrier_id", carrier.id).eq("environment", env).eq("status", "active").single();
  if (!conn) throw new Error("No active Evergreen connection");

  const username = Deno.env.get("EVERGREEN_USERNAME") || conn.oauth_client_id || Deno.env.get("EVERGREEN_CLIENT_ID");
  const password = Deno.env.get("EVERGREEN_PASSWORD") || Deno.env.get(conn.oauth_client_secret_key_name || "EVERGREEN_CLIENT_SECRET");
  const tokenUrl = conn.oauth_token_url;
  if (!tokenUrl || !username || !password) throw new Error("Evergreen OAuth config missing");

  // Request short-lived token with scope=DCSA_CS
  const u = new URL(tokenUrl);
  u.searchParams.set("grant_type", "client_credentials");
  u.searchParams.set("scope", "DCSA_CS");

  const tResp = await fetch(u.toString(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!tResp.ok) throw new Error(`OAuth (DCSA_CS) failed (${tResp.status}): ${await tResp.text()}`);
  const td = await tResp.json();

  // Normalize base URL — strip accidental path/query
  const rawBase = conn.base_url || Deno.env.get("EVERGREEN_BASE_URL") || "";
  let baseUrl = rawBase;
  try { const url = new URL(rawBase); baseUrl = `${url.protocol}//${url.host}`; } catch { baseUrl = rawBase.replace(/\/+$/, ""); }

  await supabase.from("carrier_connections").update({ last_success_at: new Date().toISOString() }).eq("id", conn.id);

  return {
    headers: { Authorization: `Bearer ${td.access_token}`, "Content-Type": "application/json" },
    baseUrl,
    carrierId: carrier.id,
  };
}

// ─── Endpoint paths (Evergreen QA) ───
const ENDPOINTS = {
  "point-to-point": "/server/sol/route/commercial/v1/point-to-point-routes",
  "port": "/server/sol/mvs1api/commSch/v1/port",
  "vessel": "/server/sol/mvs1api/commSch/v1/vessel",
} as const;

type EndpointKey = keyof typeof ENDPOINTS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      query_type = "point-to-point", // 'point-to-point' | 'port' | 'vessel'
      query_params = {},              // object → URLSearchParams
      environment = "production",
    } = body as { query_type?: EndpointKey; query_params?: Record<string, string>; environment?: string };

    const path = ENDPOINTS[query_type];
    if (!path) {
      return new Response(
        JSON.stringify({ error: `Invalid query_type. Use one of: ${Object.keys(ENDPOINTS).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = await getCommercialScheduleAuth(environment);
    const params = new URLSearchParams(query_params as Record<string, string>);
    const qs = params.toString();
    const url = `${auth.baseUrl}${path}${qs ? `?${qs}` : ""}`;

    console.log(`[evergreen-commercial-schedules] ${query_type} → ${url}`);

    const apiResp = await fetch(url, { method: "GET", headers: auth.headers });
    const responsePayload = await apiResp.json().catch(() => null);
    const responseText = responsePayload ? null : await apiResp.text().catch(() => "");

    // Store raw payload
    const { data: rawMsg } = await supabase
      .from("carrier_raw_messages")
      .insert({
        carrier_id: auth.carrierId,
        source_channel: "api_pull",
        message_family: "schedule",
        message_type: `commercial_${query_type.replace("-", "_")}`,
        payload_format: "json",
        request_payload_json: { query_type, query_params, url },
        response_payload_json: responsePayload || { raw_text: responseText },
        http_status: apiResp.status,
        processing_status: apiResp.ok ? "pending" : "error",
        error_message: apiResp.ok ? null : `HTTP ${apiResp.status}`,
      })
      .select("id")
      .single();

    return new Response(
      JSON.stringify({
        success: apiResp.ok,
        raw_message_id: rawMsg?.id || null,
        http_status: apiResp.status,
        query_type,
        url,
        data: responsePayload,
      }),
      { status: apiResp.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[evergreen-commercial-schedules] error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
