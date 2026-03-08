import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * e2open (INTTRA) Sync Edge Function
 *
 * Fetches vessel booking details, voyage schedules, tracking milestones,
 * and cutoff dates from e2open's API and updates the shipment record.
 *
 * Supports two modes:
 * - "booking": Fetch booking confirmation & voyage details
 * - "tracking": Fetch latest tracking milestones
 */

const E2OPEN_BASE_URL = "https://api.e2open.com/v1";

interface E2OpenBookingResponse {
  bookingNumber: string;
  carrier: string;
  status: string;
  vessel: string;
  voyage: string;
  etd: string;
  eta: string;
  originPort: string;
  destinationPort: string;
  cutoffs?: {
    cyCutoff?: string;
    siCutoff?: string;
    vgmCutoff?: string;
    docCutoff?: string;
  };
  legs?: Array<{
    legOrder: number;
    legType: string;
    vesselName: string;
    voyageNumber: string;
    originPort: string;
    destinationPort: string;
    etd: string;
    eta: string;
    transshipmentPort?: string;
  }>;
  containers?: Array<{
    containerNumber: string;
    containerType: string;
    sealNumber?: string;
  }>;
}

interface E2OpenTrackingEvent {
  eventCode: string;
  eventDate: string;
  location: string;
  description: string;
  vessel?: string;
  voyage?: string;
}

// Map e2open event codes to our milestone labels
const E2OPEN_EVENT_MAP: Record<string, string> = {
  "BOOKING_CONFIRMED": "Booking Confirmed",
  "GATE_IN": "Cargo Received",
  "LOADED": "Container Loaded",
  "DEPARTED": "Vessel Departed",
  "IN_TRANSIT": "In Transit",
  "ARRIVED": "Port Arrival",
  "CUSTOMS_CLEARED": "Customs Clearance",
  "DELIVERED": "Delivered",
};

const MILESTONE_TO_STATUS: Record<string, string> = {
  "Booking Confirmed": "booking_confirmed",
  "Cargo Received": "cargo_received",
  "Container Loaded": "cargo_received",
  "Vessel Departed": "in_transit",
  "In Transit": "in_transit",
  "Port Arrival": "in_transit",
  "Customs Clearance": "in_transit",
  "Delivered": "delivered",
};

