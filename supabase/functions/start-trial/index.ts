// Starts a 14-day free trial for the authenticated user.
// Inserts/updates a public.subscriptions row with status='trialing' (or 'sales_lead' for Enterprise).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRIAL_DAYS = 14;
const VALID_PLANS = ["solo", "team", "enterprise"] as const;
const VALID_INTERVALS = ["monthly", "annual"] as const;

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
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Not authenticated");

    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan || "");
    const interval = String(body.billing_interval || "monthly");
    const companyName = body.company_name ? String(body.company_name) : null;
    const notes = body.notes ? String(body.notes) : null;

    if (!VALID_PLANS.includes(plan as any)) throw new Error("Invalid plan");
    if (!VALID_INTERVALS.includes(interval as any)) throw new Error("Invalid billing_interval");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const isEnterprise = plan === "enterprise";
    const trialEnds = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Upsert subscription row
    const { error: upsertErr } = await admin
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        plan,
        billing_interval: interval,
        status: isEnterprise ? "sales_lead" : "trialing",
        trial_ends_at: isEnterprise ? null : trialEnds,
      } as any, { onConflict: "user_id" });

    if (upsertErr) throw upsertErr;

    if (isEnterprise) {
      await admin.from("sales_leads").insert({
        user_id: user.id,
        company_name: companyName,
        email: user.email,
        notes,
        plan_interest: "enterprise",
        status: "new",
      } as any);
    }

    return new Response(JSON.stringify({ ok: true, status: isEnterprise ? "sales_lead" : "trialing", trial_ends_at: isEnterprise ? null : trialEnds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[start-trial]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
