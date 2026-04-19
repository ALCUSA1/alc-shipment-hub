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
    const clientRate = (await req.json()) as RateSelection;

    if (!clientRate?.originPort || !clientRate?.destinationPort || !clientRate?.carrier || !clientRate?.mode) {
      return new Response(JSON.stringify({ error: "Missing shipment booking details." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Resolve canonical financial figures server-side from carrier_rates
    // when a rateId is supplied. Never trust client-provided pricing.
    let rate: RateSelection = clientRate;

    if (clientRate.rateId) {
      const { data: canonical, error: rateErr } = await adminClient
        .from("carrier_rates")
        .select("*")
        .eq("id", clientRate.rateId)
        .maybeSingle();

      if (rateErr || !canonical) {
        return new Response(JSON.stringify({ error: "Selected rate could not be verified." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const surchargesArr = Array.isArray((canonical as any).surcharges) ? (canonical as any).surcharges : [];
      const surchargeTotal = surchargesArr.reduce(
        (sum: number, s: any) => sum + (Number(s?.amount) || 0),
        0,
      );
      const baseRate = Number((canonical as any).base_rate) || 0;
      const totalRate = baseRate + surchargeTotal;

      rate = {
        ...clientRate,
        carrier: (canonical as any).carrier,
        originPort: (canonical as any).origin_port,
        destinationPort: (canonical as any).destination_port,
        mode: (canonical as any).mode,
        containerType: (canonical as any).container_type,
        currency: (canonical as any).currency,
        baseRate,
        surcharges: surchargesArr,
        totalRate,
        transitDays: (canonical as any).transit_days ?? null,
        serviceLevel: (canonical as any).service_level ?? null,
        freeTimeDays: (canonical as any).free_time_days ?? null,
        validFrom: (canonical as any).valid_from,
        validUntil: (canonical as any).valid_until,
      };
    } else {
      // No canonical rateId — strictly validate client-supplied figures.
      const MAX_AMOUNT = 10_000_000;
      const baseRate = Number(clientRate.baseRate);
      const totalRate = Number(clientRate.totalRate);
      if (
        !Number.isFinite(baseRate) || baseRate < 0 || baseRate > MAX_AMOUNT ||
        !Number.isFinite(totalRate) || totalRate < 0 || totalRate > MAX_AMOUNT
      ) {
        return new Response(JSON.stringify({ error: "Invalid rate amounts." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cleanSurcharges = (clientRate.surcharges || [])
        .map((s) => {
          const amt = Number(s?.amount) || 0;
          if (!Number.isFinite(amt) || amt < 0 || amt > MAX_AMOUNT) return null;
          return {
            description: typeof s?.description === "string" ? s.description.slice(0, 200) : undefined,
            code: typeof s?.code === "string" ? s.code.slice(0, 50) : undefined,
            amount: amt,
          };
        })
        .filter(Boolean) as Array<{ description?: string; code?: string; amount: number }>;
      rate = { ...clientRate, baseRate, totalRate, surcharges: cleanSurcharges };
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