import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plane, Check, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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

interface AirRate {
  id: string;
  carrier: string;
  origin_port: string;
  destination_port: string;
  container_type: string; // used as weight_break for air
  base_rate: number;
  currency: string;
  transit_days: number | null;
  valid_from: string;
  valid_until: string;
  surcharges: Json;
  notes: string | null;
}

function parseSurcharges(surcharges: Json): Surcharge[] {
  if (!Array.isArray(surcharges)) return [];
  return surcharges
    .filter((s) => typeof s === "object" && s !== null && "code" in s && "amount" in s)
    .map((s) => {
      const obj = s as Record<string, Json>;
      return { code: String(obj.code ?? ""), description: String(obj.description ?? ""), amount: Number(obj.amount ?? 0) };
    });
}

function getTotalRate(rate: AirRate) {
  const surcharges = parseSurcharges(rate.surcharges);
  return rate.base_rate + surcharges.reduce((sum, s) => sum + s.amount, 0);
}

interface AirlineRateSelectorProps {
  shipmentId: string;
  shipmentRef: string;
  originAirport: string | null;
  destinationAirport: string | null;
}

export function AirlineRateSelector({ shipmentId, shipmentRef, originAirport, destinationAirport }: AirlineRateSelectorProps) {
  const queryClient = useQueryClient();
  const [selectedRate, setSelectedRate] = useState<AirRate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["air-rates", originAirport, destinationAirport],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase
        .from("carrier_rates")
        .select("*")
        .eq("mode", "air")
        .gte("valid_until", today)
        .order("base_rate", { ascending: true });

      if (originAirport) query = query.eq("origin_port", originAirport);
      if (destinationAirport) query = query.eq("destination_port", destinationAirport);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AirRate[];
    },
    enabled: !!(originAirport && destinationAirport),
  });

  const handleBook = async () => {
    if (!selectedRate) return;
    setBooking(true);
    try {
      const { error } = await supabase.from("shipments").update({
        airline: selectedRate.carrier,
        carrier: selectedRate.carrier,
      }).eq("id", shipmentId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      toast({ title: "Airline Selected", description: `${selectedRate.carrier} selected at $${getTotalRate(selectedRate).toLocaleString()}/kg` });
      setSelectedRate(null);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  const bestRateId = rates.length > 0
    ? rates.reduce((best, r) => (getTotalRate(r) < getTotalRate(best) ? r : best), rates[0]).id
    : null;

  if (!originAirport || !destinationAirport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="h-4 w-4 text-accent" />
            Airline Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>Origin and destination airports are required to view airline rates.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plane className="h-4 w-4 text-accent" />
          Airline Rates
        </CardTitle>
        <CardDescription>{originAirport} → {destinationAirport}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : rates.length === 0 ? (
          <div className="text-center py-6">
            <Plane className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No air rates available for this route.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Rates will appear once configured for this lane.</p>
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
                    isSelected ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                  }`}
                  onClick={() => setSelectedRate(rate)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                        isSelected ? "border-accent bg-accent" : "border-muted-foreground/30"
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-accent-foreground" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{rate.carrier}</span>
                          {isBest && <Badge variant="default" className="text-[10px] bg-accent text-accent-foreground">Best Rate</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {rate.transit_days && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rate.transit_days}h transit
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {rate.container_type} rate
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">${totalRate.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{rate.currency}/kg all-in</p>
                    </div>
                  </div>

                  {surcharges.length > 0 && (
                    <div className="mt-2">
                      <button
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : rate.id); }}
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        Rate breakdown
                      </button>
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Base rate/kg</span>
                            <span className="font-mono text-foreground">${rate.base_rate.toLocaleString()}</span>
                          </div>
                          {surcharges.map((s, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{s.code} — {s.description}</span>
                              <span className="font-mono text-foreground">${s.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <Separator className="my-1" />
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-foreground">Total/kg</span>
                            <span className="font-mono text-foreground">${totalRate.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Button variant="electric" className="w-full mt-2" disabled={!selectedRate || booking} onClick={handleBook}>
              <Plane className="h-4 w-4 mr-1" />
              {selectedRate
                ? `Select ${selectedRate.carrier} — $${getTotalRate(selectedRate).toLocaleString()}/kg`
                : "Select an airline rate"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
