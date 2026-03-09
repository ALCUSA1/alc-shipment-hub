import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { shipment_id } = await req.json();
    if (!shipment_id) {
      return new Response(JSON.stringify({ error: "shipment_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch shipment with all air-specific fields
    const { data: shipment, error: shipErr } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipment_id)
      .single();
    if (shipErr || !shipment) {
      return new Response(JSON.stringify({ error: "Shipment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch parties
    const { data: parties } = await supabase
      .from("shipment_parties")
      .select("*")
      .eq("shipment_id", shipment_id);

    const shipper = parties?.find((p: any) => p.role === "shipper");
    const consignee = parties?.find((p: any) => p.role === "consignee");
    const forwarder = parties?.find((p: any) => p.role === "forwarder");

    // Fetch cargo
    const { data: cargo } = await supabase
      .from("cargo")
      .select("*")
      .eq("shipment_id", shipment_id);

    // Calculate totals
    const totalPieces = (cargo || []).reduce((sum: number, c: any) => sum + (c.pieces || c.num_packages || 0), 0);
    const totalGrossWeight = (cargo || []).reduce((sum: number, c: any) => sum + (c.gross_weight || 0), 0);
    const totalChargeableWeight = (cargo || []).reduce((sum: number, c: any) => sum + (c.chargeable_weight || c.gross_weight || 0), 0);
    const totalVolume = (cargo || []).reduce((sum: number, c: any) => sum + (c.volume || 0), 0);

    // Build IATA standard AWB data structure
    const awbData = {
      // AWB identification
      mawbNumber: shipment.mawb_number || "",
      hawbNumber: shipment.hawb_number || "",

      // Shipper
      shipper: {
        name: shipper?.company_name || "",
        address: [shipper?.address, shipper?.city, shipper?.state, shipper?.postal_code, shipper?.country].filter(Boolean).join(", "),
        contact: shipper?.contact_name || "",
        phone: shipper?.phone || "",
      },

      // Consignee
      consignee: {
        name: consignee?.company_name || "",
        address: [consignee?.address, consignee?.city, consignee?.state, consignee?.postal_code, consignee?.country].filter(Boolean).join(", "),
        contact: consignee?.contact_name || "",
        phone: consignee?.phone || "",
      },

      // Agent (forwarder)
      agent: {
        name: forwarder?.company_name || "",
        iataCode: "",
        accountNumber: "",
      },

      // Routing
      airportOfDeparture: shipment.airport_of_departure || shipment.origin_port || "",
      airportOfDestination: shipment.airport_of_destination || shipment.destination_port || "",
      routingAndDestination: shipment.routing_and_destination || "",
      airline: shipment.airline || "",
      flightNumber: shipment.flight_number || "",
      flightDate: shipment.etd || "",

      // Cargo details
      pieces: totalPieces,
      grossWeight: totalGrossWeight,
      chargeableWeight: totalChargeableWeight,
      volume: totalVolume,
      rateClass: shipment.rate_class || "Q",
      commodityItemNumber: shipment.commodity_item_number || "",
      natureAndQuantity: shipment.nature_and_quantity || (cargo || []).map((c: any) => c.commodity).filter(Boolean).join("; "),

      // Values
      declaredValueForCarriage: shipment.declared_value_for_carriage || "NVD",
      declaredValueForCustoms: shipment.declared_value_for_customs || "NCV",

      // Charges
      freightTerms: shipment.freight_terms || "prepaid",
      handlingInformation: shipment.handling_information || "",
      accountingInformation: shipment.accounting_information || "",
      sci: shipment.sci || "",

      // Metadata
      generatedAt: new Date().toISOString(),
      shipmentRef: shipment.shipment_ref,
    };

    // Store the AWB data as a document record
    await supabase.from("documents").insert({
      shipment_id,
      user_id: shipment.user_id,
      doc_type: shipment.hawb_number ? "hawb" : "mawb",
      status: "completed",
    });

    // Create tracking event
    await supabase.from("tracking_events").insert({
      shipment_id,
      milestone: "eAWB Submitted",
      location: awbData.airportOfDeparture,
      notes: `eAWB generated for ${awbData.airline} ${awbData.flightNumber}`,
    });

    return new Response(JSON.stringify({
      success: true,
      message: `eAWB generated for MAWB ${awbData.mawbNumber || "TBD"}`,
      awb: awbData,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-air-waybill error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
