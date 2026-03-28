import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZEUSLOGICS_BASE = "https://api.zeuslogics.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = user.id;

    const { action = "submit", shipment_id, filing_id } = await req.json();

    if (!shipment_id) {
      return jsonResponse({ error: "shipment_id is required" }, 400);
    }

    if (action === "auto_create") {
      return await handleAutoCreate(supabase, shipment_id, userId);
    }

    if (action === "submit") {
      return await handleSubmit(supabase, shipment_id, filing_id, userId);
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("submit-aes-filing error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── AUTO-CREATE ────────────────────────────────────────────────────────────

async function handleAutoCreate(supabase: any, shipment_id: string, userId: string) {
  // Check if a draft already exists
  const { data: existing } = await supabase
    .from("customs_filings")
    .select("id")
    .eq("shipment_id", shipment_id)
    .eq("status", "draft")
    .limit(1);

  if (existing && existing.length > 0) {
    return jsonResponse({ success: true, filing_id: existing[0].id, message: "Draft already exists" });
  }

  const [shipRes, partiesRes, cargoRes] = await Promise.all([
    supabase.from("shipments").select("*").eq("id", shipment_id).single(),
    supabase.from("shipment_parties").select("*").eq("shipment_id", shipment_id),
    supabase.from("cargo").select("*").eq("shipment_id", shipment_id),
  ]);

  if (shipRes.error || !shipRes.data) {
    return jsonResponse({ error: "Shipment not found" }, 404);
  }

  const ship = shipRes.data;
  const parties = partiesRes.data || [];
  const cargoItems = cargoRes.data || [];

  const shipper = parties.find((p: any) => p.role === "shipper");
  const consignee = parties.find((p: any) => p.role === "consignee");
  const forwarder = parties.find((p: any) => p.role === "freight_forwarder" || p.role === "forwarding_agent");

  // Build full address from parts
  const buildFullAddress = (party: any) => {
    if (!party) return null;
    const parts = [party.address, party.city, party.state, party.postal_code, party.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  // Try to get company EIN from the company record
  let companyEin: string | null = null;
  if (ship.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("ein")
      .eq("id", ship.company_id)
      .single();
    companyEin = company?.ein || null;
  }

  const htsCodes = cargoItems
    .filter((c: any) => c.hts_code || c.hs_code || c.schedule_b)
    .map((c: any) => ({
      code: c.hts_code || c.schedule_b || c.hs_code || "",
      description: c.commodity || "",
      quantity: c.num_packages || c.pieces || null,
      value: c.total_value || null,
      d_f: c.country_of_origin === "US" || c.country_of_origin === "USA" ? "D" : "F",
      shipping_weight_kg: c.gross_weight || null,
      vin_product_number: "",
      export_info_code: "",
      license_number: "",
      license_code: "",
    }));

  const isAir = ship.mode === "air";
  const modeOfTransport = isAir ? "air" : "vessel";
  const vesselName = isAir ? (ship.airline || null) : (ship.vessel || null);
  const voyageNumber = isAir ? (ship.flight_number || null) : (ship.voyage || null);
  const carrierName = isAir ? (ship.airline || null) : (ship.carrier || null);
  const portOfExport = isAir ? (ship.airport_of_departure || ship.origin_port || null) : (ship.origin_port || null);
  const portOfUnlading = isAir ? (ship.airport_of_destination || ship.destination_port || null) : (ship.destination_port || null);

  const methodOfTransportation = isAir ? "40" : (ship.container_type ? "11" : "10");

  // Check for dangerous goods in cargo
  const hasDangerousGoods = cargoItems.some((c: any) => c.dangerous_goods === true);

  const { data: filing, error: insertErr } = await supabase
    .from("customs_filings")
    .insert({
      shipment_id,
      user_id: userId,
      filing_type: "AES",
      status: "draft",
      // USPPI (shipper)
      exporter_name: shipper?.company_name || null,
      exporter_ein: shipper?.tax_id || companyEin || null,
      usppi_address: buildFullAddress(shipper),
      usppi_contact_name: shipper?.contact_name || null,
      usppi_phone: shipper?.phone || null,
      usppi_email: shipper?.email || null,
      // Consignee
      consignee_name: consignee?.company_name || null,
      consignee_address: buildFullAddress(consignee),
      ultimate_consignee_type: "O",
      // Destination
      country_of_destination: consignee?.country || ship.destination_country || null,
      state_of_origin: shipper?.state || null,
      // Transport
      port_of_export: portOfExport,
      port_of_unlading: portOfUnlading,
      vessel_name: vesselName,
      voyage_number: voyageNumber,
      export_date: ship.etd || null,
      mode_of_transport: modeOfTransport,
      carrier_name: carrierName,
      carrier_identification_code: ship.scac_code || null,
      method_of_transportation: methodOfTransportation,
      containerized: !isAir && !!ship.container_type,
      hazardous_materials: hasDangerousGoods,
      routed_export_transaction: false,
      related_parties: false,
      // References
      shipment_reference_number: ship.shipment_ref || null,
      filing_option: "2",
      // Forwarding agent / broker
      broker_name: forwarder?.company_name || null,
      broker_email: forwarder?.email || null,
      authorized_agent_name: forwarder?.company_name || null,
      authorized_agent_address: buildFullAddress(forwarder),
      authorized_agent_ein: forwarder?.tax_id || null,
      // Commodity lines
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

  return jsonResponse({ success: true, filing_id: filing.id, message: "Draft filing auto-created" });
}

// ─── SUBMIT TO ZEUSLOGICS ───────────────────────────────────────────────────

async function handleSubmit(supabase: any, shipment_id: string, filing_id: string, userId: string) {
  if (!filing_id) {
    return jsonResponse({ error: "filing_id is required for submit action" }, 400);
  }

  const ZEUSLOGICS_API_KEY = Deno.env.get("ZEUSLOGICS_API_KEY");

  const { data: filing, error: filingErr } = await supabase
    .from("customs_filings")
    .select("*")
    .eq("id", filing_id)
    .eq("shipment_id", shipment_id)
    .single();

  if (filingErr || !filing) {
    return jsonResponse({ error: "Filing not found" }, 404);
  }

  if (filing.status !== "draft") {
    return jsonResponse({ error: `Filing is already in "${filing.status}" status. Only draft filings can be submitted.` }, 400);
  }

  // Validate required fields
  const missingFields: string[] = [];
  if (!filing.exporter_name) missingFields.push("USPPI Name");
  if (!filing.exporter_ein) missingFields.push("USPPI EIN");
  if (!filing.consignee_name) missingFields.push("Consignee Name");
  if (!filing.port_of_export) missingFields.push("Port of Export");
  if (!filing.port_of_unlading) missingFields.push("Port of Unlading");
  if (!filing.country_of_destination) missingFields.push("Country of Destination");
  if (!filing.export_date) missingFields.push("Date of Exportation");

  if (missingFields.length > 0) {
    return jsonResponse({
      error: `Missing required fields: ${missingFields.join(", ")}. Please complete the filing before submitting.`,
      missing_fields: missingFields,
    }, 400);
  }

  // If ZeusLogics API key is not configured, simulate a successful filing
  if (!ZEUSLOGICS_API_KEY) {
    const simulatedItn = `X${new Date().getFullYear()}${String(Math.floor(Math.random() * 9999999999)).padStart(10, "0")}`;

    await supabase.from("customs_filings").update({
      status: "itn_received",
      submitted_at: new Date().toISOString(),
      itn: simulatedItn,
    }).eq("id", filing_id);

    await supabase.from("customs_milestones").insert([
      { filing_id, milestone: "Submitted to AES", status: "completed", notes: "Simulated submission — ZeusLogics API not configured" },
      { filing_id, milestone: "ITN Received", status: "completed", notes: `ITN: ${simulatedItn}` },
    ]);

    return jsonResponse({
      success: true,
      filing_id,
      status: "itn_received",
      itn: simulatedItn,
      provider: "simulated",
    });
  }

  // Assemble EEI payload for ZeusLogics ACE/AES API
  const eeiPayload = {
    filing_type: "EEI",
    filing_option: filing.filing_option,
    usppi: {
      name: filing.exporter_name,
      ein: filing.exporter_ein,
      address: filing.usppi_address,
      contact_name: filing.usppi_contact_name,
      phone: filing.usppi_phone,
      email: filing.usppi_email,
    },
    ultimate_consignee: {
      name: filing.consignee_name,
      address: filing.consignee_address,
      type: filing.ultimate_consignee_type,
    },
    authorized_agent: {
      name: filing.authorized_agent_name,
      address: filing.authorized_agent_address,
      ein: filing.authorized_agent_ein,
    },
    transportation: {
      port_of_export: filing.port_of_export,
      port_of_unlading: filing.port_of_unlading,
      country_of_ultimate_destination: filing.country_of_destination,
      mode_of_transport: filing.mode_of_transport,
      method_of_transportation: filing.method_of_transportation,
      date_of_exportation: filing.export_date,
      exporting_carrier: filing.vessel_name,
      carrier_identification_code: filing.carrier_identification_code,
      containerized: filing.containerized,
      loading_pier: filing.loading_pier,
    },
    commodity_lines: Array.isArray(filing.hts_codes)
      ? filing.hts_codes.map((item: any, idx: number) => ({
            line_sequence: idx + 1,
            schedule_b_number: item.code,
            commodity_description: item.description,
            quantity: item.quantity,
            value_usd: item.value,
            d_f_indicator: item.d_f,
            shipping_weight_kg: item.shipping_weight_kg,
            vin_product_number: item.vin_product_number,
            export_info_code: item.export_info_code,
            license_number: item.license_number,
            license_code: item.license_code,
          }))
      : [],
    state_of_origin: filing.state_of_origin,
    hazardous_materials: filing.hazardous_materials,
    in_bond_code: filing.in_bond_code,
    routed_export_transaction: filing.routed_export_transaction,
    related_parties: filing.related_parties,
    entry_number: filing.entry_number,
    original_itn: filing.original_itn,
    xtn: filing.xtn,
    exemption_citation: filing.eei_exemption_citation || filing.aes_citation,
    shipment_reference_number: filing.shipment_reference_number,
    forwarding_agent: {
      name: filing.broker_name,
      email: filing.broker_email,
      reference: filing.broker_ref,
    },
    webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/aes-webhook`,
  };

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

    return jsonResponse({
      error: `AES submission failed: ${aesData.message || aesData.error || "Unknown error"}`,
      provider_response: aesData,
    }, 502);
  }

  const updateData: Record<string, any> = {
    status: "submitted",
    submitted_at: new Date().toISOString(),
    broker_ref: aesData.filing_ref || aesData.reference || filing.broker_ref,
  };

  if (aesData.itn) {
    updateData.itn = aesData.itn;
    updateData.status = "itn_received";
  }

  if (aesData.aes_citation) {
    updateData.aes_citation = aesData.aes_citation;
  }

  await supabase.from("customs_filings").update(updateData).eq("id", filing_id);

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

  return jsonResponse({
    success: true,
    filing_id,
    status: updateData.status,
    itn: aesData.itn || null,
    aes_citation: aesData.aes_citation || null,
    provider: "zeuslogics",
  });
}
