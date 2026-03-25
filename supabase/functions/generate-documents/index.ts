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
    const [shipRes, partiesRes, cargoRes, containersRes, profileRes] = await Promise.all([
      supabase.from("shipments").select("*, companies!shipments_company_id_fkey(company_name, address, city, state, zip, country, phone, email, ein)").eq("id", shipment_id).single(),
      supabase.from("shipment_parties").select("*").eq("shipment_id", shipment_id),
      supabase.from("cargo").select("*").eq("shipment_id", shipment_id),
      supabase.from("containers").select("*").eq("shipment_id", shipment_id),
      supabase.from("profiles").select("*").limit(1),
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
          documents.shipper_letter_of_instruction = buildSLI(ship, shipper, consignee, notifyParty, cargoItems, containers, forwarder, isAir);
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
    hs_code: c.hs_code || "—",
    country_of_origin: c.country_of_origin || "—",
    quantity: c.num_packages || c.pieces || 0,
    unit_value: c.unit_value || 0,
    total_value: c.total_value || 0,
    currency: "USD",
  }));
  const grandTotal = lineItems.reduce((s, l) => s + l.total_value, 0);

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

function buildSLI(ship: any, shipper: any, consignee: any, notifyParty: any, cargo: any[], containers: any[], forwarder: any, isAir: boolean) {
  return {
    title: "SHIPPER'S LETTER OF INSTRUCTION",
    date: new Date().toISOString().split("T")[0],
    shipper: partyBlock(shipper),
    consignee: partyBlock(consignee),
    notify_party: partyBlock(notifyParty || consignee),
    forwarding_agent: forwarder.name,
    shipment_ref: ship.shipment_ref,
    mode: isAir ? "Air" : "Ocean",
    ...(isAir ? {
      airport_of_departure: ship.airport_of_departure || ship.origin_port || "—",
      airport_of_destination: ship.airport_of_destination || ship.destination_port || "—",
      airline: ship.airline || "TBD",
      flight: ship.flight_number || "TBD",
      mawb: ship.mawb_number || "TBD",
    } : {
      port_of_loading: ship.origin_port || "—",
      port_of_discharge: ship.destination_port || "—",
      vessel: ship.vessel || "TBD",
      voyage: ship.voyage || "TBD",
    }),
    cargo_summary: cargo.map((c: any) => ({
      commodity: c.commodity || "General Cargo",
      hs_code: c.hs_code || "—",
      packages: c.num_packages || c.pieces || 0,
      gross_weight_kg: c.gross_weight || 0,
    })),
    special_instructions: cargo[0]?.special_instructions || "None",
    freight_charges: ship.incoterm || "Prepaid",
    insurance: "As per agreement",
    aes_statement: "NO EEI 30.37(a) or as applicable",
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
