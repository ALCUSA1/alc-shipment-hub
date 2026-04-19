// HLAG Reefer Live event subscriptions — create / delete
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://api.hlag.com/hlag/external/v3/reefer";

interface SubscribeRequest {
  action: "subscribe";
  carrierBookingReference: string;
  equipmentReference: string;
  packageName?: string;
  shipmentId?: string;
}

interface UnsubscribeRequest {
  action: "unsubscribe";
  subscriptionId: string;
  hlagSubscriptionRowId?: string;
}

type Body = SubscribeRequest | UnsubscribeRequest;

async function hlagFetch(path: string, init: RequestInit) {
  const clientId = Deno.env.get("HLAG_CLIENT_ID");
  const clientSecret = Deno.env.get("HLAG_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { ok: false, status: 401, body: "missing creds" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "X-IBM-Client-Id": clientId,
        "X-IBM-Client-Secret": clientSecret,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers || {}),
      },
      signal: ctrl.signal,
    });
    let text = "";
    try { text = await res.clone().text(); } catch { /* ignore */ }
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }
    return { ok: res.ok, status: res.status, body: (json ?? text) as any };
  } catch (e) {
    return { ok: false, status: 0, body: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = token
      ? await userClient.auth.getUser(token)
      : ({ data: { user: null } } as any);
    const userId = userData?.user?.id;

    const body = (await req.json()) as Body;

    if (body.action === "subscribe") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const projectId = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1] ?? "";
      const callbackUrl = `https://${projectId}.functions.supabase.co/hapag-live-webhook`;
      const callbackSecret = crypto.randomUUID();

      const upstream = await hlagFetch("/event-subscriptions", {
        method: "POST",
        body: JSON.stringify({
          callbackUrl,
          secret: callbackSecret,
          carrierBookingReference: body.carrierBookingReference,
          equipmentReference: body.equipmentReference,
          packageName: body.packageName ?? "REEFER_STANDARD",
        }),
      });

      const simulated = !upstream.ok;
      const subscriptionId = simulated
        ? `SIM-SUB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
        : (upstream.body?.subscriptionId ?? upstream.body?.id ?? null);

      // Persist subscription
      try {
        await supabase.from("hlag_live_subscriptions").insert({
          user_id: userId,
          shipment_id: body.shipmentId ?? null,
          subscription_id: subscriptionId,
          feed_type: "reefer",
          carrier_booking_reference: body.carrierBookingReference,
          equipment_reference: body.equipmentReference,
          callback_url: callbackUrl,
          callback_secret: callbackSecret,
          status: simulated ? "simulated" : "active",
          raw_response: upstream.body,
        });
      } catch (persistErr) {
        console.warn("hlag_live_subscriptions insert skipped:", (persistErr as Error).message);
      }

      return new Response(
        JSON.stringify({ subscriptionId, simulated, upstreamStatus: upstream.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "unsubscribe") {
      const upstream = await hlagFetch(`/event-subscriptions/${body.subscriptionId}`, {
        method: "DELETE",
      });

      try {
        if (body.hlagSubscriptionRowId) {
          await supabase.from("hlag_live_subscriptions")
            .update({ status: "cancelled" })
            .eq("id", body.hlagSubscriptionRowId);
        } else {
          await supabase.from("hlag_live_subscriptions")
            .update({ status: "cancelled" })
            .eq("subscription_id", body.subscriptionId);
        }
      } catch { /* non-blocking */ }

      return new Response(
        JSON.stringify({ ok: true, simulated: !upstream.ok, upstreamStatus: upstream.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hapag-reefer-subscriptions error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
