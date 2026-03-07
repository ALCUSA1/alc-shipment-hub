import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Ship, Check, Loader2, Clock, DollarSign, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface Surcharge {
  code: string;
  description: string;
  amount: number;
}

interface CarrierRate {
  id: string;
  carrier: string;
  origin_port: string;
  destination_port: string;
  container_type: string;
  base_rate: number;
  currency: string;
  transit_days: number | null;
  valid_from: string;
  valid_until: string;
  surcharges: Json;
  notes: string | null;
}

interface CarrierRateSelectorProps {
  shipmentId: string;
  shipmentRef: string;
  originPort: string | null;
  destinationPort: string | null;
  containerType: string | null;
}

function parseSurcharges(surcharges: Json): Surcharge[] {
  if (!Array.isArray(surcharges)) return [];
  return surcharges
    .filter((s) => typeof s === "object" && s !== null && "code" in s && "amount" in s)
    .map((s) => {
      const obj = s as Record<string, Json>;
      return {
        code: String(obj.code ?? ""),
        description: String(obj.description ?? ""),
        amount: Number(obj.amount ?? 0),
      };
    });
}

export function CarrierRateSelector({
  shipmentId,
  shipmentRef,
  originPort,
  destinationPort,
  containerType,
}: CarrierRateSelectorProps) {
  const queryClient = useQueryClient();
  const [selectedRate, setSelectedRate] = useState<CarrierRate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["carrier-rates", originPort, destinationPort, containerType],
    queryFn: async () => {
      let query = supabase
        .from("carrier_rates")
        .select("*")
        .gte("valid_until", new Date().toISOString().split("T")[0])
        .order("base_rate", { ascending: true });

      if (originPort) query = query.eq("origin_port", originPort);
      if (destinationPort) query = query.eq("destination_port", destinationPort);
      if (containerType) query = query.eq("container_type", containerType);

      const { data, error } = await query;
      if (error) throw error;
      return data as CarrierRate[];
    },
    enabled: !!(originPort && destinationPort),
  });

  const handleBooking = async () => {
    if (!selectedRate) return;
    setBookingLoading(true);
    try {
      const carrierKey = selectedRate.carrier.toLowerCase().replace(/\s+/g, "").replace("cgm", "cgm");
      const { data, error } = await supabase.functions.invoke("carrier-booking", {
        body: { shipment_id: shipmentId, carrier: carrierKey },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Booking Sent", description: data.message });
      setConfirmOpen(false);
      setSelectedRate(null);
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["tracking_events", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["edi_messages", shipmentId] });
    } catch (err: any) {
      toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
    } finally {
      setBookingLoading(false);
    }
  };

  const getTotalRate = (rate: CarrierRate) => {
    const surcharges = parseSurcharges(rate.surcharges);
    return rate.base_rate + surcharges.reduce((sum, s) => sum + s.amount, 0);
  };

  // Find best rate
  const bestRateId = rates.length > 0
    ? rates.reduce((best, r) => (getTotalRate(r) < getTotalRate(best) ? r : best), rates[0]).id
    : null;

  if (!originPort || !destinationPort) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4 text-accent" />
            Carrier Rates & Booking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>Origin and destination ports are required to view carrier rates.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4 text-accent" />
            Carrier Rates & Booking
          </CardTitle>
          <CardDescription>
            {originPort} → {destinationPort}
            {containerType && <span className="ml-1">· {containerType.toUpperCase()}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : rates.length === 0 ? (
            <div className="text-center py-6">
              <Ship className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No rates available for this route.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Check port codes or container type.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rates.map((rate) => {
                const surcharges = parseSurcharges(rate.surcharges);
                const totalRate = getTotalRate(rate);
                const isSelected = selectedRate?.id === rate.id;
                const isBest = rate.id === bestRateId;
                const isExpanded = expandedId === rate.id;

                return (
                  <div
                    key={rate.id}
                    className={`rounded-lg border-2 p-3 cursor-pointer transition-all ${
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/40"
                    }`}
                    onClick={() => setSelectedRate(rate)}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-accent bg-accent" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-accent-foreground" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{rate.carrier}</span>
                            {isBest && (
                              <Badge variant="default" className="text-[10px] bg-accent text-accent-foreground">
                                Best Rate
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {rate.transit_days && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {rate.transit_days} days
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Valid until {format(new Date(rate.valid_until), "MMM d")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">
                          ${totalRate.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rate.currency} all-in
                        </p>
                      </div>
                    </div>

                    {/* Surcharge toggle */}
                    {surcharges.length > 0 && (
                      <div className="mt-2">
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : rate.id);
                          }}
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          Rate breakdown
                        </button>

                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Base rate</span>
                              <span className="font-mono text-foreground">${rate.base_rate.toLocaleString()}</span>
                            </div>
                            {surcharges.map((s, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {s.code} — {s.description}
                                </span>
                                <span className="font-mono text-foreground">${s.amount.toLocaleString()}</span>
                              </div>
                            ))}
                            <Separator className="my-1" />
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-foreground">Total</span>
                              <span className="font-mono text-foreground">${totalRate.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {rate.notes && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1 italic">{rate.notes}</p>
                    )}
                  </div>
                );
              })}

              <Button
                variant="electric"
                className="w-full mt-2"
                disabled={!selectedRate}
                onClick={() => setConfirmOpen(true)}
              >
                <Ship className="h-4 w-4 mr-1" />
                {selectedRate
                  ? `Book with ${selectedRate.carrier} — $${getTotalRate(selectedRate).toLocaleString()}`
                  : "Select a rate to book"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking Request</DialogTitle>
            <DialogDescription>
              Send an IFTMIN booking request to{" "}
              <strong>{selectedRate?.carrier}</strong> for shipment{" "}
              <strong>{shipmentRef}</strong> at a total rate of{" "}
              <strong>${selectedRate ? getTotalRate(selectedRate).toLocaleString() : 0} {selectedRate?.currency}</strong>
              {selectedRate?.transit_days && (
                <span> with an estimated transit of <strong>{selectedRate.transit_days} days</strong></span>
              )}
              .
            </DialogDescription>
          </DialogHeader>
          {selectedRate && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carrier</span>
                <span className="font-medium text-foreground">{selectedRate.carrier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route</span>
                <span className="font-medium text-foreground">{selectedRate.origin_port} → {selectedRate.destination_port}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Container</span>
                <span className="font-medium text-foreground">{selectedRate.container_type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Rate</span>
                <span className="font-mono text-foreground">${selectedRate.base_rate.toLocaleString()}</span>
              </div>
              {parseSurcharges(selectedRate.surcharges).map((s, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{s.code}</span>
                  <span className="font-mono text-foreground">${s.amount.toLocaleString()}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total</span>
                <span className="font-mono text-foreground">${getTotalRate(selectedRate).toLocaleString()}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="electric" onClick={handleBooking} disabled={bookingLoading}>
              {bookingLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
