import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const EVERGREEN_CARRIER_CODE = "EGLV";

// ─── Resolve auth headers from carrier_connections ───
async function getEvergreenAuth(env = "production") {
  const { data: carrier } = await supabase
    .from("alc_carriers")
    .select("id")
    .eq("carrier_code", EVERGREEN_CARRIER_CODE)
    .single();
  if (!carrier) throw new Error("Evergreen carrier not found");

  const { data: conn } = await supabase
    .from("carrier_connections")
    .select("*")
    .eq("carrier_id", carrier.id)
    .eq("environment", env)
    .eq("status", "active")
    .single();
  if (!conn) throw new Error("No active Evergreen connection");

  let headers: Record<string, string> = { "Content-Type": "application/json" };

  if (conn.auth_type === "oauth") {
    // Check token freshness
    let token = conn.access_token_encrypted;
    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;

    if (!token || Date.now() >= expiresAt - 60_000) {
      // Refresh via evergreen-auth function
      const authResp = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/evergreen-auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ action: "refresh", environment: env }),
        }
      );
      if (!authResp.ok) throw new Error("Failed to refresh OAuth token");
      // Re-fetch connection for updated token
      const { data: refreshed } = await supabase
        .from("carrier_connections")
        .select("access_token_encrypted")
        .eq("id", conn.id)
        .single();
      token = refreshed?.access_token_encrypted;
    }
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    // API Key
    const keyName = conn.credential_key_name;
    const apiKey = keyName ? Deno.env.get(keyName) : null;
    if (!apiKey) throw new Error(`API key '${keyName}' not configured`);
    const headerName = conn.api_key_header_name || "X-API-Key";
    headers[headerName] = apiKey;
  }

  return { headers, baseUrl: conn.base_url || "", carrierId: carrier.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { container_number, booking_number, bill_of_lading_number, environment = "production" } = body;

    if (!container_number && !booking_number && !bill_of_lading_number) {
      return new Response(
        JSON.stringify({ error: "Provide at least one of: container_number, booking_number, bill_of_lading_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = await getEvergreenAuth(environment);

    // Build query params for Evergreen TNT API
    const params = new URLSearchParams();
    if (container_number) params.set("equipmentReference", container_number);
    if (booking_number) params.set("carrierBookingReference", booking_number);
    if (bill_of_lading_number) params.set("transportDocumentReference", bill_of_lading_number);

    const tntUrl = `${auth.baseUrl}/track-and-trace?${params.toString()}`;

    console.log(`[evergreen-tnt] Fetching: ${tntUrl}`);

    const apiResp = await fetch(tntUrl, { method: "GET", headers: auth.headers });
    const responsePayload = await apiResp.json().catch(() => null);
    const responseText = responsePayload ? null : await apiResp.text().catch(() => "");

    // ── Step 1: Store raw payload in carrier_raw_messages ──
    const { data: rawMsg, error: rawErr } = await supabase
      .from("carrier_raw_messages")
      .insert({
        carrier_id: auth.carrierId,
        source_channel: "api_pull",
        message_family: "tracking",
        message_type: "tnt_response",
        external_reference: container_number || booking_number || bill_of_lading_number,
        payload_format: "json",
        request_payload_json: { container_number, booking_number, bill_of_lading_number, url: tntUrl },
        response_payload_json: responsePayload || { raw_text: responseText },
        http_status: apiResp.status,
        processing_status: apiResp.ok ? "pending" : "error",
        error_message: apiResp.ok ? null : `HTTP ${apiResp.status}`,
      })
      .select("id")
      .single();

    if (rawErr) throw rawErr;

    // ── Step 2: Create integration_jobs record ──
    let jobId: string | null = null;
    if (apiResp.ok && responsePayload) {
      const { data: job } = await supabase
        .from("integration_jobs")
        .insert({
          raw_message_id: rawMsg.id,
          carrier_id: auth.carrierId,
          job_type: "transform_tracking_tnt_response",
          job_status: "pending",
        })
        .select("id")
        .single();
      jobId = job?.id || null;

      // ── Step 3: Trigger transformation via carrier-ingest pattern ──
      // Fire-and-forget call to carrier-ingest for async processing
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/carrier-ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          carrier_code: EVERGREEN_CARRIER_CODE,
          message_family: "tracking",
          message_type: "event",
          external_reference: container_number || booking_number || bill_of_lading_number,
          source_channel: "api_pull",
          response_payload: responsePayload,
        }),
      }).catch((e) => console.error("[evergreen-tnt] ingest trigger error:", e));
    }

    return new Response(
      JSON.stringify({
        success: apiResp.ok,
        raw_message_id: rawMsg.id,
        job_id: jobId,
        http_status: apiResp.status,
        events_count: Array.isArray(responsePayload?.events) ? responsePayload.events.length : null,
      }),
      { status: apiResp.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[evergreen-tnt] error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
