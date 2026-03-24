import { CheckCircle, ArrowRight, Ship, FileText, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function BookingConfirmStep() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
        <CheckCircle className="h-10 w-10 text-emerald-500" />
      </div>

      <h2 className="text-3xl font-bold text-foreground mb-2">Shipment Booked! 🎉</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Your booking has been confirmed. You'll be redirected to your shipment workspace momentarily.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full mb-8">
        <div className="rounded-xl border bg-card p-4 text-center">
          <MapPin className="h-5 w-5 text-accent mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Live Tracking</p>
          <p className="text-sm font-medium text-foreground">Active</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <FileText className="h-5 w-5 text-accent mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Documents</p>
          <p className="text-sm font-medium text-foreground">Pending</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Ship className="h-5 w-5 text-accent mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-sm font-medium text-emerald-600">Booked</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="electric" size="lg" onClick={() => navigate("/dashboard/shipments")}>
          View Shipments <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
