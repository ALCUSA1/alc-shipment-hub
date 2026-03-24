import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, TrendingDown, Activity, Target,
  Users, Zap, ArrowUp, ArrowDown, Minus, Eye, ShieldCheck,
  AlertTriangle, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

type PromoStrength = "none" | "mild" | "moderate" | "strong";
type RateClassification = "promo" | "market" | "expensive";
type Competition = "high" | "moderate" | "low";
type Sensitivity = "high" | "medium" | "low";

interface Props {
  carrierBuyRate: number;
  shipmentType: string;
  customerType: string;
  origin: string;
  destination: string;
  tradeLane?: string;
}

export function RateIntelligencePanel({ carrierBuyRate, shipmentType, customerType, origin, destination, tradeLane }: Props) {
  const [expanded, setExpanded] = useState(false);

  const intel = useMemo(() => {
    if (carrierBuyRate <= 0) return null;

    // ── Rate Benchmarking ──
    // Simulated historical data per shipment type
    const histAvgMultiplier: Record<string, number> = { fcl: 1.18, lcl: 1.12, air: 1.15, trucking: 1.10 };
    const histAvg = carrierBuyRate * (histAvgMultiplier[shipmentType.toLowerCase()] ?? 1.15);
    const histMin = histAvg * 0.82;
    const histMax = histAvg * 1.25;
    const diffPct = ((carrierBuyRate - histAvg) / histAvg) * 100;

    let rateClass: RateClassification = "market";
    if (diffPct <= -10) rateClass = "promo";
    else if (diffPct >= 10) rateClass = "expensive";

    // ── Promo Detection ──
    let promoStrength: PromoStrength = "none";
    if (diffPct <= -30) promoStrength = "strong";
    else if (diffPct <= -20) promoStrength = "moderate";
    else if (diffPct <= -10) promoStrength = "mild";
    const promoDetected = promoStrength !== "none";
    const promoSavings = promoDetected ? histAvg - carrierBuyRate : 0;

    // ── Lane Competitiveness ──
    // Simulated based on common lanes
    const competitiveLanes = ["asia-uswc", "asia-usec", "asia-eur"];
    const laneKey = (tradeLane || `${origin}-${destination}`).toLowerCase().replace(/\s/g, "");
    const isCompetitiveLane = competitiveLanes.some(l => laneKey.includes(l.replace("-", "")));
    const competition: Competition = isCompetitiveLane ? "high" : shipmentType === "air" ? "moderate" : "low";

    // Simulated lane metrics
    const laneWinRate = competition === "high" ? 42 : competition === "moderate" ? 58 : 71;
    const laneAvgMargin = competition === "high" ? 7.2 : competition === "moderate" ? 10.5 : 13.8;
    const laneQuoteVol = competition === "high" ? 145 : competition === "moderate" ? 82 : 34;
    const optimalMarginLow = competition === "high" ? 6 : competition === "moderate" ? 8 : 10;
    const optimalMarginHigh = competition === "high" ? 10 : competition === "moderate" ? 13 : 16;

    // ── Customer Sensitivity ──
    const sensitivityMap: Record<string, Sensitivity> = {
      new: "medium", existing: "medium", high_volume: "high", strategic: "low",
    };
    const sensitivity: Sensitivity = sensitivityMap[customerType] ?? "medium";
    const custWinRate = sensitivity === "high" ? 38 : sensitivity === "medium" ? 55 : 72;
    const custAvgMargin = sensitivity === "high" ? 6.8 : sensitivity === "medium" ? 9.5 : 14.2;

    // ── Win/Loss Insights ──
    const winMarginRange = { low: optimalMarginLow, high: optimalMarginHigh };
    const lossThreshold = optimalMarginHigh + 3;

    // ── Suggested Strategy ──
    const suggestions: string[] = [];
    if (promoDetected && competition === "high") {
      suggestions.push("Partial savings pass-through recommended to improve win rate on competitive lane.");
    } else if (promoDetected && competition === "low") {
      suggestions.push("Retain most promo savings — low competition allows margin expansion.");
    } else if (promoDetected) {
      suggestions.push("Balanced approach: retain 60% of promo savings, pass 40% to improve competitiveness.");
    }

    if (sensitivity === "high") {
      suggestions.push("Customer is price-sensitive — consider competitive pricing to secure the deal.");
    } else if (sensitivity === "low") {
      suggestions.push("Customer is value-driven — margin can be maintained or expanded.");
    }

    if (rateClass === "expensive") {
      suggestions.push("Rate is above market — verify carrier pricing or consider alternatives.");
    }

    if (suggestions.length === 0) {
      suggestions.push("Standard market conditions — follow default margin rules.");
    }

    // ── Risk Level ──
    const riskScore = (rateClass === "expensive" ? 30 : 0)
      + (competition === "high" ? 20 : 0)
      + (sensitivity === "high" ? 15 : 0)
      + (promoStrength === "none" && competition === "high" ? 10 : 0);
    const riskLevel = riskScore >= 40 ? "high" : riskScore >= 20 ? "medium" : "low";

    return {
      histAvg, histMin, histMax, diffPct, rateClass,
      promoDetected, promoStrength, promoSavings,
      competition, laneWinRate, laneAvgMargin, laneQuoteVol,
      sensitivity, custWinRate, custAvgMargin,
      winMarginRange, lossThreshold,
      optimalMarginLow, optimalMarginHigh,
      suggestions, riskLevel,
    };
  }, [carrierBuyRate, shipmentType, customerType, origin, destination, tradeLane]);

  if (!intel) return null;

  const classColors: Record<RateClassification, string> = {
    promo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    market: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    expensive: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const classLabels: Record<RateClassification, string> = {
    promo: "Promo Opportunity", market: "Market Rate", expensive: "High Cost Risk",
  };
  const promoColors: Record<PromoStrength, string> = {
    none: "", mild: "text-emerald-400", moderate: "text-emerald-500", strong: "text-emerald-500",
  };
  const compColors: Record<Competition, string> = {
    high: "text-red-400", moderate: "text-amber-400", low: "text-emerald-400",
  };
  const sensColors: Record<Sensitivity, string> = {
    high: "text-red-400", medium: "text-amber-400", low: "text-emerald-400",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-foreground">Rate Intelligence</h3>
        </div>
        <Badge className={`${classColors[intel.rateClass]} text-[10px]`}>
          {classLabels[intel.rateClass]}
        </Badge>
      </div>

      {/* Benchmark Card */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase">Current</p>
            <p className="text-sm font-bold text-foreground">{fmt(carrierBuyRate)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase">Market Avg</p>
            <p className="text-sm font-bold text-muted-foreground">{fmt(intel.histAvg)}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase">Difference</p>
            <p className={`text-sm font-bold flex items-center justify-center gap-0.5 ${intel.diffPct <= 0 ? "text-emerald-500" : "text-red-400"}`}>
              {intel.diffPct <= -1 ? <ArrowDown className="h-3 w-3" /> : intel.diffPct >= 1 ? <ArrowUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {fmtPct(Math.abs(intel.diffPct))}
            </p>
          </div>
        </div>
        {/* Range bar */}
        <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
          <div className="absolute inset-y-0 bg-blue-500/30 rounded-full" style={{
            left: `${Math.max(0, ((intel.histMin - intel.histMin) / (intel.histMax - intel.histMin)) * 100)}%`,
            width: "100%",
          }} />
          <div
            className={`absolute top-0 w-1.5 h-2 rounded-full ${intel.rateClass === "promo" ? "bg-emerald-500" : intel.rateClass === "expensive" ? "bg-red-400" : "bg-blue-400"}`}
            style={{ left: `${Math.max(0, Math.min(100, ((carrierBuyRate - intel.histMin) / (intel.histMax - intel.histMin)) * 100))}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>{fmt(intel.histMin)}</span>
          <span>{fmt(intel.histMax)}</span>
        </div>
      </div>

      {/* Promo Detection */}
      {intel.promoDetected && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">Promo Detected</span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] capitalize">{intel.promoStrength}</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Carrier rate is {fmtPct(Math.abs(intel.diffPct))} below historical average — potential savings of {fmt(intel.promoSavings)}
          </p>
        </div>
      )}

      {/* Quick metrics row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card p-2 text-center">
          <p className="text-[9px] text-muted-foreground">Lane</p>
          <p className={`text-xs font-semibold capitalize ${compColors[intel.competition]}`}>{intel.competition}</p>
          <p className="text-[9px] text-muted-foreground">competition</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2 text-center">
          <p className="text-[9px] text-muted-foreground">Customer</p>
          <p className={`text-xs font-semibold capitalize ${sensColors[intel.sensitivity]}`}>{intel.sensitivity}</p>
          <p className="text-[9px] text-muted-foreground">sensitivity</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2 text-center">
          <p className="text-[9px] text-muted-foreground">Risk</p>
          <p className={`text-xs font-semibold capitalize ${intel.riskLevel === "high" ? "text-red-400" : intel.riskLevel === "medium" ? "text-amber-400" : "text-emerald-400"}`}>
            {intel.riskLevel}
          </p>
          <p className="text-[9px] text-muted-foreground">level</p>
        </div>
      </div>

      {/* Expandable Details */}
      <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
        {expanded ? "Less Details" : "Lane & Win/Loss Analysis"}
      </Button>

      {expanded && (
        <div className="space-y-3">
          {/* Lane Metrics */}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Lane Performance</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">{fmtPct(intel.laneWinRate)}</p>
                <p className="text-[9px] text-muted-foreground">Win Rate</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{fmtPct(intel.laneAvgMargin)}</p>
                <p className="text-[9px] text-muted-foreground">Avg Margin</p>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{intel.laneQuoteVol}</p>
                <p className="text-[9px] text-muted-foreground">Quotes (90d)</p>
              </div>
            </div>
          </div>

          {/* Win/Loss Insights */}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Win/Loss Insights</p>
            <div className="space-y-1.5 text-[11px]">
              <p className="text-muted-foreground">
                <span className="text-emerald-400">●</span> Optimal margin range: <span className="font-semibold text-foreground">{intel.optimalMarginLow}%–{intel.optimalMarginHigh}%</span>
              </p>
              <p className="text-muted-foreground">
                <span className="text-red-400">●</span> Deals above <span className="font-semibold text-foreground">{intel.lossThreshold}%</span> margin are frequently lost
              </p>
              <p className="text-muted-foreground">
                <span className="text-blue-400">●</span> Customer win rate: <span className="font-semibold text-foreground">{fmtPct(intel.custWinRate)}</span> at avg margin <span className="font-semibold text-foreground">{fmtPct(intel.custAvgMargin)}</span>
              </p>
            </div>
          </div>

          {/* Suggested Margin Range */}
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Suggested Margin Range</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 rounded-full bg-secondary relative overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-emerald-500/40 rounded-full"
                  style={{
                    left: `${(intel.optimalMarginLow / 25) * 100}%`,
                    width: `${((intel.optimalMarginHigh - intel.optimalMarginLow) / 25) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                {intel.optimalMarginLow}% – {intel.optimalMarginHigh}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Suggestions */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Intelligence Summary</p>
        <div className="space-y-1">
          {intel.suggestions.map((s, i) => (
            <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <span className="text-cyan-400 mt-0.5">•</span> {s}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
