import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * generate-documents Edge Function
 *
 * Assembles shipment data into structured document payloads for:
 * Ocean: Bill of Lading, Commercial Invoice, Packing List, SLI, Certificate of Origin, Dock Receipt
 * Air:   MAWB, HAWB, Commercial Invoice, Packing List, SLI, Known Shipper Declaration
 *
 * Returns HTML-rendered documents ready for client-side print/PDF.
 */

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

    const { shipment_id, doc_types } = await req.json();

    if (!shipment_id) {
      return new Response(JSON.stringify({ error: "shipment_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all shipment data in parallel
    const [shipRes, partiesRes, cargoRes, containersRes, profileRes, filingRes] = await Promise.all([
      supabase.from("shipments").select("*, companies!shipments_company_id_fkey(company_name, address, city, state, zip, country, phone, email, ein)").eq("id", shipment_id).single(),
      supabase.from("shipment_parties").select("*").eq("shipment_id", shipment_id),
      supabase.from("cargo").select("*").eq("shipment_id", shipment_id),
      supabase.from("containers").select("*").eq("shipment_id", shipment_id),
      supabase.from("profiles").select("*").limit(1),
      supabase.from("customs_filings").select("*").eq("shipment_id", shipment_id).order("created_at", { ascending: false }).limit(1),
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
    const containers = containersRes.data || [];
    const profile = profileRes.data?.[0] || {};
    const customsFiling = filingRes.data?.[0] || null;

    const shipper = parties.find((p: any) => p.role === "shipper");
    const consignee = parties.find((p: any) => p.role === "consignee");
    const notifyParty = parties.find((p: any) => p.role === "notify_party");
    const forwarder = { name: profile.company_name || "Freight Forwarder", fullName: profile.full_name };

    const isAir = ship.mode === "air";
    const today = new Date().toISOString().split("T")[0];

    // Build documents based on requested types (or all if none specified)
    const requestedTypes: string[] = doc_types || (isAir
      ? ["hawb", "commercial_invoice", "packing_list", "shipper_letter_of_instruction", "known_shipper_declaration"]
      : ["bill_of_lading", "commercial_invoice", "packing_list", "shipper_letter_of_instruction", "certificate_of_origin", "dock_receipt"]
    );

    const documents: Record<string, any> = {};

    for (const docType of requestedTypes) {
      switch (docType) {
        case "bill_of_lading":
          documents.bill_of_lading = buildBillOfLading(ship, shipper, consignee, notifyParty, cargoItems, containers, forwarder);
          break;
        case "hawb":
          documents.hawb = buildHAWB(ship, shipper, consignee, notifyParty, cargoItems, forwarder);
          break;
        case "mawb":
          documents.mawb = buildMAWB(ship, shipper, consignee, cargoItems, forwarder);
          break;
        case "commercial_invoice":
          documents.commercial_invoice = buildCommercialInvoice(ship, shipper, consignee, cargoItems, today);
          break;
        case "packing_list":
          documents.packing_list = buildPackingList(ship, shipper, consignee, cargoItems, containers, today);
          break;
        case "shipper_letter_of_instruction":
          documents.shipper_letter_of_instruction = buildSLI(ship, shipper, consignee, notifyParty, cargoItems, containers, forwarder, isAir, customsFiling);
          break;
        case "certificate_of_origin":
          documents.certificate_of_origin = buildCertificateOfOrigin(ship, shipper, consignee, cargoItems, today);
          break;
        case "dock_receipt":
          documents.dock_receipt = buildDockReceipt(ship, shipper, consignee, cargoItems, containers, forwarder, today);
          break;
        case "known_shipper_declaration":
          documents.known_shipper_declaration = buildKnownShipperDeclaration(ship, shipper, forwarder, today);
          break;
      }
    }

    return new Response(JSON.stringify({ success: true, shipment_ref: ship.shipment_ref, mode: ship.mode || "ocean", documents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-documents error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Document Builders ──

function partyBlock(p: any) {
  if (!p) return { name: "—", address: "—", contact: "—", email: "—", phone: "—" };
  return {
    name: p.company_name || p.name || "—",
    address: p.address || "—",
    contact: p.contact_name || "—",
    email: p.email || "—",
    phone: p.phone || "—",
  };
}

function buildBillOfLading(ship: any, shipper: any, consignee: any, notifyParty: any, cargo: any[], containers: any[], forwarder: any) {
  const totalGrossWeight = cargo.reduce((s, c) => s + (c.gross_weight || 0), 0);
  const totalVolume = cargo.reduce((s, c) => s + (c.volume || 0), 0);
  const totalPackages = cargo.reduce((s, c) => s + (c.num_packages || 0), 0);

  return {
    title: "BILL OF LADING",
    subtitle: "Combined Transport Bill of Lading",
    ref: ship.shipment_ref,
    booking_ref: ship.booking_ref || "—",
    shipper: partyBlock(shipper),
    consignee: partyBlock(consignee),
    notify_party: partyBlock(notifyParty || consignee),
    forwarding_agent: forwarder.name,
    port_of_loading: ship.origin_port || "—",
    port_of_discharge: ship.destination_port || "—",
    place_of_receipt: ship.pickup_location || ship.origin_port || "—",
    place_of_delivery: ship.delivery_location || ship.destination_port || "—",
    vessel: ship.vessel || "TBD",
    voyage: ship.voyage || "TBD",
    containers: containers.map((c: any) => ({
      number: c.container_number || "TBD",
      type: c.container_type,
      size: c.container_size || "",
      seal: c.seal_number || "—",
      vgm: c.vgm || "—",
    })),
    cargo_description: cargo.map((c: any) => ({
      commodity: c.commodity || "General Cargo",
      hs_code: c.hs_code || "—",
      packages: c.num_packages || 0,
      package_type: c.package_type || "PKG",
      gross_weight_kg: c.gross_weight || 0,
      volume_cbm: c.volume || 0,
      marks: c.marks_and_numbers || "N/M",
    })),
    totals: { packages: totalPackages, gross_weight_kg: totalGrossWeight, volume_cbm: totalVolume },
    freight_terms: ship.incoterm || "—",
    date_of_issue: new Date().toISOString().split("T")[0],
    number_of_originals: 3,
  };
}

function buildHAWB(ship: any, shipper: any, consignee: any, notifyParty: any, cargo: any[], forwarder: any) {
  const totalGross = cargo.reduce((s, c) => s + (c.gross_weight || 0), 0);
  const totalChargeable = cargo.reduce((s, c) => s + (c.chargeable_weight || c.gross_weight || 0), 0);
  const totalPieces = cargo.reduce((s, c) => s + (c.pieces || c.num_packages || 0), 0);

  return {
    title: "HOUSE AIR WAYBILL",
    subtitle: "Issued by Freight Forwarder",
    hawb_number: ship.hawb_number || "TBD",
    mawb_reference: ship.mawb_number || "TBD",
    shipper: partyBlock(shipper),
    consignee: partyBlock(consignee),
    notify_party: partyBlock(notifyParty || consignee),
    issuing_agent: forwarder.name,
    airport_of_departure: ship.airport_of_departure || ship.origin_port || "—",
    airport_of_destination: ship.airport_of_destination || ship.destination_port || "—",
    airline: ship.airline || "TBD",
    flight_number: ship.flight_number || "TBD",
    flight_date: ship.etd || "TBD",
    pieces: totalPieces,
    gross_weight_kg: totalGross,
    chargeable_weight_kg: totalChargeable,
    rate_class: ship.rate_class || "Q",
    nature_and_quantity: ship.nature_and_quantity || cargo.map((c: any) => c.commodity || "General Cargo").join(", "),
    cargo_items: cargo.map((c: any) => ({
      commodity: c.commodity || "General Cargo",
      pieces: c.pieces || c.num_packages || 0,
      gross_weight_kg: c.gross_weight || 0,
      chargeable_weight_kg: c.chargeable_weight || c.gross_weight || 0,
      dimensions: c.dimensions || "—",
    })),
    handling_information: ship.handling_information || "—",
    declared_value_carriage: ship.declared_value_for_carriage || "NVD",
    declared_value_customs: ship.declared_value_for_customs || "NCV",
    freight_terms: ship.incoterm || "Prepaid",
    date_of_issue: new Date().toISOString().split("T")[0],
  };
}

function buildMAWB(ship: any, shipper: any, consignee: any, cargo: any[], forwarder: any) {
  const totalGross = cargo.reduce((s, c) => s + (c.gross_weight || 0), 0);
  const totalChargeable = cargo.reduce((s, c) => s + (c.chargeable_weight || c.gross_weight || 0), 0);
  const totalPieces = cargo.reduce((s, c) => s + (c.pieces || c.num_packages || 0), 0);

  return {
    title: "MASTER AIR WAYBILL",
    subtitle: "Issued by Carrier",
    mawb_number: ship.mawb_number || "TBD",
    airline: ship.airline || "TBD",
    shipper: partyBlock(shipper),
    consignee: partyBlock(consignee),
    issuing_carrier_agent: forwarder.name,
    airport_of_departure: ship.airport_of_departure || ship.origin_port || "—",
    airport_of_destination: ship.airport_of_destination || ship.destination_port || "—",
    flight_number: ship.flight_number || "TBD",
    flight_date: ship.etd || "TBD",
    pieces: totalPieces,
    gross_weight_kg: totalGross,
    chargeable_weight_kg: totalChargeable,
    nature_and_quantity: ship.nature_and_quantity || cargo.map((c: any) => c.commodity).filter(Boolean).join(", "),
    handling_information: ship.handling_information || "—",
    declared_value_carriage: ship.declared_value_for_carriage || "NVD",
    declared_value_customs: ship.declared_value_for_customs || "NCV",
    date_of_issue: new Date().toISOString().split("T")[0],
  };
}

function buildCommercialInvoice(ship: any, shipper: any, consignee: any, cargo: any[], today: string) {
  const lineItems = cargo.map((c: any, i: number) => ({
    line: i + 1,
    commodity: c.commodity || "General Cargo",
    hs_code: c.hs_code || c.hts_code || c.schedule_b || "—",
    country_of_origin: c.country_of_origin || "—",
    packages: c.num_packages || c.pieces || 0,
    package_type: c.package_type || "PKG",
    gross_weight_kg: c.gross_weight || 0,
    net_weight_kg: c.net_weight || 0,
    volume_cbm: c.volume || 0,
    dimensions: c.dimensions || "—",
    quantity: c.num_packages || c.pieces || 0,
    unit_value: c.unit_value || 0,
    total_value: c.total_value || 0,
    currency: "USD",
  }));
  const grandTotal = lineItems.reduce((s, l) => s + l.total_value, 0);
  const totalGrossWeight = lineItems.reduce((s, l) => s + l.gross_weight_kg, 0);
  const totalPackages = lineItems.reduce((s, l) => s + l.packages, 0);
  const totalVolume = lineItems.reduce((s, l) => s + l.volume_cbm, 0);

  return {
    title: "COMMERCIAL INVOICE",
    invoice_number: `INV-${ship.shipment_ref}`,
    invoice_date: today,
    shipper: partyBlock(shipper),
    consignee: partyBlock(consignee),
    shipment_ref: ship.shipment_ref,
    terms_of_sale: ship.incoterm || "—",
    origin: ship.origin_port || "—",
    destination: ship.destination_port || "—",
    line_items: lineItems,
    totals: {
      packages: totalPackages,
      gross_weight_kg: totalGrossWeight,
      volume_cbm: totalVolume,
    },
    grand_total: grandTotal,
    currency: "USD",
    declaration: "I declare that the information on this invoice is true and correct.",
  };
}

function buildPackingList(ship: any, shipper: any, consignee: any, cargo: any[], containers: any[], today: string) {
  const totalGross = cargo.reduce((s, c) => s + (c.gross_weight || 0), 0);
  const totalNet = cargo.reduce((s, c) => s + (c.net_weight || 0), 0);
  const totalVolume = cargo.reduce((s, c) => s + (c.volume || 0), 0);
  const totalPackages = cargo.reduce((s, c) => s + (c.num_packages || c.pieces || 0), 0);

  return {
    title: "PACKING LIST",
    ref: ship.shipment_ref,
    date: today,
    shipper: partyBlock(shipper),
    consignee: partyBlock(consignee),
    origin: ship.origin_port || "—",
    destination: ship.destination_port || "—",
    items: cargo.map((c: any, i: number) => ({
      line: i + 1,
      commodity: c.commodity || "General Cargo",
      packages: c.num_packages || c.pieces || 0,
      package_type: c.package_type || "PKG",
      gross_weight_kg: c.gross_weight || 0,
      net_weight_kg: c.net_weight || 0,
      volume_cbm: c.volume || 0,
      dimensions: c.dimensions || "—",
      marks: c.marks_and_numbers || "N/M",
    })),
    totals: { packages: totalPackages, gross_weight_kg: totalGross, net_weight_kg: totalNet, volume_cbm: totalVolume },
    containers: containers.map((c: any) => ({ number: c.container_number || "TBD", type: c.container_type, seal: c.seal_number || "—" })),
  };
}

function buildSLI(ship: any, shipper: any, consignee: any, notifyParty: any, cargo: any[], containers: any[], forwarder: any, isAir: boolean, customsFiling: any) {
  const cf = customsFiling || {};
  const company = ship.companies || {};
  const hasDG = cargo.some((c: any) => c.dangerous_goods === true);

  // Build full shipper address
  const shipperAddress = cf.usppi_address
    || [shipper?.address, shipper?.city, shipper?.state, shipper?.postal_code, shipper?.country].filter(Boolean).join(", ")
    || [company.address, company.city, company.state, company.zip, company.country].filter(Boolean).join(", ")
    || "—";

  // Build full consignee address
  const consigneeAddress = cf.consignee_address
    || [consignee?.address, consignee?.city, consignee?.state, consignee?.postal_code, consignee?.country].filter(Boolean).join(", ")
    || "—";

  // Commodity lines from customs filing or cargo
  const commodityLines = Array.isArray(cf.hts_codes) && cf.hts_codes.length > 0
    ? cf.hts_codes.map((item: any, idx: number) => ({
        line: idx + 1,
        d_f: item.d_f || "D",
        schedule_b_number: item.code || "—",
        description: item.description || "—",
        quantity: item.quantity || 0,
        shipping_weight_kg: item.shipping_weight_kg || 0,
        vin_product_number: item.vin_product_number || "",
        value_usd: item.value || 0,
        license_code: item.license_code || "",
        license_number: item.license_number || "",
        export_info_code: item.export_info_code || "",
      }))
    : cargo.map((c: any, idx: number) => ({
        line: idx + 1,
        d_f: c.country_of_origin === "US" || c.country_of_origin === "USA" ? "D" : "F",
        schedule_b_number: c.hts_code || c.schedule_b || c.hs_code || "—",
        description: c.commodity || "General Cargo",
        quantity: c.num_packages || c.pieces || 0,
        shipping_weight_kg: c.gross_weight || 0,
        vin_product_number: "",
        value_usd: c.total_value || 0,
        license_code: "",
        license_number: "",
        export_info_code: "",
      }));

  return {
    title: "SHIPPER'S LETTER OF INSTRUCTION",
    date: ship.etd || new Date().toISOString().split("T")[0],

    // Shipper / USPPI
    shipper: {
      name: cf.exporter_name || shipper?.company_name || company.company_name || "—",
      ein: cf.exporter_ein || shipper?.tax_id || company.ein || "—",
      address: shipperAddress,
      contact_name: cf.usppi_contact_name || shipper?.contact_name || "—",
      phone: cf.usppi_phone || shipper?.phone || company.phone || "—",
      email: cf.usppi_email || shipper?.email || company.email || "—",
    },

    // Carrier / Exporting Carrier
    exporting_carrier: cf.vessel_name || ship.vessel || ship.airline || "TBD",
    carrier_identification_code: cf.carrier_identification_code || "—",
    ship_date: ship.etd || "—",

    // Ultimate Consignee
    consignee: {
      name: cf.consignee_name || consignee?.company_name || "—",
      address: consigneeAddress,
      contact_name: consignee?.contact_name || "—",
      phone: consignee?.phone || "—",
      type: cf.ultimate_consignee_type || "O",
    },

    // Forwarding Agent / Authorized Agent
    forwarding_agent: {
      name: cf.authorized_agent_name || cf.broker_name || forwarder.name || "—",
      address: cf.authorized_agent_address || "—",
      ein: cf.authorized_agent_ein || "—",
      email: cf.broker_email || "—",
    },

    // Routing & Ports
    port_of_export: cf.port_of_export || ship.origin_port || "—",
    port_of_unlading: cf.port_of_unlading || ship.destination_port || "—",
    country_of_ultimate_destination: cf.country_of_destination || consignee?.country || ship.destination_country || "—",
    state_of_origin: cf.state_of_origin || shipper?.state || company.state || "—",
    loading_pier: cf.loading_pier || "—",

    // Transport Details
    method_of_transportation: cf.method_of_transportation || (isAir ? "40" : "11"),
    mode: isAir ? "Air" : "Ocean",
    ...(isAir ? {
      airport_of_departure: ship.airport_of_departure || ship.origin_port || "—",
      airport_of_destination: ship.airport_of_destination || ship.destination_port || "—",
      airline: ship.airline || "TBD",
      flight: ship.flight_number || "TBD",
      mawb: ship.mawb_number || "TBD",
    } : {
      vessel: ship.vessel || "TBD",
      voyage: ship.voyage || "TBD",
    }),

    // Flags
    containerized: cf.containerized ?? (!isAir && containers.length > 0),
    hazardous_materials: cf.hazardous_materials ?? hasDG,
    routed_export_transaction: cf.routed_export_transaction ?? false,
    related_parties: cf.related_parties ?? false,

    // References
    shipment_ref: cf.shipment_reference_number || ship.shipment_ref || "—",
    entry_number: cf.entry_number || "—",
    in_bond_code: cf.in_bond_code || "—",
    original_itn: cf.original_itn || "—",
    itn: cf.itn || "—",
    aes_citation: cf.aes_citation || cf.eei_exemption_citation || "NO EEI 30.37(a) or as applicable",
    filing_option: cf.filing_option || "2",
    xtn: cf.xtn || "—",

    // Country of manufacture (from first cargo item)
    country_of_manufacture: cargo[0]?.country_of_origin || "—",

    // Commodity lines (Schedule B)
    commodity_lines: commodityLines,

    // Totals
    total_packages: cargo.reduce((s: number, c: any) => s + (c.num_packages || c.pieces || 0), 0),
    total_gross_weight_kg: cargo.reduce((s: number, c: any) => s + (c.gross_weight || 0), 0),
    total_value_usd: cargo.reduce((s: number, c: any) => s + (c.total_value || 0), 0),

    // Containers
    containers: containers.map((c: any) => ({
      number: c.container_number || "TBD",
      type: c.container_type,
      seal: c.seal_number || "—",
    })),

    // Special instructions
    special_instructions: cargo[0]?.special_instructions || "None",
    freight_terms: ship.incoterm || "Prepaid",

    // Certification
    shipper_certification: cf.shipper_certification_language
      || "I certify that the statements made and information contained herein are true and correct. I understand that civil and criminal penalties may be imposed for making false or fraudulent statements herein.",
    forwarder_authorization: cf.forwarder_authorization_language
      || "The exporter authorizes the forwarder named above to act as forwarding agent for export control and customs purposes.",
    title_of_representative: cf.title_of_shipper_representative || "Authorized Representative",
  };
}

function buildCertificateOfOrigin(ship: any, shipper: any, consignee: any, cargo: any[], today: string) {
  return {
    title: "CERTIFICATE OF ORIGIN",
    date: today,
    exporter: partyBlock(shipper),
    consignee: partyBlock(consignee),
    country_of_origin: cargo[0]?.country_of_origin || "United States",
    country_of_destination: ship.destination_country || "—",
    transport_details: `${ship.vessel || ship.airline || "TBD"} / ${ship.voyage || ship.flight_number || "TBD"}`,
    items: cargo.map((c: any, i: number) => ({
      line: i + 1,
      marks: c.marks_and_numbers || "N/M",
      commodity: c.commodity || "General Cargo",
      hs_code: c.hs_code || "—",
      quantity: c.num_packages || c.pieces || 0,
      gross_weight_kg: c.gross_weight || 0,
      country_of_origin: c.country_of_origin || "United States",
    })),
    certification: "The undersigned hereby declares that the above details and statements are correct and that all goods were produced or manufactured in the country shown.",
  };
}

function buildDockReceipt(ship: any, shipper: any, consignee: any, cargo: any[], containers: any[], forwarder: any, today: string) {
  return {
    title: "DOCK RECEIPT",
    date: today,
    shipper: partyBlock(shipper),
    consignee: partyBlock(consignee),
    forwarding_agent: forwarder.name,
    vessel: ship.vessel || "TBD",
    voyage: ship.voyage || "TBD",
    port_of_loading: ship.origin_port || "—",
    booking_ref: ship.booking_ref || "—",
    containers: containers.map((c: any) => ({
      number: c.container_number || "TBD",
      type: c.container_type,
      seal: c.seal_number || "—",
    })),
    cargo: cargo.map((c: any) => ({
      commodity: c.commodity || "General Cargo",
      packages: c.num_packages || 0,
      gross_weight_kg: c.gross_weight || 0,
      volume_cbm: c.volume || 0,
    })),
    received_in_apparent_good_order: true,
    remarks: "Received for shipment as indicated above.",
  };
}

function buildKnownShipperDeclaration(ship: any, shipper: any, forwarder: any, today: string) {
  return {
    title: "KNOWN SHIPPER DECLARATION",
    subtitle: "TSA Indirect Air Carrier Security — Known Shipper Verification",
    date: today,
    shipper: partyBlock(shipper),
    forwarder: forwarder.name,
    shipment_ref: ship.shipment_ref,
    airline: ship.airline || "TBD",
    airport_of_departure: ship.airport_of_departure || ship.origin_port || "—",
    airport_of_destination: ship.airport_of_destination || ship.destination_port || "—",
    declaration: "The shipper identified above is a Known Shipper as defined by the TSA. The cargo has been received from a known source and has been safeguarded against unauthorized interference from the point of origin.",
    screening_method: "Physical inspection or X-ray as applicable per TSA requirements.",
  };
}
