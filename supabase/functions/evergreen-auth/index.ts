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

// ─── OAuth: request or refresh token ───
async function getOAuthToken(conn: any): Promise<string> {
  // Check if cached token is still valid (with 60s buffer)
  if (conn.access_token_encrypted && conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at).getTime();
    if (Date.now() < expiresAt - 60_000) {
      return conn.access_token_encrypted;
    }
  }

  // Request new token
  const tokenUrl = conn.oauth_token_url;
  if (!tokenUrl) throw new Error("OAuth token URL not configured");

  const clientId = conn.oauth_client_id;
  const clientSecretKeyName = conn.oauth_client_secret_key_name;
  const clientSecret = clientSecretKeyName ? Deno.env.get(clientSecretKeyName) : null;

  if (!clientId || !clientSecret) {
    throw new Error("OAuth client_id or client_secret not configured");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (conn.token_scope) body.set("scope", conn.token_scope);

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
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
  return { headers, baseUrl: conn.base_url || "", carrierId };
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
