import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Ship, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const CARRIERS = [
  { id: "maersk", name: "Maersk" },
  { id: "msc", name: "MSC" },
  { id: "cma-cgm", name: "CMA CGM" },
  { id: "evergreen", name: "Evergreen" },
];

const statusConfig: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  sent: { icon: CheckCircle2, className: "text-green-600" },
  processed: { icon: CheckCircle2, className: "text-green-600" },
  pending: { icon: Clock, className: "text-yellow-600" },
  failed: { icon: XCircle, className: "text-destructive" },
};

interface CarrierBookingProps {
  shipmentId: string;
  shipmentRef: string;
}

export function CarrierBooking({ shipmentId, shipmentRef }: CarrierBookingProps) {
  const queryClient = useQueryClient();
  const [selectedCarrier, setSelectedCarrier] = useState("");

  const { data: bookings = [] } = useQuery({
    queryKey: ["edi-bookings", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edi_messages")
        .select("*")
        .eq("shipment_id", shipmentId)
        .eq("message_type", "IFTMIN")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendBooking = useMutation({
    mutationFn: async (carrier: string) => {
      const { data, error } = await supabase.functions.invoke("edi-send", {
        body: { shipment_id: shipmentId, carrier, message_type: "IFTMIN" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Booking request sent to ${data.carrier?.toUpperCase() || "carrier"}`, {
        description: `Reference: ${data.message_ref}`,
      });
      setSelectedCarrier("");
      queryClient.invalidateQueries({ queryKey: ["edi-bookings", shipmentId] });
    },
    onError: (error) => {
      toast.error("Failed to send booking", { description: error.message });
    },
  });

  const handleSend = () => {
    if (!selectedCarrier) {
      toast.error("Please select a shipping line");
      return;
    }
    sendBooking.mutate(selectedCarrier);
  };

  const carrierName = (id: string) => CARRIERS.find((c) => c.id === id)?.name || id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Ship className="h-4 w-4 text-accent" />
          Carrier Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Send new booking */}
        <div className="flex gap-3">
          <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select shipping line" />
            </SelectTrigger>
            <SelectContent>
              {CARRIERS.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="electric"
            size="sm"
            onClick={handleSend}
            disabled={sendBooking.isPending}
          >
            {sendBooking.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Ship className="h-4 w-4 mr-1" />
                Book
              </>
            )}
          </Button>
        </div>

        {/* Booking history */}
        {bookings.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Booking History</p>
            {bookings.map((b: any) => {
              const config = statusConfig[b.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div key={b.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-3.5 w-3.5 ${config.className}`} />
                    <span className="text-sm font-medium">{carrierName(b.carrier)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{b.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(b.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {bookings.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No bookings sent yet. Select a shipping line to request a booking.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
