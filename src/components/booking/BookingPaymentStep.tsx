import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, CreditCard, Landmark, ArrowLeft, ArrowRight, Info, Ship, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface BookingPaymentStepProps {
  shipment: any;
  financials: any[];
  shipmentId: string;
  onBack: () => void;
  onBookLater: () => void;
  bookingLater: boolean;
}

export function BookingPaymentStep({ shipment, financials, shipmentId, onBack, onBookLater, bookingLater }: BookingPaymentStepProps) {
  const [payingNow, setPayingNow] = useState(false);
  const sellTotal = financials.filter(f => f.entry_type === "revenue").reduce((s, f) => s + (f.amount || 0), 0);

  const handlePayNow = async () => {
    setPayingNow(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          shipment_id: shipmentId,
          shipment_ref: shipment.shipment_ref,
          amount: sellTotal,
          currency: "USD",
          carrier: shipment.carrier,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment");
      setPayingNow(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: Payment options */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" /> Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pay by Card */}
              <button
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-accent bg-accent/5 text-left transition-all hover:shadow-md"
                onClick={handlePayNow}
                disabled={payingNow || sellTotal <= 0}
              >
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Pay by Card</p>
                  <p className="text-xs text-muted-foreground">Securely pay via credit card. Documents released upon confirmation.</p>
                </div>
                {payingNow && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
              </button>

              {/* Wire Transfer */}
              <button
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border text-left transition-all hover:border-accent/40 hover:shadow-sm"
                onClick={onBookLater}
                disabled={bookingLater}
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Landmark className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Book Now, Pay Later</p>
                  <p className="text-xs text-muted-foreground">Confirm booking and receive an invoice. Pay via wire transfer within terms.</p>
                </div>
                {bookingLater && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </button>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <p><strong>Pay Now:</strong> Secure checkout via Stripe. Documents released upon payment confirmation.</p>
                  <p className="mt-1"><strong>Book Now, Pay Later:</strong> Reserve your rate and booking. An invoice will be emailed with payment instructions.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Shipment</p>
                  <p className="font-medium">{shipment?.shipment_ref || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Carrier</p>
                  <p className="font-medium">{shipment?.carrier || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Route</p>
                  <p className="font-medium">{shipment?.origin_port} → {shipment?.destination_port}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ETD</p>
                  <p className="font-medium">{shipment?.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "—"}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1.5">
                {financials.filter(f => f.entry_type === "revenue").map(f => (
                  <div key={f.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{f.description}</span>
                    <span className="font-mono">${f.amount?.toLocaleString()}</span>
                  </div>
                ))}
                {financials.filter(f => f.entry_type === "revenue").length === 0 && (
                  <p className="text-xs text-muted-foreground">Pricing pending</p>
                )}
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Due</span>
                <span className="text-accent">{sellTotal > 0 ? `$${sellTotal.toLocaleString()}` : "TBD"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Back */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
      </div>
    </div>
  );
}
