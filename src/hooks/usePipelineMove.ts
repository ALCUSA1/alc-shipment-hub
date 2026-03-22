import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Maps pipeline stage keys back to the underlying table + status value.
 * quote_pending / quote_accepted → quotes table
 * everything else → shipments table
 */
const STAGE_TO_TABLE: Record<string, { table: "quotes" | "shipments"; status: string }> = {
  quote_pending: { table: "quotes", status: "pending" },
  quote_accepted: { table: "quotes", status: "accepted" },
  booked: { table: "shipments", status: "booked" },
  in_transit: { table: "shipments", status: "in_transit" },
  arrived: { table: "shipments", status: "arrived" },
  delivered: { table: "shipments", status: "delivered" },
};

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  quote_pending: ["quote_accepted"],
  quote_accepted: ["quote_pending", "booked"],
  booked: ["in_transit"],
  in_transit: ["arrived"],
  arrived: ["delivered"],
  delivered: [],
};

export function usePipelineMove() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      fromStage,
      toStage,
      itemType,
      shipmentId,
    }: {
      itemId: string;
      fromStage: string;
      toStage: string;
      itemType: "quote" | "shipment";
      shipmentId?: string;
    }) => {
      if (fromStage === toStage) return;

      const allowed = ALLOWED_TRANSITIONS[fromStage] || [];
      if (!allowed.includes(toStage)) {
        throw new Error(`Cannot move from "${fromStage.replace("_", " ")}" to "${toStage.replace("_", " ")}"`);
      }

      const target = STAGE_TO_TABLE[toStage];
      if (!target) throw new Error("Unknown target stage");

      // For quotes moving to a shipment stage, we update the linked shipment
      if (itemType === "quote" && target.table === "shipments") {
        if (!shipmentId) throw new Error("Quote must be linked to a shipment to move to booked");
        const { error } = await supabase
          .from("shipments")
          .update({ status: target.status })
          .eq("id", shipmentId);
        if (error) throw error;
        // Also mark the quote as accepted if not already
        await supabase.from("quotes").update({ status: "accepted" }).eq("id", itemId);
      } else if (target.table === "quotes") {
        const { error } = await supabase
          .from("quotes")
          .update({ status: target.status })
          .eq("id", itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("shipments")
          .update({ status: target.status })
          .eq("id", itemId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Status updated");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
