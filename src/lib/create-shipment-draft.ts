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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Please log in to book a shipment.");
  const { data, error } = await supabase.functions.invoke("create-shipment-draft", {
    body: rate,
  });

  if (error) {
    throw new Error(error.message || "Failed to create shipment draft");
  }

  if (!data?.shipment?.id) {
    throw new Error(data?.error || "Failed to create shipment draft");
  }

  return data.shipment as ShipmentDraft;
}
