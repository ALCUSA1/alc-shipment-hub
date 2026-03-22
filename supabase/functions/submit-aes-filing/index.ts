import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * submit-aes-filing Edge Function
 *
 * Assembles an EEI/AES payload from customs_filings + shipments + cargo data,
 * submits it to ZeusLogics ACE/AES API, and updates the filing record.
 *
 * Supports:
 * - "submit": Submit a draft filing to AES via ZeusLogics
 * - "auto_create": Auto-create a draft filing from shipment data
 */

const ZEUSLOGICS_BASE = "https://api.zeuslogics.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { action = "submit", shipment_id, filing_id } = await req.json();

    if (!shipment_id) {
      return new Response(JSON.stringify({ error: "shipment_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "auto_create") {
      return await handleAutoCreate(supabase, shipment_id, userId);
    }

    if (action === "submit") {
      return await handleSubmit(supabase, shipment_id, filing_id, userId);
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("submit-aes-filing error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── AUTO-CREATE ────────────────────────────────────────────────────────────

async function handleAutoCreate(supabase: any, shipment_id: string, userId: string) {
  const [shipRes, partiesRes, cargoRes] = await Promise.all([
    supabase.from("shipments").select("*").eq("id", shipment_id).single(),
    supabase.from("shipment_parties").select("*").eq("shipment_id", shipment_id),
    supabase.from("cargo").select("*").eq("shipment_id", shipment_id),
  ]);

  if (shipRes.error || !shipRes.data) {
    return new Response(JSON.stringify({ error: "Shipment not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ship = shipRes.data;
  const parties = partiesRes.data || [];
  const cargoItems = cargoRes.data || [];

  const shipper = parties.find((p: any) => p.role === "shipper");
  const consignee = parties.find((p: any) => p.role === "consignee");

  const htsCodes = cargoItems
    .filter((c: any) => c.hts_code || c.hs_code || c.schedule_b)
    .map((c: any) => ({
      code: c.hts_code || c.schedule_b || c.hs_code || "",
      description: c.commodity || "",
      quantity: c.num_packages || null,
      value: c.total_value || null,
    }));

  // Check if a draft already exists
  const { data: existing } = await supabase
    .from("customs_filings")
    .select("id")
    .eq("shipment_id", shipment_id)
    .eq("status", "draft")
    .limit(1);

  if (existing && existing.length > 0) {
    return new Response(JSON.stringify({ success: true, filing_id: existing[0].id, message: "Draft already exists" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isAir = ship.mode === "air";
  const modeOfTransport = isAir ? "air" : "vessel";
  const vesselName = isAir ? (ship.airline || null) : (ship.vessel || null);
  const voyageNumber = isAir ? (ship.flight_number || null) : (ship.voyage || null);
  const carrierName = isAir ? (ship.airline || null) : null;
  const portOfExport = isAir ? (ship.airport_of_departure || ship.origin_port || null) : (ship.origin_port || null);
  const portOfUnlading = isAir ? (ship.airport_of_destination || ship.destination_port || null) : (ship.destination_port || null);

  const { data: filing, error: insertErr } = await supabase
    .from("customs_filings")
    .insert({
      shipment_id,
      user_id: userId,
      filing_type: "AES",
      status: "draft",
      exporter_name: shipper?.name || null,
      exporter_ein: null,
      consignee_name: consignee?.name || null,
      consignee_address: consignee?.address || null,
      country_of_destination: ship.destination_country || null,
      port_of_export: portOfExport,
      port_of_unlading: portOfUnlading,
      vessel_name: vesselName,
      voyage_number: voyageNumber,
      export_date: ship.etd || null,
      mode_of_transport: modeOfTransport,
      carrier_name: carrierName,
      hts_codes: htsCodes.length > 0 ? htsCodes : null,
    })
    .select("id")
    .single();

  if (insertErr) throw insertErr;

  await supabase.from("customs_milestones").insert({
    filing_id: filing.id,
    milestone: "Draft Created",
    status: "completed",
    notes: "Auto-created from shipment booking data",
  });

  return new Response(JSON.stringify({ success: true, filing_id: filing.id, message: "Draft filing auto-created" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── SUBMIT TO ZEUSLOGICS ───────────────────────────────────────────────────

async function handleSubmit(supabase: any, shipment_id: string, filing_id: string, userId: string) {
  if (!filing_id) {
    return new Response(JSON.stringify({ error: "filing_id is required for submit action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ZEUSLOGICS_API_KEY = Deno.env.get("ZEUSLOGICS_API_KEY");
  if (!ZEUSLOGICS_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ZeusLogics API key not configured. Please contact your administrator to set up the AES filing integration." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch the filing
  const { data: filing, error: filingErr } = await supabase
    .from("customs_filings")
    .select("*")
    .eq("id", filing_id)
    .eq("shipment_id", shipment_id)
    .single();

  if (filingErr || !filing) {
    return new Response(JSON.stringify({ error: "Filing not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (filing.status !== "draft") {
    return new Response(JSON.stringify({ error: `Filing is already in "${filing.status}" status. Only draft filings can be submitted.` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate required fields
  const missingFields: string[] = [];
  if (!filing.exporter_name) missingFields.push("Exporter Name");
  if (!filing.exporter_ein) missingFields.push("Exporter EIN");
  if (!filing.consignee_name) missingFields.push("Consignee Name");
  if (!filing.port_of_export) missingFields.push("Port of Export");
  if (!filing.port_of_unlading) missingFields.push("Port of Unlading");

  if (missingFields.length > 0) {
    return new Response(JSON.stringify({
      error: `Missing required fields: ${missingFields.join(", ")}. Please complete the filing before submitting.`,
      missing_fields: missingFields,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Assemble EEI payload for ZeusLogics ACE/AES API
  const eeiPayload = {
    filing_type: "EEI",
    usppi: {
      name: filing.exporter_name,
      ein: filing.exporter_ein,
    },
    ultimate_consignee: {
      name: filing.consignee_name,
      address: filing.consignee_address,
    },
    transportation: {
      port_of_export: filing.port_of_export,
      port_of_unlading: filing.port_of_unlading,
      country_of_ultimate_destination: filing.country_of_destination,
      mode_of_transport: filing.mode_of_transport,
      date_of_exportation: filing.export_date,
      exporting_carrier: filing.vessel_name,
      carrier_identification_code: filing.voyage_number,
    },
    commodity_lines: Array.isArray(filing.hts_codes)
      ? filing.hts_codes.map((item: any, idx: number) => ({
          line_sequence: idx + 1,
          schedule_b_number: item.code,
          commodity_description: item.description,
          quantity: item.quantity,
          value_usd: item.value,
        }))
      : [],
    exemption_citation: filing.aes_citation,
    forwarding_agent: {
      name: filing.broker_name,
      email: filing.broker_email,
      reference: filing.broker_ref,
    },
    // ZeusLogics webhook for async responses (ITN, acceptance, rejection)
    webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/aes-webhook`,
  };

  // Submit to ZeusLogics
  const zeusUrl = Deno.env.get("ZEUSLOGICS_API_URL") || ZEUSLOGICS_BASE;

  const aesResponse = await fetch(`${zeusUrl}/aes/filings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ZEUSLOGICS_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(eeiPayload),
  });

  const aesData = await aesResponse.json();

  if (!aesResponse.ok) {
    await supabase.from("customs_milestones").insert({
      filing_id,
      milestone: "Submission Failed",
      status: "error",
      notes: `ZeusLogics error [${aesResponse.status}]: ${JSON.stringify(aesData)}`,
    });

    return new Response(JSON.stringify({
      error: `AES submission failed: ${aesData.message || aesData.error || "Unknown error"}`,
      provider_response: aesData,
    }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update filing with response
  const updateData: Record<string, any> = {
    status: "submitted",
    submitted_at: new Date().toISOString(),
    broker_ref: aesData.filing_ref || aesData.reference || filing.broker_ref,
  };

  // If provider returned an ITN immediately
  if (aesData.itn) {
    updateData.itn = aesData.itn;
    updateData.status = "itn_received";
  }

  if (aesData.aes_citation) {
    updateData.aes_citation = aesData.aes_citation;
  }

  await supabase.from("customs_filings").update(updateData).eq("id", filing_id);

  // Log milestones
  await supabase.from("customs_milestones").insert({
    filing_id,
    milestone: "Submitted to AES",
    status: "completed",
    notes: `Submitted via ZeusLogics — Ref: ${aesData.filing_ref || aesData.reference || "—"}`,
  });

  if (aesData.itn) {
    await supabase.from("customs_milestones").insert({
      filing_id,
      milestone: "ITN Received",
      status: "completed",
      notes: `ITN: ${aesData.itn}`,
    });
  }

  return new Response(JSON.stringify({
    success: true,
    filing_id,
    status: updateData.status,
    itn: aesData.itn || null,
    aes_citation: aesData.aes_citation || null,
    provider: "zeuslogics",
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
