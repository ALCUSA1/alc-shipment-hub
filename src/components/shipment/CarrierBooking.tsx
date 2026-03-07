import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Ship,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  CalendarDays,
  Timer,
  DollarSign,
  Anchor,
} from "lucide-react";
import { format } from "date-fns";

const CARRIERS: Record<string, string> = {
  maersk: "Maersk",
  msc: "MSC",
  "cma-cgm": "CMA CGM",
  evergreen: "Evergreen",
};

const CONTAINER_LABELS: Record<string, string> = {
  "20GP": "20' Standard",
  "40GP": "40' Standard",
  "40HC": "40' High Cube",
};

const statusConfig: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  sent: { icon: CheckCircle2, className: "text-green-600" },
  processed: { icon: CheckCircle2, className: "text-green-600" },
  pending: { icon: Clock, className: "text-yellow-600" },
  failed: { icon: XCircle, className: "text-destructive" },
};

interface Surcharge {
  name: string;
  amount: number;
}

interface CarrierRate {
  id: string;
  carrier: string;
  container_type: string;
  base_rate: number;
  currency: string;
  transit_days: number | null;
  valid_from: string;
  valid_until: string;
  surcharges: Surcharge[];
}

interface CarrierGroup {
  carrier: string;
  carrierName: string;
  rates: CarrierRate[];
  lowestTotal: number;
  transitDays: number | null;
  validFrom: string;
  validUntil: string;
}

interface CarrierBookingProps {
  shipmentId: string;
  shipmentRef: string;
  originPort?: string | null;
  destinationPort?: string | null;
}

