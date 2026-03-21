import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Ship, Clock, ChevronDown, ChevronUp, ArrowRight, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";
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
  rate_basis_type: string | null;
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

function getTotalRate(rate: CarrierRate) {
  const surcharges = parseSurcharges(rate.surcharges);
  return rate.base_rate + surcharges.reduce((sum, s) => sum + s.amount, 0);
}

interface RateResultsPanelProps {
  rates: CarrierRate[];
  origin: string;
  destination: string;
  containerSize: string;
}

export function RateResultsPanel({ rates, origin, destination, containerSize }: RateResultsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (rates.length === 0) {
    return (
      <div className="text-center py-16">
        <Ship className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No rates found</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          No carrier rates are available for {origin} → {destination} with {containerSize} containers. Try a different route or container type.
        </p>
      </div>
    );
  }

  const sorted = [...rates].sort((a, b) => getTotalRate(a) - getTotalRate(b));
  const bestRate = getTotalRate(sorted[0]);
  const highRate = getTotalRate(sorted[sorted.length - 1]);

  // Group surcharges into origin/destination/freight categories
  function categorizeSurcharges(surcharges: Surcharge[]) {
    const origin: Surcharge[] = [];
    const destination: Surcharge[] = [];
    const freight: Surcharge[] = [];

    surcharges.forEach((s) => {
      const code = s.code.toLowerCase();
      if (code.includes("origin") || code === "thc_origin" || code === "doc") {
        origin.push(s);
      } else if (code.includes("dest") || code === "thc_dest" || code === "do") {
        destination.push(s);
      } else {
        freight.push(s);
      }
    });

    return { origin, destination, freight };
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-accent/5 border border-accent/20">
        <div>
          <p className="text-sm text-muted-foreground">
            {sorted.length} carrier{sorted.length !== 1 ? "s" : ""} found for
          </p>
          <p className="text-lg font-bold text-foreground">
            {origin} <ArrowRight className="inline h-4 w-4 mx-1" /> {destination}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Estimated range</p>
          <p className="text-2xl font-bold text-accent">
            ${bestRate.toLocaleString()} — ${highRate.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">per container</p>
        </div>
      </div>

      {/* Rate cards */}
      <div className="space-y-3">
        {sorted.map((rate, index) => {
          const surcharges = parseSurcharges(rate.surcharges);
          const totalRate = getTotalRate(rate);
          const isBest = index === 0;
          const isExpanded = expandedId === rate.id;
          const categories = categorizeSurcharges(surcharges);

          return (
            <Card key={rate.id} className={`transition-all hover:shadow-md ${isBest ? "border-accent/40 shadow-sm" : ""}`}>
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{rate.carrier}</h3>
                      {isBest && (
                        <Badge className="bg-accent text-accent-foreground text-[10px]">
                          <TrendingDown className="h-3 w-3 mr-0.5" />
                          Best Rate
                        </Badge>
                      )}
                      {rate.rate_basis_type === "contract" && (
                        <Badge variant="outline" className="text-[10px]">Contract</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      {rate.transit_days && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {rate.transit_days} days transit
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Valid {format(new Date(rate.valid_from), "MMM d")} — {format(new Date(rate.valid_until), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">${totalRate.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{rate.currency} / container</p>
                  </div>
                </div>

                {/* Cost breakdown toggle */}
                <button
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 mt-3 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : rate.id)}
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  View cost breakdown
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t space-y-3">
                    {/* Base Freight */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">FCL Freight</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base ocean freight</span>
                        <span className="font-mono font-medium">${rate.base_rate.toLocaleString()}</span>
                      </div>
                      {categories.freight.map((s, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{s.description || s.code}</span>
                          <span className="font-mono">${s.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    {/* Origin charges */}
                    {categories.origin.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Origin Local</p>
                        {categories.origin.map((s, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{s.description || s.code}</span>
                            <span className="font-mono">${s.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Destination charges */}
                    {categories.destination.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Destination Local</p>
                        {categories.destination.map((s, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{s.description || s.code}</span>
                            <span className="font-mono">${s.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator />
                    <div className="flex justify-between text-sm font-bold">
                      <span>Total All-In</span>
                      <span className="font-mono">${totalRate.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Book CTA */}
                <div className="flex justify-end mt-3">
                  <Button variant="electric" size="sm" asChild>
                    <Link to="/signup">
                      Book Now
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
