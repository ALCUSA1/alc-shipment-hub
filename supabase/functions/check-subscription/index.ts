// Reads the user's Stripe subscription and upserts public.subscriptions to reflect status.
// Returns { subscribed, status, plan, billing_interval, trial_ends_at, current_period_end }.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_TO_PLAN: Record<string, { plan: string; interval: string; perShipmentCents: number }> = {
  price_1TWzZp8jG2mKZ6OJ8h1EHuFQ: { plan: "solo", interval: "monthly", perShipmentCents: 5900 },
  price_1TWziU8jG2mKZ6OJiF7Idsyv: { plan: "solo", interval: "annual",  perShipmentCents: 5900 },
  price_1TWzkC8jG2mKZ6OJV0ToUyyO: { plan: "team", interval: "monthly", perShipmentCents: 5900 },
  price_1TX09r8jG2mKZ6OJV2SFusVm: { plan: "team", interval: "annual",  perShipmentCents: 5900 },
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
    if (!user?.email) throw new Error("Not authenticated");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil" as any,
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];

    if (!customer) {
      // No Stripe customer yet — return existing local subscription row (trial)
      const { data: existing } = await admin
        .from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
      return new Response(JSON.stringify({ subscribed: false, ...(existing || {}) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 1,
    });
    const sub = subs.data[0];

    if (!sub) {
      await admin.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customer.id,
      } as any, { onConflict: "user_id" });
      return new Response(JSON.stringify({ subscribed: false, stripe_customer_id: customer.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = sub.items.data[0]?.price?.id || "";
    const meta = PRICE_TO_PLAN[priceId];
    const status = sub.status; // active, trialing, past_due, canceled, incomplete...
    const periodEnd = new Date((sub as any).current_period_end * 1000).toISOString();

    const { data: updated } = await admin.from("subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      plan: meta?.plan,
      billing_interval: meta?.interval,
      per_shipment_fee_cents: meta?.perShipmentCents,
      status,
      current_period_end: periodEnd,
      default_payment_method_id: (customer.invoice_settings?.default_payment_method as string) || null,
    } as any, { onConflict: "user_id" }).select().single();

    return new Response(JSON.stringify({
      subscribed: status === "active" || status === "trialing",
      ...updated,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[check-subscription]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
