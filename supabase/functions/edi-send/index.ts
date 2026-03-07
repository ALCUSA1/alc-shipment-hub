import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Carrier endpoint configuration (simulated - in production these would be real carrier API endpoints)
const CARRIER_ENDPOINTS: Record<string, string> = {
  maersk: "https://api.maersk.com/edi/iftmin",
  msc: "https://api.msc.com/edi/booking",
  "cma-cgm": "https://api.cma-cgm.com/edi/iftmin",
  evergreen: "https://api.evergreen-marine.com/edi/booking",
};

interface IftminMessage {
  header: {
    sender: string;
    receiver: string;
    message_ref: string;
    message_date: string;
  };
  booking: {
    shipment_ref: string;
    booking_ref?: string;
    shipment_type: string;
    origin_port?: string;
    destination_port?: string;
    etd?: string;
    eta?: string;
    pickup_location?: string;
    delivery_location?: string;
  };
  cargo: Array<{
    commodity?: string;
    gross_weight?: number;
    volume?: number;
    num_packages?: number;
    package_type?: string;
    hs_code?: string;
  }>;
  containers: Array<{
    container_type: string;
    quantity: number;
    container_number?: string;
  }>;
  parties: Array<{
    role: string;
    company_name: string;
    contact_name?: string;
    address?: string;
    email?: string;
    phone?: string;
  }>;
}

function buildIftminMessage(
  shipment: Record<string, unknown>,
  cargo: Array<Record<string, unknown>>,
  containers: Array<Record<string, unknown>>,
  parties: Array<Record<string, unknown>>,
  carrier: string
): IftminMessage {
  const messageRef = `IFTMIN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return {
    header: {
      sender: "ALC_PORTAL",
      receiver: carrier.toUpperCase(),
      message_ref: messageRef,
      message_date: new Date().toISOString(),
    },
    booking: {
      shipment_ref: shipment.shipment_ref as string,
      booking_ref: (shipment.booking_ref as string) || undefined,
      shipment_type: shipment.shipment_type as string,
      origin_port: (shipment.origin_port as string) || undefined,
      destination_port: (shipment.destination_port as string) || undefined,
      etd: (shipment.etd as string) || undefined,
      eta: (shipment.eta as string) || undefined,
      pickup_location: (shipment.pickup_location as string) || undefined,
      delivery_location: (shipment.delivery_location as string) || undefined,
    },
    cargo: cargo.map((c) => ({
      commodity: c.commodity as string,
      gross_weight: c.gross_weight as number,
      volume: c.volume as number,
      num_packages: c.num_packages as number,
      package_type: c.package_type as string,
      hs_code: c.hs_code as string,
    })),
    containers: containers.map((c) => ({
      container_type: c.container_type as string,
      quantity: c.quantity as number,
      container_number: c.container_number as string,
    })),
    parties: parties.map((p) => ({
      role: p.role as string,
      company_name: p.company_name as string,
      contact_name: p.contact_name as string,
      address: p.address as string,
      email: p.email as string,
      phone: p.phone as string,
    })),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { shipment_id, carrier, message_type = "IFTMIN" } = await req.json();

    if (!shipment_id) throw new Error("Missing shipment_id");
    if (!carrier) throw new Error("Missing carrier");

    const normalizedCarrier = carrier.toLowerCase();
    if (!CARRIER_ENDPOINTS[normalizedCarrier]) {
      throw new Error(`Unsupported carrier: ${carrier}`);
    }

    // Fetch shipment with related data
    const { data: shipment, error: shipErr } = await supabaseAdmin
      .from("shipments")
      .select("*")
      .eq("id", shipment_id)
      .eq("user_id", user.id)
      .single();

    if (shipErr || !shipment) throw new Error("Shipment not found");

    const [cargoRes, containersRes, partiesRes] = await Promise.all([
      supabaseAdmin.from("cargo").select("*").eq("shipment_id", shipment_id),
      supabaseAdmin.from("containers").select("*").eq("shipment_id", shipment_id),
      supabaseAdmin.from("shipment_parties").select("*").eq("shipment_id", shipment_id),
    ]);

    // Build IFTMIN message
    const iftminMessage = buildIftminMessage(
      shipment,
      cargoRes.data || [],
      containersRes.data || [],
      partiesRes.data || [],
      normalizedCarrier
    );

    // In production, this would POST to the actual carrier API endpoint
    // For now, we simulate success and log the message
    const simulatedResponse = {
      success: true,
      carrier_ref: `${normalizedCarrier.toUpperCase()}-${Date.now()}`,
      message: `Booking request accepted by ${carrier}`,
    };

    // Log the outbound EDI message
    await supabaseAdmin.from("edi_messages").insert({
      shipment_id,
      user_id: user.id,
      carrier: normalizedCarrier,
      direction: "outbound",
      message_type: message_type.toUpperCase(),
      message_ref: iftminMessage.header.message_ref,
      payload: {
        iftmin: iftminMessage,
        carrier_endpoint: CARRIER_ENDPOINTS[normalizedCarrier],
        carrier_response: simulatedResponse,
      },
      status: "sent",
      processed_at: new Date().toISOString(),
    });

    // Update shipment booking ref if carrier provided one
    if (simulatedResponse.carrier_ref && !shipment.booking_ref) {
      await supabaseAdmin
        .from("shipments")
        .update({ booking_ref: simulatedResponse.carrier_ref })
        .eq("id", shipment_id);
    }

    return new Response(
      JSON.stringify({
        status: "sent",
        message_ref: iftminMessage.header.message_ref,
        carrier_ref: simulatedResponse.carrier_ref,
        carrier: normalizedCarrier,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("EDI send error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
