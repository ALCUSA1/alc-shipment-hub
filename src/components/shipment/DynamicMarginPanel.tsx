import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, AlertTriangle } from "lucide-react";

interface Props {
  shipmentType: string;
  carrierBuyRate: number;
  currentMargin: number;
}

// Simulated historical margin performance data
const MARGIN_BUCKETS: Record<string, { range: string; winRate: number; avgProfit: number; count: number }[]> = {
  fcl: [
    { range: "3–5%", winRate: 82, avgProfit: 95, count: 28 },
    { range: "5–7%", winRate: 74, avgProfit: 155, count: 42 },
    { range: "7–10%", winRate: 61, avgProfit: 245, count: 35 },
    { range: "10–12%", winRate: 43, avgProfit: 320, count: 18 },
    { range: "12%+", winRate: 28, avgProfit: 410, count: 9 },
  ],
  lcl: [
    { range: "8–12%", winRate: 78, avgProfit: 65, count: 22 },
    { range: "12–15%", winRate: 68, avgProfit: 105, count: 31 },
    { range: "15–18%", winRate: 55, avgProfit: 145, count: 25 },
    { range: "18–22%", winRate: 38, avgProfit: 185, count: 14 },
    { range: "22%+", winRate: 22, avgProfit: 230, count: 6 },
  ],
  air: [
    { range: "5–8%", winRate: 75, avgProfit: 120, count: 19 },
    { range: "8–11%", winRate: 65, avgProfit: 195, count: 27 },
    { range: "11–14%", winRate: 52, avgProfit: 275, count: 20 },
    { range: "14–18%", winRate: 35, avgProfit: 350, count: 11 },
    { range: "18%+", winRate: 20, avgProfit: 440, count: 5 },
  ],
  trucking: [
    { range: "3–5%", winRate: 85, avgProfit: 45, count: 35 },
    { range: "5–7%", winRate: 72, avgProfit: 85, count: 28 },
    { range: "7–10%", winRate: 58, avgProfit: 135, count: 19 },
    { range: "10–12%", winRate: 40, avgProfit: 175, count: 10 },
    { range: "12%+", winRate: 25, avgProfit: 220, count: 5 },
  ],
};

