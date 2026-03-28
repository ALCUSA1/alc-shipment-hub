import { supabase } from "@/integrations/supabase/client";

export interface RateSelection {
  rateId: string;
  carrier: string;
  originPort: string;
  destinationPort: string;
  mode: "ocean" | "air";
  containerType: string;
  baseRate: number;
  surcharges: any[];
  totalRate: number;
  currency: string;
  transitDays: number | null;
  etd: string | null;
  eta: string | null;
  validFrom: string;
  validUntil: string;
  serviceLevel: string | null;
  freeTimeDays: number | null;
}

export interface ShipmentDraft {
  id: string;
  shipment_ref: string;
}

/**
 * Creates a shipment draft from a selected rate.
 * This is the SINGLE entry point for all booking flows.
 * Rate selection = Shipment draft creation.
 */
export async function createShipmentDraft(rate: RateSelection): Promise<ShipmentDraft> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in to book a shipment.");

  // Get user's company
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  // Calculate sell price with 12% margin
  const margin = 0.12;
  const sellPrice = Math.round(rate.totalRate / (1 - margin));

  // Create shipment draft with rate locked in
  const { data: shipment, error } = await supabase
    .from("shipments")
    .insert({
      user_id: user.id,
      company_id: membership?.company_id || null,
      origin_port: rate.originPort,
      destination_port: rate.destinationPort,
      mode: rate.mode,
      container_type: rate.containerType,
      carrier: rate.carrier,
      status: "draft",
      lifecycle_stage: "draft",
      etd: rate.etd?.split("T")[0] || null,
      eta: rate.eta?.split("T")[0] || null,
      shipment_type: "export",
    } as any)
    .select("id, shipment_ref")
    .single();

  if (error) throw error;

  // Store rate snapshot in shipment_financials for audit trail
  await supabase.from("shipment_financials").insert([
    {
      shipment_id: shipment.id,
      user_id: user.id,
      entry_type: "cost",
      category: "ocean_freight",
      description: `${rate.carrier} base rate — ${rate.originPort} → ${rate.destinationPort}`,
      amount: rate.baseRate,
      currency: rate.currency,
      vendor: rate.carrier,
    },
    {
      shipment_id: shipment.id,
      user_id: user.id,
      entry_type: "revenue",
      category: "ocean_freight",
      description: `Sell price — ${rate.originPort} → ${rate.destinationPort}`,
      amount: sellPrice,
      currency: rate.currency,
    },
  ]);

  // Store surcharges as individual cost entries
  if (rate.surcharges.length > 0) {
    await supabase.from("shipment_financials").insert(
      rate.surcharges.map((s: any) => ({
        shipment_id: shipment.id,
        user_id: user.id,
        entry_type: "cost",
        category: "surcharges",
        description: s.description || s.code || "Surcharge",
        amount: Number(s.amount) || 0,
        currency: rate.currency,
        vendor: rate.carrier,
      }))
    );
  }

  return shipment;
}
