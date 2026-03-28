import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RateSelection = {
  rateId: string;
  carrier: string;
  originPort: string;
  destinationPort: string;
  mode: "ocean" | "air";
  containerType: string;
  baseRate: number;
  surcharges: Array<{ description?: string; code?: string; amount?: number | string }>;
  totalRate: number;
  currency: string;
  transitDays: number | null;
  etd: string | null;
  eta: string | null;
  validFrom: string;
  validUntil: string;
  serviceLevel: string | null;
  freeTimeDays: number | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Please log in to book a shipment." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Please log in to book a shipment." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = authData.user;
    const rate = (await req.json()) as RateSelection;

    if (!rate?.originPort || !rate?.destinationPort || !rate?.carrier || !rate?.mode) {
      return new Response(JSON.stringify({ error: "Missing shipment booking details." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await adminClient
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const margin = 0.12;
    const sellPrice = Math.round(rate.totalRate / (1 - margin));

    const { data: shipment, error: shipmentError } = await adminClient
      .from("shipments")
      .insert({
        user_id: user.id,
        company_id: membership?.company_id || null,
        origin_port: rate.originPort,
        destination_port: rate.destinationPort,
        mode: rate.mode,
        container_type: rate.containerType,
        carrier: rate.carrier,
        status: "draft",
        lifecycle_stage: "draft",
        etd: rate.etd?.split("T")[0] || null,
        eta: rate.eta?.split("T")[0] || null,
        shipment_type: "export",
      } as never)
      .select("id, shipment_ref")
      .single();

    if (shipmentError || !shipment) {
      throw shipmentError || new Error("Failed to create shipment draft");
    }

    const financialEntries = [
      {
        shipment_id: shipment.id,
        user_id: user.id,
        entry_type: "cost",
        category: "ocean_freight",
        description: `${rate.carrier} base rate — ${rate.originPort} → ${rate.destinationPort}`,
        amount: rate.baseRate,
        currency: rate.currency,
        vendor: rate.carrier,
      },
      {
        shipment_id: shipment.id,
        user_id: user.id,
        entry_type: "revenue",
        category: "ocean_freight",
        description: `Sell price — ${rate.originPort} → ${rate.destinationPort}`,
        amount: sellPrice,
        currency: rate.currency,
      },
      ...((rate.surcharges || []).map((surcharge) => ({
        shipment_id: shipment.id,
        user_id: user.id,
        entry_type: "cost",
        category: "surcharges",
        description: surcharge.description || surcharge.code || "Surcharge",
        amount: Number(surcharge.amount) || 0,
        currency: rate.currency,
        vendor: rate.carrier,
      }))),
    ];

    const { error: financialsError } = await adminClient
      .from("shipment_financials")
      .insert(financialEntries as never[]);

    if (financialsError) {
      throw financialsError;
    }

    return new Response(JSON.stringify({ shipment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-shipment-draft error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to create shipment draft",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});