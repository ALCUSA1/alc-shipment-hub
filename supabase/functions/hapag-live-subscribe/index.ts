import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Hapag-Lloyd Live Subscription Manager
 * Handles CRUD for Reefer telemetry + IoT live position webhook subscriptions.
 *
 * Endpoints:
 *  POST   /  { shipment_id, feed_type, carrier_booking_reference, equipment_reference, trigger_source }
 *  PUT    /  { subscription_id, ...fields }
 *  DELETE /  { subscription_id }
 *
 * Falls back to simulation when HLAG_CLIENT_ID/SECRET missing or upstream fails.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const HLAG_REEFER_URL = "https://api.hlag.com/hlag/external/v3/reefer/event-subscriptions";
const HLAG_IOT_URL = "https://api.hlag.com/hlag/external/iot/v1/event-subscriptions";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function buildCallbackUrl(): string {
  const projectRef = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
  return `https://${projectRef}.supabase.co/functions/v1/hapag-live-webhook`;
}

function generateSecret(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

async function callHlag(
  method: "POST" | "PUT" | "DELETE",
  url: string,
  body?: Record<string, unknown>,
): Promise<{ simulated: boolean; subscriptionId?: string; error?: string }> {
  const clientId = Deno.env.get("HLAG_CLIENT_ID");
  const clientSecret = Deno.env.get("HLAG_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return { simulated: true, subscriptionId: `sim-${crypto.randomUUID()}` };
  }
  try {
    const resp = await fetch(url, {
      method,
      headers: {
        "X-IBM-Client-Id": clientId,
        "X-IBM-Client-Secret": clientSecret,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await resp.text().catch(() => "");
    if (!resp.ok) {
      console.warn(`HLAG live ${method} → ${resp.status}: ${text.slice(0, 300)}`);
      return { simulated: true, subscriptionId: `sim-${crypto.randomUUID()}`, error: `${resp.status}: ${text.slice(0, 200)}` };
    }
    let parsed: any = {};
    try { parsed = text ? JSON.parse(text) : {}; } catch (_) { parsed = {}; }
    return { simulated: false, subscriptionId: parsed.subscriptionId || parsed.id };
  } catch (err) {
    console.warn(`HLAG live fetch error: ${(err as Error).message}`);
    return { simulated: true, subscriptionId: `sim-${crypto.randomUUID()}`, error: (err as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const method = req.method;

    if (method === "POST") {
      const {
        shipment_id,
        feed_type,
        carrier_booking_reference,
        equipment_reference,
        package_name,
        trigger_source = "manual",
      } = body;

      if (!feed_type || !["reefer", "iot"].includes(feed_type)) {
        return new Response(JSON.stringify({ error: "feed_type must be 'reefer' or 'iot'" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!carrier_booking_reference) {
        return new Response(JSON.stringify({ error: "carrier_booking_reference required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callbackUrl = buildCallbackUrl();
      const secret = generateSecret();
      const url = feed_type === "reefer" ? HLAG_REEFER_URL : HLAG_IOT_URL;

      const payload = feed_type === "reefer"
        ? {
            callbackUrl,
            secret,
            carrierBookingReference: carrier_booking_reference,
            equipmentReference: equipment_reference,
            packageName: package_name || "ALC_LIVE_REEFER",
          }
        : {
            callbackUrl,
            callbackCredentials: {
              apiKeys: [
                { apiKeyName: "x-callback-secret", apiKeyLocation: "header", apiKeyValue: secret },
              ],
            },
            eventType: "IOT",
            carrierBookingReference: carrier_booking_reference,
          };

      const { simulated, subscriptionId, error } = await callHlag("POST", url, payload);

      const { data, error: insErr } = await supabase
        .from("hlag_live_subscriptions")
        .insert({
          shipment_id: shipment_id || null,
          carrier_booking_reference,
          equipment_reference: equipment_reference || null,
          feed_type,
          hlag_subscription_id: subscriptionId,
          callback_url: callbackUrl,
          callback_secret: secret,
          package_name: package_name || null,
          status: simulated ? "pending" : "active",
          trigger_source,
          simulated,
          last_error: error || null,
        })
        .select("*")
        .single();

      if (insErr) throw insErr;
      return new Response(JSON.stringify({ success: true, subscription: data, simulated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "PUT") {
      const { subscription_id } = body;
      if (!subscription_id) {
        return new Response(JSON.stringify({ error: "subscription_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: existing } = await supabase
        .from("hlag_live_subscriptions").select("*").eq("id", subscription_id).single();
      if (!existing) {
        return new Response(JSON.stringify({ error: "subscription not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const url = (existing.feed_type === "reefer" ? HLAG_REEFER_URL : HLAG_IOT_URL)
        + `/${existing.hlag_subscription_id}`;
      await callHlag("PUT", url, body.payload || {});
      const { data } = await supabase
        .from("hlag_live_subscriptions")
        .update({ status: body.status || existing.status })
        .eq("id", subscription_id).select("*").single();
      return new Response(JSON.stringify({ success: true, subscription: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE") {
      const { subscription_id } = body;
      const { data: existing } = await supabase
        .from("hlag_live_subscriptions").select("*").eq("id", subscription_id).single();
      if (existing?.hlag_subscription_id && !existing.simulated) {
        const url = (existing.feed_type === "reefer" ? HLAG_REEFER_URL : HLAG_IOT_URL)
          + `/${existing.hlag_subscription_id}`;
        await callHlag("DELETE", url);
      }
      await supabase.from("hlag_live_subscriptions")
        .update({ status: "cancelled" }).eq("id", subscription_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("hapag-live-subscribe error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
