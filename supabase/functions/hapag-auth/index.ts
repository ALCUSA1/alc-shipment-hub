import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const HLAG_CARRIER_CODE = "HLCU";
const HLAG_HOST = "https://api.hlag.com";

// All Hapag-Lloyd products from the official OpenAPI specs.
// Each `ping` is a low-impact request that proves the IBM gateway accepted our credentials.
// Anything other than 401/403 (e.g. 400 "missing fields", 404 "no data") = creds OK.
type Product = {
  key: string;
  label: string;
  basePath: string;
  ping: { method: "GET" | "POST"; path: string; body?: unknown };
};

const PRODUCTS: Product[] = [
  {
    key: "prices",
    label: "Prices & Quotations",
    basePath: "/hlag/external/v2/quotation-booking-engine/external",
    ping: { method: "POST", path: "/prices", body: { healthCheck: true } },
  },
  {
    key: "commercial_schedules",
    label: "Commercial Schedules (P2P + Vessel)",
    basePath: "/hlag/external/v1",
    ping: { method: "GET", path: "/point-to-point-routes?placeOfReceipt=USHOU&placeOfDelivery=DEHAM&limit=1" },
  },
  {
    key: "ovs",
    label: "Operational Vessel Schedules (DCSA)",
    basePath: "/hlag/external/v3/schedule-dcsa-ovs",
    ping: { method: "GET", path: "/v3/service-schedules?limit=1" },
  },
  {
    key: "tnt",
    label: "Track & Trace (DCSA)",
    basePath: "/hlag/external/v2/events",
    ping: { method: "GET", path: "/?equipmentReference=HLCU0000001&limit=1" },
  },
  {
    key: "live_reefer",
    label: "HL LIVE Reefer Subscriptions",
    basePath: "/hlag/external/v3/reefer",
    ping: { method: "GET", path: "/event-subscriptions?limit=1" },
  },
  {
    key: "live_position",
    label: "Live Position (IoT)",
    basePath: "/hlag/external/iot",
    ping: { method: "GET", path: "/v1/event-subscriptions?limit=1" },
  },
  {
    key: "inland_status",
    label: "Inland Transportation Status (supplier-only)",
    basePath: "/hlag/external/v1/transport-work-orders",
    ping: { method: "GET", path: "/?limit=1" },
  },
];

async function resolveCarrier(code: string) {
  const { data } = await supabase
    .from("alc_carriers")
    .select("id")
    .eq("carrier_code", code)
    .maybeSingle();
  return data?.id ?? null;
}

async function pingProduct(p: Product, clientId: string, clientSecret: string) {
  const url = `${HLAG_HOST}${p.basePath}${p.ping.path}`;
  try {
    const r = await fetch(url, {
      method: p.ping.method,
      headers: {
        "X-IBM-Client-Id": clientId,
        "X-IBM-Client-Secret": clientSecret,
        "Accept": "application/json",
        ...(p.ping.body ? { "Content-Type": "application/json" } : {}),
      },
      body: p.ping.body ? JSON.stringify(p.ping.body) : undefined,
    });
    let preview: string | null = null;
    try { preview = (await r.text()).slice(0, 300); } catch { /* */ }

    const authOk = r.status !== 401 && r.status !== 403;
    let subscribed: "yes" | "no" | "unknown" = "unknown";
    let reason: string | null = null;

    if (!authOk) {
      subscribed = "no";
      reason = `HTTP ${r.status} – credentials rejected or app not subscribed to this product.`;
    } else if (r.status === 404 && /not.?found|no.?subscription/i.test(preview ?? "")) {
      subscribed = "no";
      reason = `HTTP 404 – product likely not subscribed for this client.`;
    } else {
      subscribed = "yes";
    }

    return {
      key: p.key,
      label: p.label,
      base_url: `${HLAG_HOST}${p.basePath}`,
      http_status: r.status,
      auth_ok: authOk,
      subscribed,
      reason,
      response_preview: preview,
    };
  } catch (e: any) {
    return {
      key: p.key,
      label: p.label,
      base_url: `${HLAG_HOST}${p.basePath}`,
      http_status: null,
      auth_ok: false,
      subscribed: "unknown" as const,
      reason: `Network error: ${e?.message ?? "fetch failed"}`,
      response_preview: null,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action = "status", environment = "production" } = await req.json().catch(() => ({}));
    const clientId = Deno.env.get("HLAG_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("HLAG_CLIENT_SECRET") || "";
    const credsConfigured = !!clientId && !!clientSecret;

    if (action === "diagnose") {
      return new Response(JSON.stringify({
        client_id_length: clientId.length,
        client_id_first2: clientId.slice(0, 2),
        client_secret_length: clientSecret.length,
        products: PRODUCTS.map(p => ({ key: p.key, label: p.label, base_url: HLAG_HOST + p.basePath })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!credsConfigured) {
      return new Response(JSON.stringify({
        carrier: HLAG_CARRIER_CODE,
        auth_type: "ibm_api_key",
        environment,
        status: "missing_credentials",
        token_valid: null,
        token_expires_at: null,
        last_success_at: null,
        base_url_configured: false,
        error_reason: "HLAG_CLIENT_ID / HLAG_CLIENT_SECRET secrets are not set.",
        products: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ping all products in parallel
    const results = await Promise.all(PRODUCTS.map(p => pingProduct(p, clientId, clientSecret)));

    const anyAuthOk = results.some(r => r.auth_ok);
    const allAuthFail = results.every(r => !r.auth_ok);
    const subscribedCount = results.filter(r => r.subscribed === "yes").length;

    const overall = anyAuthOk ? "active" : "error";
    const errorReason = allAuthFail
      ? "All Hapag-Lloyd products returned 401/403. The HLAG_CLIENT_ID / HLAG_CLIENT_SECRET are invalid or expired. Regenerate them in https://api-portal.hlag.com."
      : null;

    const carrierId = await resolveCarrier(HLAG_CARRIER_CODE);
    if (overall === "active" && carrierId) {
      await supabase.from("carrier_connections")
        .update({ last_success_at: new Date().toISOString(), status: "active" } as any)
        .eq("carrier_id", carrierId)
        .eq("environment", environment);
    }

    return new Response(JSON.stringify({
      carrier: HLAG_CARRIER_CODE,
      auth_type: "ibm_api_key",
      environment,
      status: overall,
      token_valid: null,
      token_expires_at: null,
      last_success_at: new Date().toISOString(),
      base_url_configured: true,
      error_reason: errorReason,
      products_total: results.length,
      products_subscribed: subscribedCount,
      products: results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
