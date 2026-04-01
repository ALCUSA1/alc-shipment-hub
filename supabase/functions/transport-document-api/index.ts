import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* ═══════════════════════════════════════════
   Auth helpers — carrier-agnostic
   ═══════════════════════════════════════════ */

async function resolveCarrier(code: string) {
  const { data, error } = await supabase
    .from("alc_carriers").select("id")
    .eq("carrier_code", code.toUpperCase()).single();
  if (error || !data) throw new Error(`Carrier not found: ${code}`);
  return data.id;
}

async function getConnection(carrierId: string, env = "production") {
  const { data, error } = await supabase
    .from("carrier_connections").select("*")
    .eq("carrier_id", carrierId)
    .eq("environment", env)
    .eq("status", "active")
    .single();
  if (error) throw new Error(`No active connection: ${error.message}`);
  return data;
}

function apiKeyHeaders(conn: any): Record<string, string> {
  const keyName = conn.credential_key_name;
  const apiKey = keyName ? Deno.env.get(keyName) : null;
  if (!apiKey) throw new Error(`API key secret '${keyName}' not configured`);
  return {
    [conn.api_key_header_name || "X-API-Key"]: apiKey,
    "Content-Type": "application/json",
  };
}

async function getOAuthToken(conn: any): Promise<string> {
  if (conn.access_token_encrypted && conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at).getTime();
    if (Date.now() < expiresAt - 60_000) return conn.access_token_encrypted;
  }

  const tokenUrl = conn.oauth_token_url;
  if (!tokenUrl) throw new Error("OAuth token URL not configured");

  const clientId = conn.oauth_client_id || Deno.env.get("EVERGREEN_CLIENT_ID");
  const clientSecretKeyName = conn.oauth_client_secret_key_name || "EVERGREEN_CLIENT_SECRET";
  const clientSecret = Deno.env.get(clientSecretKeyName);
  if (!clientId || !clientSecret) throw new Error("OAuth credentials not configured");

  const username = Deno.env.get("EVERGREEN_USERNAME");
  const password = Deno.env.get("EVERGREEN_PASSWORD");

  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  if (username && password) {
    body.set("grant_type", "password");
    body.set("username", username);
    body.set("password", password);
  } else {
    body.set("grant_type", "client_credentials");
  }
  if (conn.token_scope) body.set("scope", conn.token_scope);

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!resp.ok) throw new Error(`OAuth token failed (${resp.status}): ${await resp.text()}`);

  const tokenData = await resp.json();
  const accessToken = tokenData.access_token;
  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  await supabase.from("carrier_connections")
    .update({ access_token_encrypted: accessToken, token_expires_at: expiresAt, last_success_at: new Date().toISOString() })
    .eq("id", conn.id);

  return accessToken;
}

async function getAuthHeaders(conn: any): Promise<Record<string, string>> {
  if (conn.auth_type === "oauth") {
    const token = await getOAuthToken(conn);
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }
  return apiKeyHeaders(conn);
}

/* ═══════════════════════════════════════════
   Raw message storage
   ═══════════════════════════════════════════ */

