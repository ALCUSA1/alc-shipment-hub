// Creates a Stripe Checkout session in subscription mode for the chosen plan + interval.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_MAP: Record<string, Record<string, string>> = {
  solo:  { monthly: "price_1TWzZp8jG2mKZ6OJ8h1EHuFQ", annual: "price_1TWziU8jG2mKZ6OJiF7Idsyv" },
  team:  { monthly: "price_1TWzkC8jG2mKZ6OJV0ToUyyO", annual: "price_1TX09r8jG2mKZ6OJV2SFusVm" },
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

    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan || "");
    const interval = String(body.billing_interval || "monthly");
    const priceId = PRICE_MAP[plan]?.[interval];
    if (!priceId) throw new Error(`No Stripe price configured for plan=${plan} interval=${interval}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil" as any,
    });

    // Reuse customer if exists
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = existing.data[0]?.id;

    const origin = req.headers.get("origin") || "https://alllogisticscargo.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: "always",
      subscription_data: { metadata: { user_id: user.id, plan, billing_interval: interval } },
      metadata: { user_id: user.id, plan, billing_interval: interval },
      success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