async function fetchFromE2Open(path: string, apiKey: string): Promise<any> {
  const response = await fetch(`${E2OPEN_BASE_URL}${path}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`e2open API error [${response.status}]: ${body}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const E2OPEN_API_KEY = Deno.env.get("E2OPEN_API_KEY");
    if (!E2OPEN_API_KEY) {
      return new Response(
        JSON.stringify({ error: "e2open API key not configured. Please contact your administrator." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { shipment_id, mode = "booking", booking_ref } = await req.json();

    if (!shipment_id) {
      return new Response(JSON.stringify({ error: "shipment_id is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Verify user owns the shipment (RLS will enforce this too)
    const { data: shipment, error: shipErr } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", shipment_id)
      .single();

    if (shipErr || !shipment) {
      return new Response(JSON.stringify({ error: "Shipment not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const ref = booking_ref || shipment.booking_ref;
    if (!ref) {
      return new Response(
        JSON.stringify({ error: "No booking reference found. Enter a booking reference on the shipment first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, any> = { synced: [] };

    if (mode === "booking" || mode === "all") {
      // Fetch booking details from e2open
      const bookingData: E2OpenBookingResponse = await fetchFromE2Open(
        `/bookings/${encodeURIComponent(ref)}`,
        E2OPEN_API_KEY
      );

      // Update shipment with vessel & voyage info
      const shipmentUpdate: Record<string, any> = {};
      if (bookingData.vessel) shipmentUpdate.vessel = bookingData.vessel;
      if (bookingData.voyage) shipmentUpdate.voyage = bookingData.voyage;
      if (bookingData.etd) shipmentUpdate.etd = bookingData.etd;
      if (bookingData.eta) shipmentUpdate.eta = bookingData.eta;

      // Update cutoff dates if provided
      if (bookingData.cutoffs) {
        if (bookingData.cutoffs.cyCutoff) shipmentUpdate.cy_cutoff = bookingData.cutoffs.cyCutoff;
        if (bookingData.cutoffs.siCutoff) shipmentUpdate.si_cutoff = bookingData.cutoffs.siCutoff;
        if (bookingData.cutoffs.vgmCutoff) shipmentUpdate.vgm_cutoff = bookingData.cutoffs.vgmCutoff;
        if (bookingData.cutoffs.docCutoff) shipmentUpdate.doc_cutoff = bookingData.cutoffs.docCutoff;
      }

      if (Object.keys(shipmentUpdate).length > 0) {
        await supabase.from("shipments").update(shipmentUpdate).eq("id", shipment_id);
        results.synced.push("shipment_details");
      }

      // Update vessel booking legs if present
      if (bookingData.legs && bookingData.legs.length > 0) {
        // Find existing vessel booking for this shipment
        const { data: existingBookings } = await supabase
          .from("vessel_bookings")
          .select("id")
          .eq("shipment_id", shipment_id)
          .order("created_at", { ascending: false })
          .limit(1);

        let bookingId: string;

        if (existingBookings && existingBookings.length > 0) {
          bookingId = existingBookings[0].id;
          // Update booking details
          await supabase.from("vessel_bookings").update({
            booking_number: bookingData.bookingNumber || ref,
            carrier: bookingData.carrier,
            status: bookingData.status === "confirmed" ? "confirmed" : "draft",
          }).eq("id", bookingId);

          // Delete existing legs and re-insert
          await supabase.from("booking_legs").delete().eq("booking_id", bookingId);
        } else {
          // Create new vessel booking
          const { data: newBooking, error: bkErr } = await supabase
            .from("vessel_bookings")
            .insert({
              shipment_id,
              booking_number: bookingData.bookingNumber || ref,
              carrier: bookingData.carrier,
              status: bookingData.status === "confirmed" ? "confirmed" : "draft",
              created_by: user.id,
            })
            .select("id")
            .single();
          if (bkErr) throw bkErr;
          bookingId = newBooking.id;
        }

        // Insert legs
        await supabase.from("booking_legs").insert(
          bookingData.legs.map((leg) => ({
            booking_id: bookingId,
            leg_order: leg.legOrder,
            leg_type: leg.legType,
            vessel_name: leg.vesselName,
            voyage_number: leg.voyageNumber,
            origin_port: leg.originPort,
            destination_port: leg.destinationPort,
            etd: leg.etd,
            eta: leg.eta,
            transshipment_port: leg.transshipmentPort || null,
          }))
        );
        results.synced.push("voyage_legs");
      }

      // Update container numbers if provided
      if (bookingData.containers && bookingData.containers.length > 0) {
        for (const container of bookingData.containers) {
          if (container.containerNumber) {
            await supabase
              .from("containers")
              .update({
                container_number: container.containerNumber,
                seal_number: container.sealNumber || null,
              })
              .eq("shipment_id", shipment_id)
              .eq("container_type", container.containerType)
              .is("container_number", null);
          }
        }
        results.synced.push("containers");
      }

      results.booking = {
        carrier: bookingData.carrier,
        vessel: bookingData.vessel,
        voyage: bookingData.voyage,
        status: bookingData.status,
      };
    }

    if (mode === "tracking" || mode === "all") {
      // Fetch tracking events from e2open
      const trackingData: { events: E2OpenTrackingEvent[] } = await fetchFromE2Open(
        `/tracking/${encodeURIComponent(ref)}/events`,
        E2OPEN_API_KEY
      );

      if (trackingData.events && trackingData.events.length > 0) {
        // Get existing tracking events to avoid duplicates
        const { data: existingEvents } = await supabase
          .from("tracking_events")
          .select("milestone")
          .eq("shipment_id", shipment_id);

        const existingMilestones = new Set((existingEvents || []).map((e) => e.milestone));
        let latestStatus: string | null = null;

        for (const event of trackingData.events) {
          const milestone = E2OPEN_EVENT_MAP[event.eventCode] || event.eventCode;

          if (!existingMilestones.has(milestone)) {
            await supabase.from("tracking_events").insert({
              shipment_id,
              milestone,
              event_date: event.eventDate,
              location: event.location || null,
              notes: `Synced from e2open: ${event.description}`,
            });
          }

          const status = MILESTONE_TO_STATUS[milestone];
          if (status) latestStatus = status;
        }

        // Update shipment status to latest milestone
        if (latestStatus) {
          await supabase.from("shipments").update({ status: latestStatus }).eq("id", shipment_id);
        }

        results.synced.push("tracking_events");
        results.tracking = {
          eventsCount: trackingData.events.length,
          newEvents: trackingData.events.filter(
            (e) => !existingMilestones.has(E2OPEN_EVENT_MAP[e.eventCode] || e.eventCode)
          ).length,
        };
      }
    }

    return new Response(JSON.stringify({
      success: true,
      shipment_id,
      ...results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("e2open sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
