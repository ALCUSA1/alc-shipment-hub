// Charges the per-shipment fee on the user's saved card (off-session).
// Called server-side when a booking is confirmed. Body: { shipment_id, user_id (optional, defaults to auth user) }.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const body = await req.json().catch(() => ({}));
    const shipmentId = body.shipment_id ? String(body.shipment_id) : null;
    if (!shipmentId) throw new Error("shipment_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: sub } = await admin
      .from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();

    if (!sub) throw new Error("No subscription on file");
    if (sub.status !== "active" && sub.status !== "trialing")
      throw new Error(`Subscription status ${sub.status} — cannot charge per-shipment fee`);
    if (!sub.stripe_customer_id) throw new Error("No Stripe customer — subscribe first");
    if (!sub.per_shipment_fee_cents) throw new Error("No per-shipment fee configured");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil" as any,
    });

    // Find the customer's default payment method
    const customer = await stripe.customers.retrieve(sub.stripe_customer_id) as any;
    let pmId: string | undefined =
      customer.invoice_settings?.default_payment_method ||
      sub.default_payment_method_id ||
      undefined;
    if (!pmId) {
      const pms = await stripe.paymentMethods.list({ customer: sub.stripe_customer_id, type: "card", limit: 1 });
      pmId = pms.data[0]?.id;
    }
    if (!pmId) throw new Error("No saved payment method on customer");

    const intent = await stripe.paymentIntents.create({
      amount: sub.per_shipment_fee_cents,
      currency: "usd",
      customer: sub.stripe_customer_id,
      payment_method: pmId,
      off_session: true,
      confirm: true,
      description: `Per-shipment fee for shipment ${shipmentId}`,
      metadata: { user_id: user.id, shipment_id: shipmentId, kind: "per_shipment_fee" },
    });

    return new Response(JSON.stringify({ ok: true, payment_intent_id: intent.id, status: intent.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[charge-shipment-fee]", msg);
    return new Response(JSON.stringify({ error: msg, code: e?.code }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
