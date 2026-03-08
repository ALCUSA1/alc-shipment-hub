import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { quote_id, shipment_id, amount, currency = "USD", shipment_ref, carrier } = await req.json();
    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Load platform settings
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("*")
      .limit(1)
      .single();

    const feeType = settings?.platform_fee_type || "percent";
    const feeValue = settings?.platform_fee_value || 5;
    const connectEnabled = settings?.stripe_connect_enabled || false;

    // Calculate platform fee
    const platformFee = feeType === "percent"
      ? Math.round(amount * (feeValue / 100) * 100) / 100
      : Math.min(feeValue, amount);
    const carrierAmount = amount - platformFee;

    // Look up carrier's Stripe Connect account
    let carrierStripeAccountId: string | null = null;
    if (connectEnabled && carrier) {
      const { data: carrierProfile } = await supabaseAdmin
        .from("carrier_payment_profiles")
        .select("stripe_account_id, payment_method, is_active")
        .eq("carrier_name", carrier)
        .eq("is_active", true)
        .single();

      if (carrierProfile?.stripe_account_id && carrierProfile.payment_method === "stripe_connect") {
        carrierStripeAccountId = carrierProfile.stripe_account_id;
      }
    }

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    // Build payment method types based on currency
    const paymentMethodTypes: string[] = ["card"];
    const currLower = currency.toLowerCase();
    if (currLower === "usd") {
      paymentMethodTypes.push("us_bank_account");
    }
    if (currLower === "eur") {
      paymentMethodTypes.push("sepa_debit");
    }

    // Build checkout session options
    const sessionParams: any = {
      customer: customerId,
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency: currLower,
            product_data: {
              name: `Freight Payment${shipment_ref ? ` — ${shipment_ref}` : ""}`,
              description: [
                carrier ? `Carrier: ${carrier}` : null,
                `Platform fee: $${platformFee.toLocaleString()}`,
                `Carrier settlement: $${carrierAmount.toLocaleString()}`,
              ].filter(Boolean).join(" | "),
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/dashboard/quotes`,
      metadata: {
        quote_id: quote_id || "",
        shipment_id: shipment_id || "",
        user_id: user.id,
        carrier: carrier || "",
        platform_fee: platformFee.toString(),
        carrier_amount: carrierAmount.toString(),
      },
    };

    // If carrier has Stripe Connect account, use destination charge
    if (carrierStripeAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(platformFee * 100),
        transfer_data: {
          destination: carrierStripeAccountId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Record payment in DB
    await supabaseAdmin.from("payments").insert({
      quote_id: quote_id || null,
      shipment_id: shipment_id || null,
      user_id: user.id,
      stripe_session_id: session.id,
      amount,
      currency: currency.toUpperCase(),
      status: "pending",
      payment_method: "stripe_checkout",
      platform_fee: platformFee,
      carrier_amount: carrierAmount,
      carrier_settlement_status: carrierStripeAccountId ? "auto_pending" : "manual_pending",
      carrier_name: carrier || null,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
