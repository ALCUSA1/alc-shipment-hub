import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Ship, Clock, ChevronDown, ChevronUp, ArrowRight, TrendingDown, Zap, Anchor, Container, Info } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Link } from "react-router-dom";
import { RouteMapPreview } from "./RouteMapPreview";
import { CargoSummaryBar } from "./CargoSummaryBar";
import { SailingScheduleSelector } from "./SailingScheduleSelector";
import { ShippingPreferences, type ShippingFilters } from "./ShippingPreferences";
import { PriceSummarySidebar } from "./PriceSummarySidebar";
import type { Json } from "@/integrations/supabase/types";

const PORT_NAMES: Record<string, string> = {
  USLAX: "Los Angeles", USLGB: "Long Beach", USNYC: "New York",
  USHOU: "Houston", USSAV: "Savannah", USCHI: "Chicago",
  CNSHA: "Shanghai", CNSGH: "Shanghai", CNSZX: "Shenzhen",
  CNTAO: "Qingdao", CNNGB: "Ningbo", CNYTN: "Yantian",
  HKHKG: "Hong Kong", JPYOK: "Yokohama", JPTYO: "Tokyo",
  KRPUS: "Busan", SGSIN: "Singapore", TWKHH: "Kaohsiung",
  VNSGN: "Ho Chi Minh", THLCH: "Laem Chabang", MYKG: "Klang",
  INBOM: "Mumbai", INNSA: "Nhava Sheva", INJNPT: "Jawaharlal Nehru",
  LKCMB: "Colombo", AEJEA: "Jebel Ali", AEAUH: "Abu Dhabi",
  DEHAM: "Hamburg", NLRTM: "Rotterdam", BEANR: "Antwerp",
  GBFXT: "Felixstowe", GBLGP: "Liverpool", FRLEH: "Le Havre",
  ESALG: "Algeciras", ESVLC: "Valencia", ITGOA: "Genoa",
  GRPIR: "Piraeus", TRIST: "Istanbul", EGPSD: "Port Said",
  BRSSZ: "Santos", BRSUA: "Suape", ARBUE: "Buenos Aires",
  CLVAP: "Valparaiso", MXZLO: "Manzanillo", MXLZC: "Lazaro Cardenas",
  PAMIT: "Manzanillo (Panama)", COBUN: "Buenaventura",
  AUSYD: "Sydney", AUMEL: "Melbourne", NZAKL: "Auckland",
  ZADUR: "Durban", ZAELS: "Elizabeth", PKQCT: "Karachi", BDCGP: "Chittagong",
};

function getPortDisplay(code: string) {
  return PORT_NAMES[code] || code;
}

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

function categorizeSurcharges(surcharges: Surcharge[]) {
  const origin: Surcharge[] = [];
  const destination: Surcharge[] = [];
  const freight: Surcharge[] = [];
  surcharges.forEach((s) => {
    const code = s.code.toLowerCase();
    if (code.includes("origin") || code === "thc_origin" || code === "doc") origin.push(s);
    else if (code.includes("dest") || code === "thc_dest" || code === "do") destination.push(s);
    else freight.push(s);
  });
  return { origin, destination, freight };
}

const CONTAINER_LABELS: Record<string, string> = {
  "20gp": "20ft Standard",
  "40gp": "40ft Standard",
  "40hc": "40ft High Cube",
  "45hc": "45ft High Cube",
};

interface RateResultsPanelProps {
  rates: CarrierRate[];
  origin: string;
  destination: string;
  containerSize: string;
  mode?: string;
}

function buildBookingLink(origin: string, destination: string, containerSize: string, mode?: string) {
  const params = new URLSearchParams();
  if (origin) params.set("origin", origin);
  if (destination) params.set("destination", destination);
  if (containerSize) params.set("container", containerSize);
  if (mode) params.set("mode", mode);
  return `/dashboard/shipments/new?${params.toString()}`;
}

