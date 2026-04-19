// HLAG Commercial Schedules v1 — point-to-point routes + vessel schedules
// GET-style queries proxied via POST body for simplicity in edge invoke.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://api.hlag.com/hlag/external/v1";

interface RoutesQuery {
  action: "routes";
  placeOfReceipt: string;
  placeOfDelivery: string;
  departureStartDate?: string;
  departureEndDate?: string;
  arrivalStartDate?: string;
  arrivalEndDate?: string;
  maxTranshipment?: number;
  receiptTypeAtOrigin?: string;
  deliveryTypeAtDestination?: string;
  limit?: number;
  cursor?: string;
}

interface VesselsQuery {
  action: "vessels";
  vesselIMONumber?: string;
  vesselName?: string;
  carrierServiceCode?: string;
  universalServiceReference?: string;
  carrierVoyageNumber?: string;
  universalVoyageReference?: string;
  UNLocationCode?: string;
  facilitySMDGCode?: string;
  vesselOperatorCarrierCode?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}

type Body = RoutesQuery | VesselsQuery;

function buildQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || k === "action") continue;
    sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function hlagGet(path: string) {
  const clientId = Deno.env.get("HLAG_CLIENT_ID");
  const clientSecret = Deno.env.get("HLAG_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return { ok: false, status: 401, body: "missing creds", headers: {} as Record<string, string> };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "GET",
      headers: {
        "X-IBM-Client-Id": clientId,
        "X-IBM-Client-Secret": clientSecret,
        Accept: "application/json",
        "API-Version": "1",
      },
      signal: ctrl.signal,
    });
    let text = "";
    try { text = await res.clone().text(); } catch { /* ignore */ }
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* keep text */ }
    return {
      ok: res.ok,
      status: res.status,
      body: (json ?? text) as any,
      headers: {
        nextCursor: res.headers.get("next-page-cursor") ?? null,
        apiVersion: res.headers.get("api-version") ?? null,
      } as any,
    };
  } catch (e) {
    const err = e as Error;
    return { ok: false, status: 0, body: err.message, headers: {} as any };
  } finally {
    clearTimeout(timer);
  }
}

function simulatedRoutes(q: RoutesQuery) {
  const today = new Date();
  return {
    routes: Array.from({ length: 3 }).map((_, i) => ({
      placeOfReceipt: q.placeOfReceipt,
      placeOfDelivery: q.placeOfDelivery,
      departureDate: new Date(today.getTime() + (7 + i * 4) * 86400000).toISOString().slice(0, 10),
      arrivalDate: new Date(today.getTime() + (7 + i * 4 + 24 + i * 3) * 86400000).toISOString().slice(0, 10),
      transitTime: 24 + i * 3,
      transhipments: i,
      vesselName: i === 0 ? "MILAN EXPRESS" : i === 1 ? "BERLIN EXPRESS" : "PRAGUE EXPRESS",
      voyageNumber: `${100 + i}E`,
      carrierServiceCode: "FE1",
    })),
    simulated: true,
  };
}

function simulatedVessels(q: VesselsQuery) {
  return {
    vessels: Array.from({ length: 2 }).map((_, i) => ({
      vesselName: q.vesselName ?? (i === 0 ? "MILAN EXPRESS" : "BERLIN EXPRESS"),
      vesselIMONumber: q.vesselIMONumber ?? `94000${10 + i}`,
      carrierServiceCode: q.carrierServiceCode ?? "FE1",
      universalServiceReference: "SR12345A",
      ports: ["DEHAM", "NLRTM", "SGSIN"].map((p, j) => ({
        UNLocationCode: p,
        eta: new Date(Date.now() + (j * 7) * 86400000).toISOString(),
        etd: new Date(Date.now() + (j * 7 + 1) * 86400000).toISOString(),
      })),
    })),
    simulated: true,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;

    if (body.action === "routes") {
      if (!body.placeOfReceipt || !body.placeOfDelivery) {
        return new Response(
          JSON.stringify({ error: "placeOfReceipt and placeOfDelivery are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const upstream = await hlagGet(`/point-to-point-routes${buildQuery(body)}`);
      if (!upstream.ok) {
        console.warn(`HLAG routes ${upstream.status} → simulating`, upstream.body);
        return new Response(
          JSON.stringify({ ...simulatedRoutes(body), upstreamStatus: upstream.status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ data: upstream.body, ...upstream.headers, simulated: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "vessels") {
      const hasFilter =
        body.vesselIMONumber || body.vesselName || body.carrierServiceCode ||
        body.universalServiceReference || body.carrierVoyageNumber ||
        body.universalVoyageReference || body.UNLocationCode ||
        body.facilitySMDGCode || body.vesselOperatorCarrierCode || body.cursor;
      if (!hasFilter) {
        return new Response(
          JSON.stringify({ error: "At least one vessel filter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const upstream = await hlagGet(`/vessel-schedules${buildQuery(body)}`);
      if (!upstream.ok) {
        console.warn(`HLAG vessels ${upstream.status} → simulating`, upstream.body);
        return new Response(
          JSON.stringify({ ...simulatedVessels(body), upstreamStatus: upstream.status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ data: upstream.body, ...upstream.headers, simulated: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const err = e as Error;
    console.error("hapag-schedules-v1 error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
