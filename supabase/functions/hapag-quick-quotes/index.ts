// HLAG Quick Quotes — POST /prices and POST /quotations
// With simulation fallback while HLAG credentials/permissions are being approved.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HLAG_BASE_URL = "https://api.hlag.com/hlag/external/v2/quotation-booking-engine/external";

interface PriceRequest {
  action: "prices";
  placeOfReceipt: string;
  placeOfDelivery: string;
  isoEquipmentCode?: string; // e.g. "22GP" / "42GP"
  units?: number;
  weightPerUnitKg?: number;
  earliestDepartureDate?: string; // YYYY-MM-DD
  customerIdentifier?: string;
}

interface QuotationRequest {
  action: "quotation";
  offerId: string;
  customerIdentifier: string;
  receivingEmail?: string;
  shipmentId?: string;
  hlagQuotationId?: string; // existing row to update
}

type Body = PriceRequest | QuotationRequest;

function simulatedPrices(req: PriceRequest) {
  const base = req.isoEquipmentCode === "42GP" ? 2950 : 1850;
  const units = req.units ?? 1;
  const today = new Date();
  const validUntil = new Date(today.getTime() + 7 * 86400000);

  return {
    offers: Array.from({ length: 3 }).map((_, i) => ({
      offerId: `sim-${crypto.randomUUID()}`,
      totalPrice: (base + i * 120) * units,
      currency: "USD",
      transitDays: 24 + i * 3,
      validUntil: validUntil.toISOString(),
      productIdentifier: i === 0 ? "QUICK_QUOTES_SPOT" : "QUICK_QUOTES",
      placeOfReceipt: req.placeOfReceipt,
      placeOfDelivery: req.placeOfDelivery,
      isoEquipmentCode: req.isoEquipmentCode ?? "22GP",
      label: i === 0 ? "Lowest Spot" : i === 1 ? "Best Value" : "Flexible",
    })),
    simulated: true,
  };
}

async function hlagFetch(path: string, body: any) {
  const clientId = Deno.env.get("HLAG_CLIENT_ID");
  const clientSecret = Deno.env.get("HLAG_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { ok: false, status: 401, body: "missing creds" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${HLAG_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "X-IBM-Client-Id": clientId,
        "X-IBM-Client-Secret": clientSecret,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let text = "";
    try { text = await res.text(); } catch { /* ignore */ }
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }
    return { ok: res.ok, status: res.status, body: json ?? text };
  } catch (e: any) {
    console.warn("hlagFetch error:", e?.name, e?.message);
    return { ok: false, status: 0, body: e?.message ?? "network error" };
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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = token ? await supabase.auth.getUser(token) : { data: { user: null } } as any;
    const userId = userData?.user?.id;
    const userEmail = userData?.user?.email;

    const body = (await req.json()) as Body;

    if (body.action === "prices") {
      const hlagBody = {
        placeOfReceipt: body.placeOfReceipt,
        placeOfDelivery: body.placeOfDelivery,
        requestedEquipment: {
          units: body.units ?? 1,
          isoEquipmentCode: body.isoEquipmentCode ?? "22GP",
          weightPerUnit: { value: body.weightPerUnitKg ?? 10000, unit: "KGM" },
        },
        commodity: { commodityTypeGroup: "FAK" },
        receiptTypeAtOrigin: "CY",
        deliveryTypeAtDestination: "CY",
        earliestDepartureDate:
          body.earliestDepartureDate ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        productIdentifiers: ["QUICK_QUOTES", "QUICK_QUOTES_SPOT"],
        customerIdentifier: body.customerIdentifier ?? userEmail ?? "platform@alllogisticscargo.com",
      };

      const upstream = await hlagFetch("/prices", hlagBody);
      if (!upstream.ok) {
        console.warn(`HLAG /prices ${upstream.status} → simulating`, upstream.body);
        return new Response(
          JSON.stringify({ ...simulatedPrices(body), upstreamStatus: upstream.status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Map HLAG response → normalized offer list
      const raw = upstream.body as any;
      const offers = (raw?.offers ?? raw?.priceQuotes ?? []).map((o: any) => ({
        offerId: o.offerId ?? o.id,
        totalPrice: Number(o.totalPrice?.value ?? o.totalPrice ?? 0),
        currency: o.totalPrice?.currency ?? o.currency ?? "USD",
        transitDays: o.transitTime ?? o.transitDays ?? null,
        validUntil: o.offerValidUntil ?? o.validUntil ?? null,
        productIdentifier: o.productIdentifier ?? "QUICK_QUOTES",
        placeOfReceipt: body.placeOfReceipt,
        placeOfDelivery: body.placeOfDelivery,
        isoEquipmentCode: body.isoEquipmentCode ?? "22GP",
        label: o.label ?? null,
      }));

      return new Response(JSON.stringify({ offers, simulated: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "quotation") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerEmail = body.customerIdentifier ?? userEmail ?? "platform@alllogisticscargo.com";
      const isSimulatedOffer = body.offerId.startsWith("sim-");

      let upstream: any = null;
      let quotationReference: string | null = null;
      let simulated = isSimulatedOffer;

      if (!isSimulatedOffer) {
        upstream = await hlagFetch("/quotations", {
          offerId: body.offerId,
          customerIdentifier: customerEmail,
          receivingEmail: body.receivingEmail ?? customerEmail,
        });
        if (!upstream.ok) {
          console.warn(`HLAG /quotations ${upstream.status} → simulating`, upstream.body);
          simulated = true;
        } else {
          quotationReference =
            upstream.body?.quotationReference ?? upstream.body?.reference ?? null;
        }
      }
      if (simulated) {
        quotationReference = `SIM-Q-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      }

      // Persist
      const updatePayload = {
        quotation_reference: quotationReference,
        status: "locked",
        is_simulated: simulated,
        raw_quotation_response: upstream?.body ?? { simulated: true },
        shipment_id: body.shipmentId ?? null,
      };

      if (body.hlagQuotationId) {
        await supabase.from("hlag_quotations").update(updatePayload).eq("id", body.hlagQuotationId);
      } else {
        await supabase.from("hlag_quotations").insert({
          user_id: userId,
          customer_identifier: customerEmail,
          place_of_receipt: "—",
          place_of_delivery: "—",
          offer_id: body.offerId,
          ...updatePayload,
        });
      }

      return new Response(
        JSON.stringify({ quotationReference, simulated, upstreamStatus: upstream?.status ?? null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("hapag-quick-quotes error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