export function RateResultsPanel({ rates, origin, destination, containerSize, mode }: RateResultsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ShippingFilters>({
    routing: "all",
    carrierType: "all",
    rateType: "all",
  });

  if (rates.length === 0) {
    return (
      <div className="text-center py-16">
        <Ship className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No rates found</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          No carrier rates are available for {getPortDisplay(origin)} → {getPortDisplay(destination)} with {CONTAINER_LABELS[containerSize] || containerSize} containers. Try a different route or container type.
        </p>
      </div>
    );
  }

  // Apply filters
  let filtered = [...rates];
  if (filters.rateType === "spot") {
    filtered = filtered.filter((r) => r.rate_basis_type === "spot" || !r.rate_basis_type);
  } else if (filters.rateType === "contract") {
    filtered = filtered.filter((r) => r.rate_basis_type === "contract");
  }

  const sorted = filtered.sort((a, b) => getTotalRate(a) - getTotalRate(b));
  const bestRate = sorted.length > 0 ? getTotalRate(sorted[0]) : 0;
  const highRate = sorted.length > 0 ? getTotalRate(sorted[sorted.length - 1]) : 0;
  const transitRates = sorted.filter((r) => r.transit_days);
  const avgTransit = transitRates.length > 0
    ? Math.round(transitRates.reduce((s, r) => s + (r.transit_days || 0), 0) / transitRates.length)
    : null;

  const selectedRate = selectedRateId ? sorted.find((r) => r.id === selectedRateId) || sorted[0] : sorted[0];

  return (
    <div className="space-y-5">
      {/* Route Map */}
      <RouteMapPreview originCode={origin} destinationCode={destination} />

      {/* Summary Header */}
      <div className="p-5 rounded-xl bg-accent/5 border border-accent/20 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {sorted.length} carrier{sorted.length !== 1 ? "s" : ""} found
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {getPortDisplay(origin)} <span className="text-muted-foreground text-sm font-normal">({origin})</span>
              <ArrowRight className="inline h-5 w-5 mx-2 text-accent" />
              {getPortDisplay(destination)} <span className="text-muted-foreground text-sm font-normal">({destination})</span>
            </h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Estimated range</p>
            <p className="text-2xl font-bold text-accent">
              ${bestRate.toLocaleString()} — ${highRate.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">per container</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 text-xs">
            <Anchor className="h-3 w-3" />
            Ocean Freight — FCL
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Container className="h-3 w-3" />
            {CONTAINER_LABELS[containerSize] || containerSize}
          </Badge>
          {avgTransit && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Avg Transit: {avgTransit} Days
            </Badge>
          )}
        </div>
      </div>

      {/* Cargo Summary Bar */}
      <CargoSummaryBar containerSize={containerSize} />

      {/* Sailing Schedule */}
      <SailingScheduleSelector avgTransitDays={avgTransit} />

      {/* Shipping Preferences */}
      <ShippingPreferences filters={filters} onChange={setFilters} />

      {/* 2-column: Rate cards + Sticky sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Rate cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Choose your shipment quote
          </h3>

          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No rates match your preferences. Try adjusting the filters above.</p>
          ) : (
            sorted.map((rate, index) => {
              const surcharges = parseSurcharges(rate.surcharges);
              const totalRate = getTotalRate(rate);
              const isBest = index === 0;
              const isExpanded = expandedId === rate.id;
              const categories = categorizeSurcharges(surcharges);
              const isSpot = rate.rate_basis_type === "spot" || !rate.rate_basis_type;
              const isSelected = selectedRate?.id === rate.id;

              return (
                <Card
                  key={rate.id}
                  className={`transition-all hover:shadow-md cursor-pointer ${isSelected ? "border-accent ring-1 ring-accent/30 shadow-sm" : isBest ? "border-accent/40 shadow-sm" : ""}`}
                  onClick={() => setSelectedRateId(rate.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{rate.carrier}</h3>
                          {isBest && (
                            <Badge className="bg-accent text-accent-foreground text-[10px]">
                              <TrendingDown className="h-3 w-3 mr-0.5" />
                              Best Rate
                            </Badge>
                          )}
                          {isSpot && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5">
                              <Zap className="h-3 w-3" />
                              Spot Rate
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

                    <button
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 mt-3 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : rate.id); }}
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      View cost breakdown
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-3">
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

                    <div className="flex justify-end mt-3">
                      <Button variant="electric" size="sm" asChild>
                        <Link to={buildBookingLink(origin, destination, containerSize, mode)}>
                          Book Now
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Sticky Price Sidebar — hidden on mobile */}
        <div className="hidden lg:block">
          <PriceSummarySidebar selectedRate={selectedRate || null} containerSize={containerSize} origin={origin} destination={destination} mode={mode} />
        </div>
      </div>

      {/* Trust & Disclaimer Footer */}
      <div className="rounded-lg bg-muted/50 border px-4 py-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>
          Total cost may vary based on actual weight, dimensions, and applicable taxes or duties.
          Local charges are estimates and subject to carrier confirmation.
          <span className="text-accent font-medium ml-1">Looking for savings? Apply coupons in the next step.</span>
        </p>
      </div>
    </div>
  );
}
