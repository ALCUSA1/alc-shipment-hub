import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * sync-carrier-rates Edge Function
 *
 * Fetches contract and spot rates from carrier APIs and upserts into carrier_rates.
 * Supports: Maersk, CMA CGM, Hapag-Lloyd
 *
 * Accepts:
 *   { origin: string, destination: string } — sync rates for a specific lane
 *   { sync_mode: "all_lanes" } — sync all known lanes from carriers
 */

interface CarrierRate {
  carrier: string;
  origin_port: string;
  destination_port: string;
  container_type: string;
  base_rate: number;
  currency: string;
  surcharges: any[];
  transit_days: number | null;
  valid_from: string;
  valid_until: string;
  rate_basis_type: string;
  contract_number: string | null;
  mode: string;
  notes: string | null;
}

// ─── Maersk Rates API ────────────────────────────────────────────────────────

async function fetchMaerskRates(origin: string, destination: string): Promise<CarrierRate[]> {
  const apiKey = Deno.env.get("MAERSK_API_KEY");
  if (!apiKey) {
    console.log("⚠️ MAERSK_API_KEY not configured, skipping Maersk rates");
    return [];
  }

  try {
    // Maersk Spot Rates API
    const spotRes = await fetch(
      `https://api.maersk.com/products/ocean-products?originPort=${encodeURIComponent(origin)}&destinationPort=${encodeURIComponent(destination)}`,
      {
        headers: {
          "Consumer-Key": apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!spotRes.ok) {
      console.error(`Maersk Rates API error [${spotRes.status}]: ${await spotRes.text()}`);
      return [];
    }

    const data = await spotRes.json();
    const rates: CarrierRate[] = [];
    const products = Array.isArray(data) ? data : data?.oceanProducts || data?.products || [];

    for (const product of products) {
      const containers = product.containerTypes || product.equipmentDetails || [];
      for (const container of containers) {
        const surcharges: any[] = [];
        const surchargeItems = container.surcharges || product.surcharges || [];
        for (const s of surchargeItems) {
          surcharges.push({
            code: s.chargeCode || s.code,
            name: s.chargeName || s.description || s.code,
            amount: s.amount || s.rate || 0,
            currency: s.currency || "USD",
          });
        }

        rates.push({
          carrier: "Maersk",
          origin_port: origin,
          destination_port: destination,
          container_type: mapContainerType(container.containerType || container.equipmentSizeType || "20GP"),
          base_rate: container.baseRate || container.rate || container.amount || 0,
          currency: container.currency || product.currency || "USD",
          surcharges,
          transit_days: product.transitTime || product.transitDays || null,
          valid_from: product.validFrom || new Date().toISOString().split("T")[0],
          valid_until: product.validTo || getDefaultExpiry(),
          rate_basis_type: product.rateType === "CONTRACT" ? "contract" : "spot",
          contract_number: product.contractNumber || null,
          mode: "ocean",
          notes: product.serviceCode ? `Service: ${product.serviceCode}` : null,
        });
      }
    }

    // Maersk Contract Rates API (separate endpoint)
    try {
      const contractRes = await fetch(
        `https://api.maersk.com/commercial/contract-rates?originPort=${encodeURIComponent(origin)}&destinationPort=${encodeURIComponent(destination)}`,
        {
          headers: {
            "Consumer-Key": apiKey,
            Accept: "application/json",
          },
        }
      );

      if (contractRes.ok) {
        const contractData = await contractRes.json();
        const contracts = Array.isArray(contractData) ? contractData : contractData?.rates || [];

        for (const rate of contracts) {
          rates.push({
            carrier: "Maersk",
            origin_port: origin,
            destination_port: destination,
            container_type: mapContainerType(rate.equipmentType || "20GP"),
            base_rate: rate.rate || rate.amount || 0,
            currency: rate.currency || "USD",
            surcharges: (rate.surcharges || []).map((s: any) => ({
              code: s.code,
              name: s.description || s.code,
              amount: s.amount || 0,
              currency: s.currency || "USD",
            })),
            transit_days: rate.transitDays || null,
            valid_from: rate.validFrom || new Date().toISOString().split("T")[0],
            valid_until: rate.validTo || getDefaultExpiry(),
            rate_basis_type: "contract",
            contract_number: rate.contractNumber || rate.agreementNumber || null,
            mode: "ocean",
            notes: `Contract: ${rate.contractNumber || "N/A"}`,
          });
        }
      }
    } catch (err) {
      console.log("Maersk contract rates not available:", err);
    }

    console.log(`📊 Maersk: ${rates.length} rates for ${origin} → ${destination}`);
    return rates;
  } catch (err) {
    console.error("Maersk rates error:", err);
    return [];
  }
}

// ─── CMA CGM Rates API ──────────────────────────────────────────────────────

async function fetchCmaCgmRates(origin: string, destination: string): Promise<CarrierRate[]> {
  const apiKey = Deno.env.get("CMA_CGM_API_KEY");
  if (!apiKey) {
    console.log("⚠️ CMA_CGM_API_KEY not configured, skipping CMA CGM rates");
    return [];
  }

  try {
    const res = await fetch(
      `https://apis.cma-cgm.net/pricing/v1/quotes?originPort=${encodeURIComponent(origin)}&destinationPort=${encodeURIComponent(destination)}`,
      {
        headers: {
          KeyId: apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      console.error(`CMA CGM Rates API error [${res.status}]: ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    const quotes = Array.isArray(data) ? data : data?.quotes || data?.rates || [];
    const rates: CarrierRate[] = [];

    for (const quote of quotes) {
      const containers = quote.containerDetails || quote.equipments || [quote];
      for (const container of containers) {
        rates.push({
          carrier: "CMA CGM",
          origin_port: origin,
          destination_port: destination,
          container_type: mapContainerType(container.equipmentType || container.containerType || "20GP"),
          base_rate: container.freightRate || container.baseRate || container.amount || 0,
          currency: container.currency || quote.currency || "USD",
          surcharges: (container.surcharges || quote.surcharges || []).map((s: any) => ({
            code: s.chargeCode || s.code,
            name: s.chargeName || s.description || s.code,
            amount: s.amount || 0,
            currency: s.currency || "USD",
          })),
          transit_days: quote.transitTime || null,
          valid_from: quote.validityFrom || new Date().toISOString().split("T")[0],
          valid_until: quote.validityTo || getDefaultExpiry(),
          rate_basis_type: quote.rateType === "CONTRACT" ? "contract" : "spot",
          contract_number: quote.contractReference || null,
          mode: "ocean",
          notes: quote.serviceLoopCode ? `Service: ${quote.serviceLoopCode}` : null,
        });
      }
    }

    console.log(`📊 CMA CGM: ${rates.length} rates for ${origin} → ${destination}`);
    return rates;
  } catch (err) {
    console.error("CMA CGM rates error:", err);
    return [];
  }
}

// ─── Hapag-Lloyd Rates API ───────────────────────────────────────────────────

async function fetchHapagLloydRates(origin: string, destination: string): Promise<CarrierRate[]> {
  const apiKey = Deno.env.get("HAPAG_LLOYD_API_KEY");
  if (!apiKey) {
    console.log("⚠️ HAPAG_LLOYD_API_KEY not configured, skipping Hapag-Lloyd rates");
    return [];
  }

  try {
    const res = await fetch(
      `https://api.hlag.com/hlag/v1/rates/spot?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
      {
        headers: {
          "X-IBM-Client-Id": apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      console.error(`Hapag-Lloyd Rates API error [${res.status}]: ${await res.text()}`);
      return [];
    }

    const data = await res.json();
    const rateItems = Array.isArray(data) ? data : data?.rates || data?.spotRates || [];
    const rates: CarrierRate[] = [];

    for (const item of rateItems) {
      rates.push({
        carrier: "Hapag-Lloyd",
        origin_port: origin,
        destination_port: destination,
        container_type: mapContainerType(item.equipmentType || "20GP"),
        base_rate: item.totalRate || item.baseRate || item.amount || 0,
        currency: item.currency || "USD",
        surcharges: (item.surcharges || []).map((s: any) => ({
          code: s.code,
          name: s.description || s.code,
          amount: s.amount || 0,
          currency: s.currency || "USD",
        })),
        transit_days: item.transitTime || null,
        valid_from: item.validFrom || new Date().toISOString().split("T")[0],
        valid_until: item.validTo || getDefaultExpiry(),
        rate_basis_type: item.rateType === "CONTRACT" ? "contract" : "spot",
        contract_number: item.contractNumber || null,
        mode: "ocean",
        notes: null,
      });
    }

    console.log(`📊 Hapag-Lloyd: ${rates.length} rates for ${origin} → ${destination}`);
    return rates;
  } catch (err) {
    console.error("Hapag-Lloyd rates error:", err);
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapContainerType(raw: string): string {
  const normalized = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const map: Record<string, string> = {
    "20GP": "20GP", "20DV": "20GP", "20ST": "20GP", "22G1": "20GP",
    "40GP": "40GP", "40DV": "40GP", "40ST": "40GP", "42G1": "40GP",
    "40HC": "40HC", "40HQ": "40HC", "45G1": "40HC",
    "20RF": "20RF", "22R1": "20RF",
    "40RF": "40RF", "42R1": "40RF",
    "40HCRF": "40HCRF", "45R1": "40HCRF",
    "20OT": "20OT", "22U1": "20OT",
    "40OT": "40OT", "42U1": "40OT",
    "20FR": "20FR", "22P1": "20FR",
    "40FR": "40FR", "42P1": "40FR",
  };
  return map[normalized] || raw;
}

function getDefaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { origin, destination, sync_mode } = body;

    if (sync_mode === "all_lanes") {
      // Fetch all unique lanes from existing shipments
      const { data: lanes, error } = await supabase
        .from("shipments")
        .select("origin_port, destination_port")
        .not("origin_port", "is", null)
        .not("destination_port", "is", null)
        .eq("mode", "ocean")
        .limit(50);

      if (error) throw error;

      // Deduplicate lanes
      const uniqueLanes = new Map<string, { origin: string; destination: string }>();
      for (const lane of lanes || []) {
        const key = `${lane.origin_port}|${lane.destination_port}`;
        if (!uniqueLanes.has(key)) {
          uniqueLanes.set(key, { origin: lane.origin_port, destination: lane.destination_port });
        }
      }

      let totalRates = 0;
      const results = [];

      for (const [key, lane] of uniqueLanes) {
        const rates = await fetchAllCarrierRates(lane.origin, lane.destination);
        if (rates.length > 0) {
          const upserted = await upsertRates(supabase, rates);
          totalRates += upserted;
        }
        results.push({ lane: key, rates_found: rates.length });
      }

      return new Response(
        JSON.stringify({ success: true, lanes_processed: uniqueLanes.size, total_rates: totalRates, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Single lane sync
    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ error: "origin and destination required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rates = await fetchAllCarrierRates(origin, destination);
    const upserted = await upsertRates(supabase, rates);

    return new Response(
      JSON.stringify({
        success: true,
        origin,
        destination,
        rates_found: rates.length,
        rates_upserted: upserted,
        carriers: [...new Set(rates.map((r) => r.carrier))],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("sync-carrier-rates error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchAllCarrierRates(origin: string, destination: string): Promise<CarrierRate[]> {
  // Fetch from all carriers in parallel
  const [maerskRates, cmaCgmRates, hapagRates] = await Promise.all([
    fetchMaerskRates(origin, destination),
    fetchCmaCgmRates(origin, destination),
    fetchHapagLloydRates(origin, destination),
  ]);

  return [...maerskRates, ...cmaCgmRates, ...hapagRates];
}

async function upsertRates(supabase: any, rates: CarrierRate[]): Promise<number> {
  if (rates.length === 0) return 0;

  let upserted = 0;

  for (const rate of rates) {
    // Check for existing rate with same carrier, route, container type, and rate basis
    const { data: existing } = await supabase
      .from("carrier_rates")
      .select("id")
      .eq("carrier", rate.carrier)
      .eq("origin_port", rate.origin_port)
      .eq("destination_port", rate.destination_port)
      .eq("container_type", rate.container_type)
      .eq("rate_basis_type", rate.rate_basis_type)
      .eq("mode", rate.mode)
      .gte("valid_until", new Date().toISOString().split("T")[0])
      .maybeSingle();

    if (existing) {
      // Update existing rate
      const { error } = await supabase
        .from("carrier_rates")
        .update({
          base_rate: rate.base_rate,
          currency: rate.currency,
          surcharges: rate.surcharges,
          transit_days: rate.transit_days,
          valid_from: rate.valid_from,
          valid_until: rate.valid_until,
          contract_number: rate.contract_number,
          notes: rate.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (!error) upserted++;
    } else {
      // Insert new rate
      const { error } = await supabase.from("carrier_rates").insert({
        carrier: rate.carrier,
        origin_port: rate.origin_port,
        destination_port: rate.destination_port,
        container_type: rate.container_type,
        base_rate: rate.base_rate,
        currency: rate.currency,
        surcharges: rate.surcharges,
        transit_days: rate.transit_days,
        valid_from: rate.valid_from,
        valid_until: rate.valid_until,
        rate_basis_type: rate.rate_basis_type,
        contract_number: rate.contract_number,
        mode: rate.mode,
        notes: rate.notes,
      });

      if (!error) upserted++;
    }
  }

  return upserted;
}
