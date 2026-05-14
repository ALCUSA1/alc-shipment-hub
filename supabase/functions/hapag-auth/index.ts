import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const HLAG_CARRIER_CODE = "HLCU";
const HLAG_DEFAULT_BASE_URL = "https://api.hlag.com/hlag/external/v1";

async function resolveCarrier(code: string) {
  const { data, error } = await supabase
    .from("alc_carriers")
    .select("id")
    .eq("carrier_code", code)
    .maybeSingle();
  if (error || !data) throw new Error(`Carrier ${code} not found in alc_carriers`);
  return data.id;
}

async function getConnection(carrierId: string, env = "production") {
  const { data } = await supabase
    .from("carrier_connections")
    .select("*")
    .eq("carrier_id", carrierId)
    .eq("environment", env)
    .maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action = "status", environment = "production" } = await req
      .json()
      .catch(() => ({}));

    const clientId = Deno.env.get("HLAG_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("HLAG_CLIENT_SECRET") || "";

    let carrierId: string | null = null;
    let conn: any = null;
    try {
      carrierId = await resolveCarrier(HLAG_CARRIER_CODE);
      conn = await getConnection(carrierId, environment);
    } catch {
      // carrier row missing – non-fatal for status check
    }

    const baseUrl = conn?.base_url || HLAG_DEFAULT_BASE_URL;
    const credsConfigured = !!clientId && !!clientSecret;

    if (action === "diagnose") {
      return new Response(
        JSON.stringify({
          client_id_length: clientId.length,
          client_id_first2: clientId.slice(0, 2),
          client_secret_length: clientSecret.length,
          base_url: baseUrl,
          carrier_row_present: !!conn,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Live ping (action=status or refresh both ping IBM gateway)
    let pingStatus: number | null = null;
    let pingOk = false;
    let pingBody: string | null = null;
    if (credsConfigured) {
      try {
        const r = await fetch(`${baseUrl}/point-to-point-routes?placeOfReceipt=USHOU&placeOfDelivery=DEHAM&limit=1`, {
          method: "GET",
          headers: {
            "X-IBM-Client-Id": clientId,
            "X-IBM-Client-Secret": clientSecret,
            "Accept": "application/json",
            "API-Version": "1",
          },
        });
        pingStatus = r.status;
        pingOk = r.ok || r.status === 404; // 404 still means auth worked
        try {
          const txt = await r.text();
          pingBody = txt.slice(0, 500);
        } catch { /* ignore */ }
      } catch (e: any) {
        pingOk = false;
        pingBody = e?.message ?? "fetch failed";
      }
    }

    const overall = credsConfigured && pingOk ? "active" : credsConfigured ? "error" : "missing_credentials";

    let errorReason: string | null = null;
    if (overall === "error") {
      if (pingStatus === 401 || pingStatus === 403) {
        errorReason = "Hapag-Lloyd rejected the IBM API credentials (HTTP " + pingStatus + "). The HLAG_CLIENT_ID / HLAG_CLIENT_SECRET secrets are invalid, expired, or not subscribed to the point-to-point-routes product. Please regenerate them in the Hapag-Lloyd developer portal and update the secrets.";
      } else if (pingStatus === 429) {
        errorReason = "Rate limited by Hapag-Lloyd (HTTP 429). Try again shortly.";
      } else if (pingStatus && pingStatus >= 500) {
        errorReason = "Hapag-Lloyd gateway returned HTTP " + pingStatus + ". Upstream issue, retry later.";
      } else {
        errorReason = "Unable to reach Hapag-Lloyd API (HTTP " + (pingStatus ?? "n/a") + ").";
      }
    }

    if (overall === "active" && carrierId) {
      await supabase
        .from("carrier_connections")
        .update({ last_success_at: new Date().toISOString(), status: "active" } as any)
        .eq("carrier_id", carrierId)
        .eq("environment", environment);
    }

    return new Response(
      JSON.stringify({
        carrier: HLAG_CARRIER_CODE,
        auth_type: "ibm_api_key",
        environment,
        status: overall,
        token_valid: null,
        token_expires_at: null,
        last_success_at: conn?.last_success_at || null,
        base_url_configured: !!baseUrl,
        ping_http_status: pingStatus,
        ping_response_preview: pingBody,
        error_reason: errorReason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
