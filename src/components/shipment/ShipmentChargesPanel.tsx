import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, Loader2, Receipt, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ShipmentChargesPanelProps {
  shipmentId: string;
}

const CHARGE_TYPE_LABELS: Record<string, string> = {
  freight: "Freight",
  amendment_fee: "Amendment Fee",
  demurrage: "Demurrage",
  detention: "Detention",
  per_diem: "Per Diem",
  terminal: "Terminal Handling",
  documentation: "Documentation Fee",
  customs: "Customs Fee",
  inspection: "Inspection Fee",
  late_fee: "Late Fee",
  storage: "Storage",
  other: "Other Charge",
};

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  unpaid: "bg-orange-100 text-orange-700",
  paid: "bg-green-100 text-green-700",
  processing: "bg-blue-100 text-blue-700",
};

export function ShipmentChargesPanel({ shipmentId }: ShipmentChargesPanelProps) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [wirePayingId, setWirePayingId] = useState<string | null>(null);

  const { data: charges = [] } = useQuery({
    queryKey: ["shipment_charges", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_charges")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handlePay = async (charge: any) => {
    setPayingId(charge.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          shipment_id: shipmentId,
          amount: charge.amount,
          currency: charge.currency,
          metadata: {
            charge_id: charge.id,
            charge_type: charge.charge_type,
            description: charge.description,
          },
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  if (charges.length === 0) return null;

  const unpaidTotal = charges
    .filter((c: any) => c.payment_status === "unpaid")
    .reduce((sum: number, c: any) => sum + Number(c.amount), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-accent" />
            Charges & Fees
          </CardTitle>
          {unpaidTotal > 0 && (
            <Badge className="bg-orange-100 text-orange-700 text-xs">
              ${unpaidTotal.toLocaleString()} unpaid
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {charges.map((charge: any) => (
            <div
              key={charge.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-foreground truncate">
                    {CHARGE_TYPE_LABELS[charge.charge_type] || charge.charge_type}
                  </span>
                  <Badge
                    className={`text-[10px] ${PAYMENT_STATUS_STYLE[charge.payment_status] || "bg-secondary text-muted-foreground"}`}
                  >
                    {charge.payment_status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {charge.description}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(charge.created_at), "MMM d, yyyy")}
                  {charge.who_pays && ` · ${charge.who_pays}`}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                  <DollarSign className="h-3 w-3 inline -mt-0.5" />
                  {Number(charge.amount).toLocaleString()} {charge.currency}
                </span>
                {charge.payment_status === "unpaid" && charge.who_pays === "shipper" && (
                  <Button
                    variant="electric"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handlePay(charge)}
                    disabled={payingId === charge.id}
                  >
                    {payingId === charge.id ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CreditCard className="h-3 w-3 mr-1" />
                    )}
                    Pay
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
