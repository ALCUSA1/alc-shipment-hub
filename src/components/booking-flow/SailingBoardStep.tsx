import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Ship, Clock, ArrowLeft, ArrowRight, Sparkles, TrendingDown, Zap, Shield, Calendar, Anchor } from "lucide-react";
import { format } from "date-fns";
import type { SailingOption, SearchParams } from "@/pages/BookingFlow";

const PORT_NAMES: Record<string, string> = {
  USLAX: "Los Angeles", USLGB: "Long Beach", USNYC: "New York", USHOU: "Houston",
  USSAV: "Savannah", CNSHA: "Shanghai", CNSZX: "Shenzhen", CNTAO: "Qingdao",
  CNNGB: "Ningbo", HKHKG: "Hong Kong", JPYOK: "Yokohama", KRPUS: "Busan",
  SGSIN: "Singapore", DEHAM: "Hamburg", NLRTM: "Rotterdam", BEANR: "Antwerp",
  GBFXT: "Felixstowe", FRLEH: "Le Havre", AEJEA: "Jebel Ali",
  INBOM: "Mumbai", INNSA: "Nhava Sheva", BRSSZ: "Santos",
};

function portName(code: string) { return PORT_NAMES[code] || code; }

const AI_BADGE_STYLES: Record<string, { bg: string; icon: any }> = {
  "Best Value": { bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: TrendingDown },
  "Fastest": { bg: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Zap },
  "Premium Service": { bg: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: Shield },
};

interface SailingBoardStepProps {
  options: SailingOption[];
  searchParams: SearchParams;
  onSelect: (option: SailingOption) => void;
  onBack: () => void;
}

export function SailingBoardStep({ options, searchParams, onSelect, onBack }: SailingBoardStepProps) {
  if (options.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Modify Search
        </Button>
        <div className="text-center py-20">
          <Ship className="h-14 w-14 text-muted-foreground/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No sailings found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            No carrier options available for {portName(searchParams.origin)} → {portName(searchParams.destination)}. Try adjusting your search.
          </p>
        </div>
      </div>
    );
  }

  const bestPrice = Math.min(...options.map(o => o.total_rate));
  const fastestTransit = Math.min(...options.filter(o => o.transit_days).map(o => o.transit_days!));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Button variant="ghost" onClick={onBack} className="gap-1 mb-2 -ml-3">
            <ArrowLeft className="h-4 w-4" /> Modify Search
          </Button>
          <h2 className="text-2xl font-bold text-foreground">
            {portName(searchParams.origin)} → {portName(searchParams.destination)}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {options.length} sailing option{options.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex gap-3">
          <div className="text-center px-4 py-2 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-[10px] text-muted-foreground uppercase">From</p>
            <p className="text-lg font-bold text-accent">${bestPrice.toLocaleString()}</p>
          </div>
          {fastestTransit < Infinity && (
            <div className="text-center px-4 py-2 rounded-lg bg-secondary border">
              <p className="text-[10px] text-muted-foreground uppercase">Fastest</p>
              <p className="text-lg font-bold text-foreground">{fastestTransit}d</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Recommendation Banner */}
      <div className="rounded-xl bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 border border-accent/20 p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-accent mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">AI Recommendation</p>
          <p className="text-sm text-muted-foreground">
            Based on your route, cargo type, and current market conditions, we've ranked these options by overall value.
            The <span className="font-medium text-emerald-600">Best Value</span> option balances cost and reliability.
          </p>
        </div>
      </div>

      {/* Timeline Cards */}
      <div className="space-y-3">
        {options.map((option, idx) => {
          const aiBadge = option.ai_label ? AI_BADGE_STYLES[option.ai_label] : null;
          const AiIcon = aiBadge?.icon || Sparkles;
          const etdDate = option.etd ? new Date(option.etd) : null;
          const etaDate = option.eta ? new Date(option.eta) : null;

          return (
            <Card
              key={option.id}
              className={`transition-all hover:shadow-md hover:border-accent/30 ${
                idx === 0 ? "border-accent/30 shadow-sm" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Carrier & AI Badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Anchor className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{option.carrier}</span>
                      {option.ai_label && aiBadge && (
                        <Badge variant="outline" className={`gap-1 text-[10px] ${aiBadge.bg}`}>
                          <AiIcon className="h-3 w-3" />
                          {option.ai_label}
                        </Badge>
                      )}
                      {option.service_level && (
                        <Badge variant="secondary" className="text-[10px]">{option.service_level}</Badge>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">ETD</p>
                        <p className="font-medium text-foreground">
                          {etdDate ? format(etdDate, "MMM d") : "TBD"}
                        </p>
                      </div>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-accent" />
                        <div className="flex-1 h-px bg-border relative">
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
                            {option.transit_days ? `${option.transit_days} days` : "—"}
                          </span>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-accent" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">ETA</p>
                        <p className="font-medium text-foreground">
                          {etaDate ? format(etaDate, "MMM d") : "TBD"}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {option.free_time_days && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {option.free_time_days}d free time
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Ship className="h-3 w-3" />
                        {option.container_type}
                      </span>
                      {option.availability && (
                        <Badge variant={option.availability === "High" ? "default" : option.availability === "Medium" ? "secondary" : "destructive"} className="text-[10px]">
                          {option.availability} Availability
                        </Badge>
                      )}
                    </div>

                    {option.ai_reason && (
                      <p className="text-xs text-accent mt-2 italic">💡 {option.ai_reason}</p>
                    )}
                  </div>

                  {/* Price & Select */}
                  <div className="flex items-center gap-4 lg:flex-col lg:items-end">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        ${option.total_rate.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{option.currency} / container</p>
                    </div>
                    <Button
                      variant={idx === 0 ? "electric" : "outline"}
                      onClick={() => onSelect(option)}
                      className="whitespace-nowrap"
                    >
                      Select Sailing
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
