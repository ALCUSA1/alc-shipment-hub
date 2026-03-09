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
 * submits it to the configured AES provider API, and updates the filing record
 * with the response (ITN, status).
 *
 * Supports:
 * - "submit": Submit a draft filing to AES
 * - "auto_create": Auto-create a draft filing from shipment data (called on booking)
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

    // ─── AUTO-CREATE: Build a draft customs_filing from shipment data ───
    if (action === "auto_create") {
      // Fetch shipment, parties, cargo in parallel
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

      // Find exporter (shipper) and consignee from parties
      const shipper = parties.find((p: any) => p.role === "shipper");
      const consignee = parties.find((p: any) => p.role === "consignee");

      // Build HTS codes from cargo
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

      // Determine mode-specific fields
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
          exporter_ein: null, // User must fill this
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

      // Log milestone
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

    // ─── SUBMIT: Send filing to AES provider ───
    if (action === "submit") {
      if (!filing_id) {
        return new Response(JSON.stringify({ error: "filing_id is required for submit action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const AES_PROVIDER_API_KEY = Deno.env.get("AES_PROVIDER_API_KEY");
      if (!AES_PROVIDER_API_KEY) {
        return new Response(
          JSON.stringify({ error: "AES provider API key not configured. Please contact your administrator to set up the AES filing integration." }),
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

      // Assemble EEI payload for AES provider
      const eeiPayload = {
        filing_type: filing.filing_type,
        exporter: {
          name: filing.exporter_name,
          ein: filing.exporter_ein,
        },
        consignee: {
          name: filing.consignee_name,
          address: filing.consignee_address,
        },
        shipment: {
          port_of_export: filing.port_of_export,
          port_of_unlading: filing.port_of_unlading,
          country_of_destination: filing.country_of_destination,
          mode_of_transport: filing.mode_of_transport,
          export_date: filing.export_date,
          vessel_name: filing.vessel_name,
          voyage_number: filing.voyage_number,
          carrier_name: filing.carrier_name,
        },
        commodities: Array.isArray(filing.hts_codes) ? filing.hts_codes : [],
        aes_citation: filing.aes_citation,
        broker: {
          name: filing.broker_name,
          email: filing.broker_email,
          ref: filing.broker_ref,
        },
      };

      // Call AES provider API
      const AES_PROVIDER_URL = Deno.env.get("AES_PROVIDER_URL") || "https://api.aesdirect.gov/v2";

      const aesResponse = await fetch(`${AES_PROVIDER_URL}/filings`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AES_PROVIDER_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(eeiPayload),
      });

      const aesData = await aesResponse.json();

      if (!aesResponse.ok) {
        // Log the failed submission attempt
        await supabase.from("customs_milestones").insert({
          filing_id,
          milestone: "Submission Failed",
          status: "error",
          notes: `AES provider error [${aesResponse.status}]: ${JSON.stringify(aesData)}`,
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
        notes: `Reference: ${aesData.reference || aesData.filing_ref || "—"}`,
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
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
