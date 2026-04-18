import { CheckCircle, ArrowRight, Ship, FileText, MapPin, Download, MessageSquare, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface BookingConfirmationStepProps {
  shipment: any;
  financials: any[];
}

export function BookingConfirmationStep({ shipment, financials }: BookingConfirmationStepProps) {
  const navigate = useNavigate();
  const sellTotal = financials.filter(f => f.entry_type === "revenue").reduce((s, f) => s + (f.amount || 0), 0);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center max-w-2xl mx-auto">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
        <CheckCircle className="h-10 w-10 text-emerald-500" />
      </div>

      <h2 className="text-3xl font-bold text-foreground mb-2">Booking Confirmed! 🎉</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Your shipment has been confirmed and is being processed.
      </p>

      {/* Details Card */}
      <Card className="w-full mb-8">
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-left">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Shipment #</p>
              <p className="font-semibold">{shipment?.shipment_ref || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Route</p>
              <p className="font-semibold">{shipment?.origin_port} → {shipment?.destination_port}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Carrier</p>
              <p className="font-semibold">{shipment?.carrier || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total</p>
              <p className="font-semibold text-accent">{sellTotal > 0 ? `$${sellTotal.toLocaleString()}` : "Pending"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HBL Issuance Timeline Banner */}
      <Alert className="w-full mb-6 text-left border-accent/30 bg-accent/5">
        <Clock className="h-4 w-4 text-accent" />
        <AlertTitle className="text-sm font-semibold">House Bill of Lading (HBL) Timeline</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground space-y-1 mt-1">
          <div className="flex items-start gap-2">
            <span className="font-mono text-accent">1.</span>
            <span><span className="font-medium text-foreground">Now:</span> Draft HBL available in your workspace using the data you provided.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-accent">2.</span>
            <span><span className="font-medium text-foreground">Within 24–48h:</span> Carrier confirms booking and Shipping Instruction (SI) is submitted.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-mono text-accent">3.</span>
            <span><span className="font-medium text-foreground">After cargo loaded:</span> Final HBL issued and emailed to you for review/approval.</span>
          </div>
        </AlertDescription>
      </Alert>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-8">
        <div className="rounded-xl border bg-card p-4 text-center">
          <MapPin className="h-5 w-5 text-accent mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Next Milestone</p>
          <p className="text-sm font-medium text-foreground">Pickup Scheduled</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <FileText className="h-5 w-5 text-accent mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Documents</p>
          <p className="text-sm font-medium text-foreground">Generating</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Ship className="h-5 w-5 text-accent mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-sm font-medium text-emerald-600">Booked</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="electric" size="lg" onClick={() => navigate(`/dashboard/shipments/${shipment?.id}/workspace`)}>
          Go to Shipment Workspace <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate("/dashboard/shipments")}>
          View All Shipments
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate("/dashboard/support")}>
          <MessageSquare className="h-4 w-4 mr-1.5" /> Message Support
        </Button>
      </div>
    </div>
  );
}
