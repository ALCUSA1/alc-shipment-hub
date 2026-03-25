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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Optional: settle specific payment_id, otherwise process all pending
    const body = await req.json().catch(() => ({}));
    const { payment_id } = body;

    // Find pending splits for completed payments
    let query = supabaseAdmin
      .from("payment_splits")
      .select("*, payments!inner(id, status, stripe_payment_intent_id)")
      .eq("status", "pending")
      .eq("payments.status", "completed");

    if (payment_id) {
      query = query.eq("payment_id", payment_id);
    }

    const { data: pendingSplits, error: fetchError } = await query.limit(100);
    if (fetchError) throw fetchError;

    if (!pendingSplits || pendingSplits.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending splits to settle", settled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const results: Array<{ split_id: string; carrier: string; status: string; error?: string }> = [];

    for (const split of pendingSplits) {
      // Skip if no Stripe Connect account
      if (!split.carrier_stripe_account_id) {
        await supabaseAdmin
          .from("payment_splits")
          .update({
            status: "manual_required",
            transfer_error: "No Stripe Connect account configured",
          })
          .eq("id", split.id);

        results.push({
          split_id: split.id,
          carrier: split.carrier_name,
          status: "manual_required",
          error: "No Stripe Connect account",
        });
        continue;
      }

      // Calculate net transfer amount (carrier amount minus their proportional fee)
      const netAmount = split.amount - split.platform_fee;
      if (netAmount <= 0) {
        await supabaseAdmin
          .from("payment_splits")
          .update({ status: "settled", settled_at: new Date().toISOString() })
          .eq("id", split.id);

        results.push({ split_id: split.id, carrier: split.carrier_name, status: "settled" });
        continue;
      }

      try {
        // Create Stripe transfer to carrier's Connect account
        const transfer = await stripe.transfers.create({
          amount: Math.round(netAmount * 100), // cents
          currency: split.currency.toLowerCase(),
          destination: split.carrier_stripe_account_id,
          description: `Settlement for carrier ${split.carrier_name} — Payment ${split.payment_id}`,
          metadata: {
            payment_id: split.payment_id,
            split_id: split.id,
            carrier_name: split.carrier_name,
          },
        });

        // Update split record
        await supabaseAdmin
          .from("payment_splits")
          .update({
            status: "settled",
            stripe_transfer_id: transfer.id,
            settled_at: new Date().toISOString(),
          })
          .eq("id", split.id);

        results.push({ split_id: split.id, carrier: split.carrier_name, status: "settled" });
      } catch (transferError: any) {
        console.error(`Transfer failed for split ${split.id}:`, transferError);

        await supabaseAdmin
          .from("payment_splits")
          .update({
            status: "failed",
            transfer_error: transferError.message,
          })
          .eq("id", split.id);

        results.push({
          split_id: split.id,
          carrier: split.carrier_name,
          status: "failed",
          error: transferError.message,
        });
      }
    }

    // Check if all splits for each payment are settled, update parent payment
    const paymentIds = [...new Set(pendingSplits.map((s: any) => s.payment_id))];
    for (const pid of paymentIds) {
      const { data: allSplits } = await supabaseAdmin
        .from("payment_splits")
        .select("status")
        .eq("payment_id", pid);

      if (allSplits && allSplits.every((s: any) => s.status === "settled")) {
        await supabaseAdmin
          .from("payments")
          .update({ carrier_settlement_status: "settled" })
          .eq("id", pid);
      } else if (allSplits && allSplits.some((s: any) => s.status === "failed")) {
        await supabaseAdmin
          .from("payments")
          .update({ carrier_settlement_status: "partial_failed" })
          .eq("id", pid);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} splits`,
        settled: results.filter((r) => r.status === "settled").length,
        failed: results.filter((r) => r.status === "failed").length,
        manual: results.filter((r) => r.status === "manual_required").length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Settle error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
