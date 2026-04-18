import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const EVERGREEN_CARRIER_CODE = "EGLV";

// ─── Get carrier connection config ───
async function getConnection(carrierId: string, env = "production") {
  const { data, error } = await supabase
    .from("carrier_connections")
    .select("*")
    .eq("carrier_id", carrierId)
    .eq("environment", env)
    .eq("status", "active")
    .single();
  if (error) throw new Error(`No active connection: ${error.message}`);
  return data;
}

// ─── Resolve carrier ID from code ───
async function resolveCarrier(code: string) {
  const { data, error } = await supabase
    .from("alc_carriers")
    .select("id")
    .eq("carrier_code", code)
    .single();
  if (error || !data) throw new Error(`Carrier not found: ${code}`);
  return data.id;
}

// ─── API Key auth: return headers ───
function apiKeyHeaders(conn: any): Record<string, string> {
  const keyName = conn.credential_key_name;
  const apiKey = keyName ? Deno.env.get(keyName) : null;
  if (!apiKey) throw new Error(`API key secret '${keyName}' not configured`);
  const headerName = conn.api_key_header_name || "X-API-Key";
  return {
    [headerName]: apiKey,
    "Content-Type": "application/json",
  };
}

// ─── OAuth: request or refresh token (supports client_credentials and password grant) ───
async function getOAuthToken(conn: any): Promise<string> {
  // Check if cached token is still valid (with 60s buffer)
  if (conn.access_token_encrypted && conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at).getTime();
    if (Date.now() < expiresAt - 60_000) {
      return conn.access_token_encrypted;
    }
  }

  // Request new token — Evergreen uses HTTP Basic auth with grant_type & scope as URL params
  const tokenUrl = conn.oauth_token_url;
  if (!tokenUrl) throw new Error("OAuth token URL not configured");

  // Evergreen uses ID:password (not client_id:client_secret) for HTTP Basic auth
  const username =
    Deno.env.get("EVERGREEN_USERNAME") ||
    conn.oauth_client_id ||
    Deno.env.get("EVERGREEN_CLIENT_ID");
  const password =
    Deno.env.get("EVERGREEN_PASSWORD") ||
    Deno.env.get(conn.oauth_client_secret_key_name || "EVERGREEN_CLIENT_SECRET");

  if (!username || !password) {
    throw new Error("Evergreen credentials (EVERGREEN_USERNAME / EVERGREEN_PASSWORD) not configured");
  }

  const url = new URL(tokenUrl);
  if (!url.searchParams.has("grant_type")) url.searchParams.set("grant_type", "client_credentials");
  if (conn.token_scope && !url.searchParams.has("scope")) url.searchParams.set("scope", conn.token_scope);

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OAuth token request failed (${resp.status}): ${errText}`);
  }

  const tokenData = await resp.json();
  const accessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Persist token
  await supabase
    .from("carrier_connections")
    .update({
      access_token_encrypted: accessToken,
      token_expires_at: expiresAt,
      last_success_at: new Date().toISOString(),
    })
    .eq("id", conn.id);

  // Also update the base_url from env if not already set
  const baseUrl = Deno.env.get("EVERGREEN_BASE_URL");
  if (baseUrl && !conn.base_url) {
    await supabase
      .from("carrier_connections")
      .update({ base_url: baseUrl })
      .eq("id", conn.id);
  }

  return accessToken;
}

// ─── Build auth headers based on connection type ───
async function getAuthHeaders(conn: any): Promise<Record<string, string>> {
  if (conn.auth_type === "oauth") {
    const token = await getOAuthToken(conn);
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }
  // Default: API key
  return apiKeyHeaders(conn);
}

// ─── Public: get ready-to-use auth headers for Evergreen ───
export async function getEvergreenAuthHeaders(env = "production"): Promise<{
  headers: Record<string, string>;
  baseUrl: string;
  carrierId: string;
}> {
  const carrierId = await resolveCarrier(EVERGREEN_CARRIER_CODE);
  const conn = await getConnection(carrierId, env);
  const headers = await getAuthHeaders(conn);
  const baseUrl = conn.base_url || Deno.env.get("EVERGREEN_BASE_URL") || "";
  return { headers, baseUrl, carrierId };
}

// ─── HTTP endpoint for manual token refresh / status check ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action = "status", environment = "production" } = await req.json().catch(() => ({}));
    const carrierId = await resolveCarrier(EVERGREEN_CARRIER_CODE);
    const conn = await getConnection(carrierId, environment);

    if (action === "refresh") {
      if (conn.auth_type !== "oauth") {
        return new Response(
          JSON.stringify({ error: "Connection uses API key, not OAuth" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const token = await getOAuthToken(conn);
      return new Response(
        JSON.stringify({ status: "refreshed", token_preview: token.slice(0, 8) + "...", expires_at: conn.token_expires_at }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "diagnose") {
      const u = Deno.env.get("EVERGREEN_USERNAME") || "";
      const p = Deno.env.get("EVERGREEN_PASSWORD") || "";
      return new Response(
        JSON.stringify({
          username_length: u.length,
          username_first2: u.slice(0, 2),
          username_last2: u.slice(-2),
          password_length: p.length,
          password_first2: p.slice(0, 2),
          password_last2: p.slice(-2),
          has_leading_space_user: u !== u.trimStart(),
          has_trailing_space_user: u !== u.trimEnd(),
          has_leading_space_pass: p !== p.trimStart(),
          has_trailing_space_pass: p !== p.trimEnd(),
          token_url: conn.oauth_token_url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Status check
    const tokenValid = conn.access_token_encrypted && conn.token_expires_at
      ? new Date(conn.token_expires_at).getTime() > Date.now()
      : false;

    return new Response(
      JSON.stringify({
        carrier: EVERGREEN_CARRIER_CODE,
        auth_type: conn.auth_type,
        environment: conn.environment,
        status: conn.status,
        token_valid: conn.auth_type === "oauth" ? tokenValid : null,
        token_expires_at: conn.auth_type === "oauth" ? conn.token_expires_at : null,
        last_success_at: conn.last_success_at,
        base_url_configured: !!(conn.base_url || Deno.env.get("EVERGREEN_BASE_URL")),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
