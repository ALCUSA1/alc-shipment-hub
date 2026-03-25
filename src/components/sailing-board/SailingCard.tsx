import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Anchor, ArrowRight, Calendar, ChevronDown, ChevronUp,
  Ship, Sparkles, TrendingDown, Zap, Shield, Star, Award,
} from "lucide-react";
import { format } from "date-fns";
import type { ScoredSailing } from "./types";

const LABEL_CONFIG: Record<string, { bg: string; icon: any }> = {
  Recommended: { bg: "bg-accent/10 text-accent border-accent/20", icon: Sparkles },
  "Best Price": { bg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: TrendingDown },
  Fastest: { bg: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Zap },
  "Best Value": { bg: "bg-sky-500/10 text-sky-700 border-sky-500/20", icon: Star },
  "Reliable Option": { bg: "bg-violet-500/10 text-violet-700 border-violet-500/20", icon: Shield },
};

const PRICE_POS_LABEL: Record<string, { text: string; color: string }> = {
  below_market: { text: "Below Market", color: "text-emerald-600" },
  market: { text: "Market Rate", color: "text-muted-foreground" },
  above_market: { text: "Above Market", color: "text-amber-600" },
};

interface SailingCardProps {
  sailing: ScoredSailing;
  isTop: boolean;
  onSelect: () => void;
}

export function SailingCard({ sailing, isTop, onSelect }: SailingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const labelCfg = sailing.ai_label ? LABEL_CONFIG[sailing.ai_label] : null;
  const LabelIcon = labelCfg?.icon || Sparkles;
  const etd = sailing.etd ? new Date(sailing.etd) : null;
  const eta = sailing.eta ? new Date(sailing.eta) : null;
  const pricePos = PRICE_POS_LABEL[sailing.price_position];

  return (
    <Card className={`transition-all hover:shadow-md ${isTop ? "border-accent/40 shadow-sm ring-1 ring-accent/10" : "hover:border-accent/20"}`}>
      <CardContent className="p-0">
        {/* Main row */}
        <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Left: carrier info */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Carrier + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Anchor className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground">{sailing.carrier}</span>
              {sailing.ai_label && labelCfg && (
                <Badge variant="outline" className={`gap-1 text-[10px] ${labelCfg.bg}`}>
                  <LabelIcon className="h-3 w-3" />
                  {sailing.ai_label}
                </Badge>
              )}
              {sailing.service_level && (
                <Badge variant="secondary" className="text-[10px]">{sailing.service_level}</Badge>
              )}
            </div>

            {/* Timeline */}
            <div className="flex items-center gap-3 text-sm">
              <div className="text-center min-w-[52px]">
                <p className="text-[10px] text-muted-foreground uppercase">ETD</p>
                <p className="font-semibold text-foreground">{etd ? format(etd, "MMM d") : "TBD"}</p>
              </div>
              <div className="flex-1 flex items-center gap-1">
                <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                <div className="flex-1 h-px bg-border relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap font-medium">
                    {sailing.transit_days ? `${sailing.transit_days} days` : "—"}
                  </span>
                </div>
                <div className="h-2.5 w-2.5 rounded-full bg-accent" />
              </div>
              <div className="text-center min-w-[52px]">
                <p className="text-[10px] text-muted-foreground uppercase">ETA</p>
                <p className="font-semibold text-foreground">{eta ? format(eta, "MMM d") : "TBD"}</p>
              </div>
            </div>

            {/* Details row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {sailing.free_time_days && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {sailing.free_time_days}d free time
                </span>
              )}
              <span className="flex items-center gap-1">
                <Ship className="h-3 w-3" /> {sailing.container_type}
              </span>
              {sailing.availability && (
                <Badge
                  variant={sailing.availability === "High" ? "default" : sailing.availability === "Medium" ? "secondary" : "destructive"}
                  className="text-[10px]"
                >
                  {sailing.availability} Availability
                </Badge>
              )}
              {pricePos && (
                <span className={`font-medium ${pricePos.color}`}>{pricePos.text}</span>
              )}
            </div>

            {/* AI insight */}
            {sailing.ai_reason && (
              <p className="text-xs text-accent italic">💡 {sailing.ai_reason}</p>
            )}
          </div>

          {/* Right: price + action */}
          <div className="flex items-center gap-4 lg:flex-col lg:items-end shrink-0">
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground tabular-nums">${sailing.total_rate.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{sailing.currency} / container</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={isTop ? "electric" : "outline"} onClick={onSelect} className="whitespace-nowrap">
                Select Sailing <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t bg-secondary/30 p-5 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-accent" /> AI Score Breakdown
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { label: "Price", value: sailing.score_breakdown.price, max: 40 },
                { label: "Transit", value: sailing.score_breakdown.transit, max: 30 },
                { label: "Availability", value: sailing.score_breakdown.availability, max: 15 },
                { label: "Free Time", value: sailing.score_breakdown.free_time, max: 15 },
              ] as const).map(d => (
                <div key={d.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{d.label}</span>
                    <span className="font-semibold text-foreground">{d.value}/{d.max}</span>
                  </div>
                  <Progress value={(d.value / d.max) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <p className="text-sm font-medium text-foreground">Overall Sailing Score</p>
              <div className="flex items-center gap-2">
                <Progress value={sailing.sailing_score} className="h-2 w-24" />
                <span className="text-sm font-bold text-accent tabular-nums">{sailing.sailing_score}/100</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
