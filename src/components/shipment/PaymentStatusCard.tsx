import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle2, Clock, AlertCircle, Loader2, Landmark } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface PaymentStatusCardProps {
  shipmentId: string;
}

const paymentStyles: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  completed: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2 },
  succeeded: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2 },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock },
  unpaid: { bg: "bg-orange-100", text: "text-orange-700", icon: AlertCircle },
  failed: { bg: "bg-destructive/10", text: "text-destructive", icon: AlertCircle },
};

export function PaymentStatusCard({ shipmentId }: PaymentStatusCardProps) {
  const [paying, setPaying] = useState(false);
  const [payingWire, setPayingWire] = useState(false);

  const { data: quote } = useQuery({
    queryKey: ["shipment-quote-payment", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, amount, currency, payment_status, customer_price, status")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!shipmentId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["shipment-payments", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, amount, currency, status, payment_method, created_at")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!shipmentId,
  });

  if (!quote) return null;

  const paymentStatus = quote.payment_status || "unpaid";
  const style = paymentStyles[paymentStatus] || paymentStyles.unpaid;
  const StatusIcon = style.icon;
  const displayAmount = quote.customer_price || quote.amount || 0;
  const isPaid = paymentStatus === "paid" || payments.some(p => p.status === "completed" || p.status === "succeeded");

  const handlePayNow = async () => {
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { quoteId: quote.id, shipmentId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        toast({ title: "Payment initiated", description: "Check your email for payment details." });
      }
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-accent" />
          Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Quote Amount</p>
            <p className="text-lg font-semibold text-foreground">
              ${displayAmount.toLocaleString()} <span className="text-xs text-muted-foreground">{quote.currency || "USD"}</span>
            </p>
          </div>
          <Badge className={`${style.bg} ${style.text}`} variant="secondary">
            <StatusIcon className="h-3 w-3 mr-1" />
            {isPaid ? "Paid" : paymentStatus.replace(/_/g, " ")}
          </Badge>
        </div>

        {!isPaid && quote.status === "accepted" && displayAmount > 0 && (
          <div className="space-y-2">
            <Button variant="electric" className="w-full" onClick={handlePayNow} disabled={paying || payingWire}>
              {paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay Now
            </Button>
            <Button variant="outline" className="w-full" onClick={handlePayWire} disabled={paying || payingWire}>
              {payingWire ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Landmark className="h-4 w-4 mr-2" />}
              Pay via Bank Transfer
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">Wire transfers typically settle within 1–3 business days</p>
          </div>
        )}

        {payments.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Payment History</p>
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  ${p.amount.toLocaleString()} · {p.payment_method || "card"}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px]">{p.status}</Badge>
                  <span className="text-muted-foreground">{format(new Date(p.created_at), "MMM d")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