export function CarrierBooking({
  shipmentId,
  shipmentRef,
  originPort,
  destinationPort,
}: CarrierBookingProps) {
  const queryClient = useQueryClient();
  const [selectedContainer, setSelectedContainer] = useState("40HC");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedCarrierForBooking, setSelectedCarrierForBooking] = useState("");
  const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null);

  // Fetch rates for this route
  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ["carrier-rates", originPort, destinationPort],
    queryFn: async () => {
      let query = supabase
        .from("carrier_rates")
        .select("*")
        .gte("valid_until", new Date().toISOString().split("T")[0])
        .order("base_rate", { ascending: true });

      if (originPort) query = query.eq("origin_port", originPort);
      if (destinationPort) query = query.eq("destination_port", destinationPort);

      const { data, error } = await query;
      if (error) throw error;
      return data as CarrierRate[];
    },
    enabled: true,
  });

  // Fetch booking history
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

  // Group rates by carrier, filtered by selected container type
  const carrierGroups = useMemo((): CarrierGroup[] => {
    const grouped = new Map<string, CarrierRate[]>();
    rates.forEach((rate) => {
      if (!grouped.has(rate.carrier)) grouped.set(rate.carrier, []);
      grouped.get(rate.carrier)!.push(rate);
    });

    return Array.from(grouped.entries())
      .map(([carrier, carrierRates]) => {
        const selectedRate = carrierRates.find(
          (r) => r.container_type === selectedContainer
        );
        const surcharges: Surcharge[] = selectedRate
          ? (Array.isArray(selectedRate.surcharges)
              ? selectedRate.surcharges
              : []) as Surcharge[]
          : [];
        const surchargeTotal = surcharges.reduce((sum, s) => sum + s.amount, 0);

        return {
          carrier,
          carrierName: CARRIERS[carrier] || carrier,
          rates: carrierRates,
          lowestTotal: selectedRate
            ? selectedRate.base_rate + surchargeTotal
            : 0,
          transitDays: selectedRate?.transit_days ?? null,
          validFrom: selectedRate?.valid_from || "",
          validUntil: selectedRate?.valid_until || "",
        };
      })
      .filter((g) => g.lowestTotal > 0)
      .sort((a, b) => a.lowestTotal - b.lowestTotal);
  }, [rates, selectedContainer]);

  const sendBooking = useMutation({
    mutationFn: async (carrier: string) => {
      const { data, error } = await supabase.functions.invoke("edi-send", {
        body: { shipment_id: shipmentId, carrier, message_type: "IFTMIN" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Booking request sent to ${data.carrier?.toUpperCase() || "carrier"}`,
        { description: `Reference: ${data.message_ref}` }
      );
      setSelectedCarrierForBooking("");
      queryClient.invalidateQueries({ queryKey: ["edi-bookings", shipmentId] });
    },
    onError: (error) => {
      toast.error("Failed to send booking", { description: error.message });
    },
  });

  const handleBook = (carrierId: string) => {
    setSelectedCarrierForBooking(carrierId);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    sendBooking.mutate(selectedCarrierForBooking);
  };

  const carrierName = (id: string) => CARRIERS[id] || id;

  const getSurcharges = (group: CarrierGroup): Surcharge[] => {
    const rate = group.rates.find((r) => r.container_type === selectedContainer);
    if (!rate) return [];
    return Array.isArray(rate.surcharges) ? rate.surcharges as Surcharge[] : [];
  };

  const getBaseRate = (group: CarrierGroup): number => {
    const rate = group.rates.find((r) => r.container_type === selectedContainer);
    return rate?.base_rate || 0;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ship className="h-4 w-4 text-accent" />
          Carrier Rates & Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Container type filter */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Container Type
          </label>
          <Select value={selectedContainer} onValueChange={setSelectedContainer}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20GP">20' Standard (20GP)</SelectItem>
              <SelectItem value="40GP">40' Standard (40GP)</SelectItem>
              <SelectItem value="40HC">40' High Cube (40HC)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rate cards */}
        {ratesLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : carrierGroups.length === 0 ? (
          <div className="text-center py-4">
            <Anchor className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              No rates available for this route.
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Rates are updated monthly by shipping lines.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {carrierGroups.map((group, idx) => {
              const isExpanded = expandedCarrier === group.carrier;
              const surcharges = getSurcharges(group);
              const baseRate = getBaseRate(group);
              const isBooked = bookings.some(
                (b: any) => b.carrier === group.carrier
              );

              return (
                <Collapsible
                  key={group.carrier}
                  open={isExpanded}
                  onOpenChange={() =>
                    setExpandedCarrier(isExpanded ? null : group.carrier)
                  }
                >
                  <div
                    className={`border rounded-lg transition-all ${
                      idx === 0
                        ? "border-accent/40 bg-accent/5"
                        : "border-border"
                    }`}
                  >
                    <CollapsibleTrigger className="w-full p-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {group.carrierName}
                              </span>
                              {idx === 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] border-accent/40 text-accent bg-accent/10"
                                >
                                  Best Rate
                                </Badge>
                              )}
                              {isBooked && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] border-green-500/40 text-green-600"
                                >
                                  Booked
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Timer className="h-3 w-3" />
                                {group.transitDays
                                  ? `${group.transitDays} days`
                                  : "—"}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <CalendarDays className="h-3 w-3" />
                                Valid until{" "}
                                {group.validUntil
                                  ? format(
                                      new Date(group.validUntil),
                                      "MMM d, yyyy"
                                    )
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-base font-bold text-foreground">
                              ${group.lowestTotal.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              per {CONTAINER_LABELS[selectedContainer] || selectedContainer}
                            </p>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-3">
                        <Separator />

                        {/* Rate breakdown */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Rate Breakdown
                          </p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Ocean Freight
                              </span>
                              <span className="font-medium text-foreground">
                                ${baseRate.toLocaleString()}
                              </span>
                            </div>
                            {surcharges.map((s, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-muted-foreground">
                                  {s.name}
                                </span>
                                <span className="text-foreground">
                                  ${s.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                            <Separator className="my-1" />
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-foreground">Total</span>
                              <span className="text-foreground">
                                ${group.lowestTotal.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Available container types */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            All Container Options
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {group.rates.map((rate) => {
                              const rateSurcharges = Array.isArray(
                                rate.surcharges
                              )
                                ? (rate.surcharges as Surcharge[])
                                : [];
                              const total =
                                rate.base_rate +
                                rateSurcharges.reduce(
                                  (sum, s) => sum + s.amount,
                                  0
                                );
                              const isSelected =
                                rate.container_type === selectedContainer;
                              return (
                                <div
                                  key={rate.id}
                                  className={`rounded p-1.5 text-center border ${
                                    isSelected
                                      ? "border-accent bg-accent/10"
                                      : "border-border"
                                  }`}
                                >
                                  <p className="text-[10px] font-medium text-foreground">
                                    {rate.container_type}
                                  </p>
                                  <p className="text-xs font-bold text-foreground">
                                    ${total.toLocaleString()}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Book button */}
                        <Button
                          variant="electric"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBook(group.carrier);
                          }}
                          disabled={sendBooking.isPending || isBooked}
                        >
                          {isBooked ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              Booking Sent
                            </>
                          ) : sendBooking.isPending &&
                            selectedCarrierForBooking === group.carrier ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Ship className="h-3.5 w-3.5 mr-1.5" />
                              Book with {group.carrierName}
                            </>
                          )}
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Booking history */}
        {bookings.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Booking History
            </p>
            {bookings.map((b: any) => {
              const config = statusConfig[b.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon
                      className={`h-3.5 w-3.5 ${config.className}`}
                    />
                    <span className="text-sm font-medium">
                      {carrierName(b.carrier)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {b.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(b.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send booking request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a booking request for shipment{" "}
              <span className="font-semibold text-foreground">
                {shipmentRef}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {carrierName(selectedCarrierForBooking)}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Send Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