export function DynamicMarginPanel({ shipmentType, carrierBuyRate, currentMargin }: Props) {
  const analysis = useMemo(() => {
    const type = shipmentType.toLowerCase();
    const buckets = MARGIN_BUCKETS[type] || MARGIN_BUCKETS.fcl;

    // Find optimal zone (best balance of win rate * profit)
    let bestScore = 0;
    let optimalIdx = 0;
    buckets.forEach((b, i) => {
      const score = (b.winRate / 100) * b.avgProfit;
      if (score > bestScore) {
        bestScore = score;
        optimalIdx = i;
      }
    });

    const optimal = buckets[optimalIdx];
    const totalDeals = buckets.reduce((s, b) => s + b.count, 0);

    // Parse optimal range
    const rangeMatch = optimal.range.match(/([\d.]+)[–-]([\d.]+)/);
    const optLow = rangeMatch ? parseFloat(rangeMatch[1]) : 7;
    const optHigh = rangeMatch ? parseFloat(rangeMatch[2]) : 10;

    // Trend: compare recent vs historical (simulated)
    const trend: "up" | "down" | "stable" = currentMargin > (optLow + optHigh) / 2 + 1 ? "down" : currentMargin < optLow ? "up" : "stable";

    // Current position assessment
    let position: "below_optimal" | "optimal" | "above_optimal" | "risk_zone";
    if (currentMargin < optLow) position = "below_optimal";
    else if (currentMargin <= optHigh) position = "optimal";
    else if (currentMargin <= optHigh + 3) position = "above_optimal";
    else position = "risk_zone";

    // Confidence
    const confidence = totalDeals >= 80 ? "high" : totalDeals >= 40 ? "medium" : "low";

    return { buckets, optimal, optimalIdx, optLow, optHigh, trend, position, confidence, totalDeals };
  }, [shipmentType, currentMargin]);

  const TrendIcon = analysis.trend === "up" ? TrendingUp : analysis.trend === "down" ? TrendingDown : Minus;
  const trendColor = analysis.trend === "up" ? "text-emerald-500" : analysis.trend === "down" ? "text-amber-400" : "text-muted-foreground";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-foreground">Dynamic Margin Engine</h3>
        </div>
        <Badge variant="outline" className="text-[9px] gap-1">
          <span className={analysis.confidence === "high" ? "text-emerald-500" : analysis.confidence === "medium" ? "text-amber-400" : "text-muted-foreground"}>●</span>
          {analysis.confidence} confidence
        </Badge>
      </div>

      {/* Optimal Range */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">Optimal Margin Zone</span>
          <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-blue-400">{analysis.optLow}% – {analysis.optHigh}%</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Based on {analysis.totalDeals} historical shipments
        </p>
      </div>

      {/* Current Position */}
      <div className={`rounded-lg p-2.5 border ${
        analysis.position === "optimal" ? "border-emerald-500/30 bg-emerald-500/5" :
        analysis.position === "risk_zone" ? "border-destructive/30 bg-destructive/5" :
        "border-amber-500/30 bg-amber-500/5"
      }`}>
        <div className="flex items-center gap-2">
          {analysis.position === "optimal" ? (
            <Target className="h-3.5 w-3.5 text-emerald-500" />
          ) : analysis.position === "risk_zone" ? (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          )}
          <span className={`text-xs font-semibold ${
            analysis.position === "optimal" ? "text-emerald-500" :
            analysis.position === "risk_zone" ? "text-destructive" : "text-amber-400"
          }`}>
            {analysis.position === "optimal" ? "In Optimal Zone" :
             analysis.position === "below_optimal" ? "Below Optimal — consider increasing" :
             analysis.position === "above_optimal" ? "Above Optimal — may reduce win rate" :
             "Risk Zone — high loss probability"}
          </span>
        </div>
      </div>

      {/* Bucket Performance */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Margin vs Win Rate</p>
        {analysis.buckets.map((b, i) => {
          const isOptimal = i === analysis.optimalIdx;
          return (
            <div key={b.range} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
              isOptimal ? "bg-blue-500/10 border border-blue-500/20" : ""
            }`}>
              <span className="text-[10px] text-muted-foreground w-14">{b.range}</span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isOptimal ? "bg-blue-400" : "bg-muted-foreground/40"}`}
                  style={{ width: `${b.winRate}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-foreground w-10 text-right">{b.winRate}%</span>
              <span className="text-[10px] text-muted-foreground w-12 text-right">${b.avgProfit}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-2 px-2 pt-1 text-[9px] text-muted-foreground">
          <span className="w-14" />
          <span className="flex-1 text-center">Win Rate</span>
          <span className="w-10 text-right">Rate</span>
          <span className="w-12 text-right">Avg $</span>
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-lg border border-border bg-card p-2.5">
        <p className="text-[10px] text-muted-foreground mb-1">AI Recommendation</p>
        <p className="text-[11px] text-foreground">
          {analysis.position === "optimal"
            ? `Current margin (${currentMargin.toFixed(1)}%) is within the optimal zone. Maintain this range for best profitability-to-conversion balance.`
            : analysis.position === "below_optimal"
            ? `Consider increasing margin to ${analysis.optLow}%+ to improve profitability. Win rate remains strong at this level.`
            : analysis.position === "above_optimal"
            ? `Margin (${currentMargin.toFixed(1)}%) is above optimal. Reducing to ${analysis.optHigh}% could improve win rate by ~${(analysis.buckets[analysis.optimalIdx].winRate - (analysis.buckets[analysis.optimalIdx + 1]?.winRate || 30)).toFixed(0)}%.`
            : `Margin (${currentMargin.toFixed(1)}%) is in the risk zone with very low win probability. Strongly recommend reducing to ${analysis.optLow}–${analysis.optHigh}%.`
          }
        </p>
      </div>
    </div>
  );
}