async function storeRaw(
  carrierId: string,
  messageType: string,
  externalRef: string | null,
  requestPayload: any,
  responsePayload: any,
  responseStatus: number
) {
  const { data, error } = await supabase.from("carrier_raw_messages").insert({
    carrier_id: carrierId,
    source_channel: "api",
    message_family: "transport_document",
    message_type: messageType,
    external_reference: externalRef,
    payload_format: "json",
    request_payload_json: requestPayload,
    response_payload_json: responsePayload,
    response_status_code: responseStatus,
    processing_status: "pending",
    received_at: new Date().toISOString(),
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

/* ═══════════════════════════════════════════
   Ingest trigger — calls td-ingest internally
   ═══════════════════════════════════════════ */

async function triggerIngest(carrierId: string, rawMessageId: string, payload: any) {
  // Resolve carrier code for td-ingest
  const { data: carrier } = await supabase
    .from("alc_carriers").select("carrier_code").eq("id", carrierId).single();

  const ingestUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/td-ingest`;
  const resp = await fetch(ingestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      carrier_id: carrierId,
      carrier_code: carrier?.carrier_code,
      message_type: "td_response",
      payload,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("td-ingest call failed:", errText);
    // Mark raw message as error
    await supabase.from("carrier_raw_messages")
      .update({ processing_status: "error", error_message: `Ingest failed: ${resp.status}` })
      .eq("id", rawMessageId);
    throw new Error(`td-ingest failed (${resp.status}): ${errText}`);
  }

  // Mark raw as processed
  await supabase.from("carrier_raw_messages")
    .update({ processing_status: "processed", processed_at: new Date().toISOString() })
    .eq("id", rawMessageId);

  return await resp.json();
}

/* ═══════════════════════════════════════════
   Action handlers
   ═══════════════════════════════════════════ */

/** 1. Fetch Transport Document from carrier API */
async function handleFetch(body: any) {
  const { carrier_code, transport_document_reference, environment = "production" } = body;
  if (!carrier_code || !transport_document_reference) {
    return json({ error: "carrier_code and transport_document_reference required" }, 400);
  }

  const carrierId = await resolveCarrier(carrier_code);
  const conn = await getConnection(carrierId, environment);
  const headers = await getAuthHeaders(conn);
  const baseUrl = conn.base_url || Deno.env.get("EVERGREEN_BASE_URL") || "";

  const apiUrl = `${baseUrl}/v3/transport-documents/${encodeURIComponent(transport_document_reference)}`;
  const resp = await fetch(apiUrl, { method: "GET", headers });
  const responsePayload = await resp.json().catch(() => ({ status: resp.status }));

  // Store raw request and response
  const rawId = await storeRaw(carrierId, "td_fetch", transport_document_reference, { url: apiUrl }, responsePayload, resp.status);

  if (!resp.ok) {
    await supabase.from("carrier_raw_messages")
      .update({ processing_status: "error", error_message: `Carrier API ${resp.status}` })
      .eq("id", rawId);
    return json({ error: "Carrier API error", status: resp.status, details: responsePayload, raw_message_id: rawId }, resp.status >= 500 ? 502 : resp.status);
  }

  // Trigger ingest pipeline
  const result = await triggerIngest(carrierId, rawId, responsePayload);
  return json({ success: true, raw_message_id: rawId, ...result });
}

/** 2. Approve Transport Document */
async function handleApprove(body: any) {
  const { carrier_code, transport_document_reference, environment = "production" } = body;
  if (!carrier_code || !transport_document_reference) {
    return json({ error: "carrier_code and transport_document_reference required" }, 400);
  }

  const carrierId = await resolveCarrier(carrier_code);
  const conn = await getConnection(carrierId, environment);
  const headers = await getAuthHeaders(conn);
  const baseUrl = conn.base_url || Deno.env.get("EVERGREEN_BASE_URL") || "";

  const patchBody = { transportDocumentStatus: "APPROVED" };
  const apiUrl = `${baseUrl}/v3/transport-documents/${encodeURIComponent(transport_document_reference)}`;

  const resp = await fetch(apiUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patchBody),
  });
  const responsePayload = await resp.json().catch(() => ({ status: resp.status }));

  const rawId = await storeRaw(carrierId, "td_approve", transport_document_reference, patchBody, responsePayload, resp.status);

  // Update local TD status to approval_pending
  await supabase.from("transport_documents")
    .update({ transport_document_status: "approval_pending", source_message_id: rawId })
    .eq("transport_document_reference", transport_document_reference)
    .eq("alc_carrier_id", carrierId);

  if (!resp.ok) {
    await supabase.from("carrier_raw_messages")
      .update({ processing_status: "error", error_message: `Approval failed: ${resp.status}` })
      .eq("id", rawId);
    return json({ error: "Approval failed", status: resp.status, details: responsePayload, raw_message_id: rawId }, resp.status >= 500 ? 502 : resp.status);
  }

  await supabase.from("carrier_raw_messages")
    .update({ processing_status: "processed", processed_at: new Date().toISOString() })
    .eq("id", rawId);

  return json({ success: true, status: "approval_pending", raw_message_id: rawId });
}

/** 3. Poll / Sync Transport Document status */
async function handleSync(body: any) {
  const { carrier_code, transport_document_reference, environment = "production" } = body;
  if (!carrier_code || !transport_document_reference) {
    return json({ error: "carrier_code and transport_document_reference required" }, 400);
  }

  const carrierId = await resolveCarrier(carrier_code);
  const conn = await getConnection(carrierId, environment);
  const headers = await getAuthHeaders(conn);
  const baseUrl = conn.base_url || Deno.env.get("EVERGREEN_BASE_URL") || "";

  const apiUrl = `${baseUrl}/v3/transport-documents/${encodeURIComponent(transport_document_reference)}`;
  const resp = await fetch(apiUrl, { method: "GET", headers });
  const responsePayload = await resp.json().catch(() => ({ status: resp.status }));

  const rawId = await storeRaw(carrierId, "td_sync", transport_document_reference, { url: apiUrl }, responsePayload, resp.status);

  if (!resp.ok) {
    await supabase.from("carrier_raw_messages")
      .update({ processing_status: "error", error_message: `Sync failed: ${resp.status}` })
      .eq("id", rawId);
    return json({ error: "Sync failed", status: resp.status, raw_message_id: rawId }, resp.status >= 500 ? 502 : resp.status);
  }

  // Re-ingest to update all normalized data
  const result = await triggerIngest(carrierId, rawId, responsePayload);
  return json({ success: true, raw_message_id: rawId, ...result });
}

/** 4. Receive Transport Document notification (webhook) */
async function handleNotification(body: any) {
  const { carrier_code, carrier_id: directCarrierId, payload } = body;
  if (!payload) return json({ error: "payload required" }, 400);

  let carrierId: string;
  if (directCarrierId) {
    carrierId = directCarrierId;
  } else if (carrier_code) {
    carrierId = await resolveCarrier(carrier_code);
  } else {
    return json({ error: "carrier_code or carrier_id required" }, 400);
  }

  const tdRef = payload.transportDocumentReference || payload.tdReference;
  const tdStatus = payload.transportDocumentStatus || payload.documentStatus;

  const rawId = await storeRaw(carrierId, "td_notification", tdRef, null, payload, 200);

  // Quick status update on local record
  if (tdRef && tdStatus) {
    await supabase.from("transport_documents")
      .update({ transport_document_status: tdStatus.toLowerCase(), source_message_id: rawId })
      .eq("transport_document_reference", tdRef)
      .eq("alc_carrier_id", carrierId);
  }

  // If the notification contains full TD payload, run full ingest
  if (payload.billOfLadingNumber || payload.consignmentItems || payload.utilizedTransportEquipments) {
    try {
      await triggerIngest(carrierId, rawId, payload);
    } catch (e) {
      console.error("Notification ingest failed:", e);
    }
  } else {
    await supabase.from("carrier_raw_messages")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("id", rawId);
  }

  return json({ success: true, raw_message_id: rawId });
}

/** 5. Reject / Void Transport Document */
async function handleStatusChange(body: any) {
  const { carrier_code, transport_document_reference, target_status, environment = "production" } = body;
  if (!carrier_code || !transport_document_reference || !target_status) {
    return json({ error: "carrier_code, transport_document_reference, and target_status required" }, 400);
  }

  const allowed = ["REJECTED", "VOID"];
  if (!allowed.includes(target_status.toUpperCase())) {
    return json({ error: `target_status must be one of: ${allowed.join(", ")}` }, 400);
  }

  const carrierId = await resolveCarrier(carrier_code);
  const conn = await getConnection(carrierId, environment);
  const headers = await getAuthHeaders(conn);
  const baseUrl = conn.base_url || Deno.env.get("EVERGREEN_BASE_URL") || "";

  const patchBody = { transportDocumentStatus: target_status.toUpperCase() };
  const apiUrl = `${baseUrl}/v3/transport-documents/${encodeURIComponent(transport_document_reference)}`;

  const resp = await fetch(apiUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patchBody),
  });
  const responsePayload = await resp.json().catch(() => ({ status: resp.status }));

  const rawId = await storeRaw(carrierId, `td_${target_status.toLowerCase()}`, transport_document_reference, patchBody, responsePayload, resp.status);

  const internalStatus = target_status.toLowerCase() === "void" ? "voided" : target_status.toLowerCase();

  await supabase.from("transport_documents")
    .update({ transport_document_status: internalStatus, source_message_id: rawId })
    .eq("transport_document_reference", transport_document_reference)
    .eq("alc_carrier_id", carrierId);

  if (!resp.ok) {
    await supabase.from("carrier_raw_messages")
      .update({ processing_status: "error", error_message: `Status change failed: ${resp.status}` })
      .eq("id", rawId);
    return json({ error: "Status change failed", status: resp.status, raw_message_id: rawId }, resp.status >= 500 ? 502 : resp.status);
  }

  await supabase.from("carrier_raw_messages")
    .update({ processing_status: "processed", processed_at: new Date().toISOString() })
    .eq("id", rawId);

  return json({ success: true, status: internalStatus, raw_message_id: rawId });
}

/* ═══════════════════════════════════════════
   Router
   ═══════════════════════════════════════════ */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    switch (action) {
      case "fetch":
        return await handleFetch(body);
      case "approve":
        return await handleApprove(body);
      case "sync":
        return await handleSync(body);
      case "notification":
        return await handleNotification(body);
      case "status_change":
        return await handleStatusChange(body);
      default:
        return json({
          error: "Unknown action. Supported: fetch, approve, sync, notification, status_change",
          actions: {
            fetch: "GET transport document from carrier API",
            approve: "PATCH to approve transport document",
            sync: "Poll carrier API for latest status",
            notification: "Receive inbound carrier notification",
            status_change: "PATCH to reject or void transport document",
          },
        }, 400);
    }
  } catch (err: any) {
    console.error("transport-document-api error:", err);
    return json({ error: err.message }, 500);
  }
});
