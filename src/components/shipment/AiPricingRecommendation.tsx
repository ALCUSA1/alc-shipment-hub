import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Brain, Sparkles, Target, TrendingUp, ShieldCheck, Zap,
  ArrowRight, AlertTriangle, Check, BarChart3, Trophy, Percent,
} from "lucide-react";

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

type Strategy = "max_profit" | "balanced" | "win_rate" | "strategic_growth" | "manual";

const STRATEGY_META: Record<Strategy, { label: string; icon: any; color: string; desc: string }> = {
  max_profit: { label: "Max Profit", icon: TrendingUp, color: "text-emerald-500", desc: "Maximize retained platform profit" },
  balanced: { label: "Balanced", icon: Target, color: "text-blue-400", desc: "Healthy margin while competitive" },
  win_rate: { label: "Win Rate Optimized", icon: Trophy, color: "text-amber-400", desc: "Use savings to improve conversion" },
  strategic_growth: { label: "Strategic Growth", icon: Zap, color: "text-violet-400", desc: "Lower margin for target customers" },
  manual: { label: "Manual Override", icon: BarChart3, color: "text-muted-foreground", desc: "Set your own price" },
};

const STRATEGY_MARGIN_MULT: Record<Strategy, number> = {
  max_profit: 1.35,
  balanced: 1.0,
  win_rate: 0.7,
  strategic_growth: 0.6,
  manual: 1.0,
};

interface Props {
  carrierBuyRate: number;
  trueCost: number;
  currentMargin: number;
  currentSellPrice: number;
  netProfit: number;
  platformRetained: number;
  shipmentType: string;
  customerType: string;
  urgency: string;
  onApplyRecommendation?: (margin: number) => void;
}

export function AiPricingRecommendation({
  carrierBuyRate, trueCost, currentMargin, currentSellPrice, netProfit, platformRetained,
  shipmentType, customerType, urgency, onApplyRecommendation,
}: Props) {
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [showCompare, setShowCompare] = useState(false);

  const ai = useMemo(() => {
    // Promo detection: buy rate significantly below estimated historical average
    const estimatedHistAvg = carrierBuyRate * 1.15; // Simulated: assume historical avg is ~15% higher
    const promoDetected = carrierBuyRate > 0 && carrierBuyRate < estimatedHistAvg * 0.92;
    const promoSavings = promoDetected ? estimatedHistAvg - carrierBuyRate : 0;

    // Base recommended margin by shipment type
    const baseMargins: Record<string, number> = { fcl: 8, lcl: 17, air: 13, trucking: 9 };
    const base = baseMargins[shipmentType.toLowerCase()] || 8;

    // Strategy adjustment
    const stratMult = STRATEGY_MARGIN_MULT[strategy];
    let recMargin = base * stratMult;

    // Promo advantage: increase margin when promo detected
    if (promoDetected && strategy !== "manual") {
      const promoBoost = strategy === "max_profit" ? 4 : strategy === "balanced" ? 2 : strategy === "win_rate" ? 0.5 : 1;
      recMargin += promoBoost;
    }

    // Customer adjustments
    if (customerType === "high_volume" && strategy === "strategic_growth") recMargin = Math.max(recMargin - 2, 3);
    if (customerType === "new" && strategy === "win_rate") recMargin = Math.max(recMargin - 1.5, 3);
    if (urgency === "urgent") recMargin += 2;

    // Safeguards
    recMargin = Math.max(recMargin, 3); // absolute minimum
    const recSellPrice = trueCost > 0 ? trueCost / (1 - recMargin / 100) : 0;
    const recNetProfit = recSellPrice - trueCost;
    const recPlatformRetained = recNetProfit * 0.7; // assume 70% platform share

    // Confidence score based on data quality
    let confidence = 72;
    if (carrierBuyRate > 0) confidence += 10;
    if (promoDetected) confidence += 5;
    if (trueCost > carrierBuyRate) confidence += 8;
    confidence = Math.min(confidence, 98);

    // Deal quality
    const dealScore = Math.min(100, Math.round(
      (recNetProfit > 200 ? 30 : recNetProfit > 100 ? 20 : 10) +
      (recMargin > 10 ? 25 : recMargin > 6 ? 15 : 5) +
      (promoDetected ? 15 : 0) +
      (customerType === "high_volume" ? 20 : customerType === "existing" ? 10 : 5) +
      (urgency === "standard" ? 10 : 5)
    ));

    // AI reasoning
    const reasons: string[] = [];
    if (promoDetected) reasons.push(`Promotional carrier rate detected — ${fmt(promoSavings)} below historical average.`);
    if (strategy === "max_profit" && promoDetected) reasons.push("Retaining promo savings as extra margin for maximum platform profit.");
    if (strategy === "balanced") reasons.push("Balanced pricing maintains competitive sell price while protecting margins.");
    if (strategy === "win_rate") reasons.push("Partial savings passed to customer to improve win probability.");
    if (strategy === "strategic_growth" && customerType === "high_volume") reasons.push("High-volume customer — lower margin acceptable with platform profit floor met.");
    if (recMargin < 5) reasons.push("⚠️ Margin near minimum floor. Approval may be required.");
    if (!promoDetected && carrierBuyRate > 0) reasons.push("Standard market rate — no promo advantage detected.");
    if (reasons.length === 0) reasons.push("Pricing calculated based on current cost inputs and strategy selection.");

    return {
      promoDetected, promoSavings, recMargin, recSellPrice, recNetProfit, recPlatformRetained,
      confidence, dealScore, reasons,
      customerDiscount: promoDetected && strategy === "win_rate" ? promoSavings * 0.4 : 0,
    };
  }, [carrierBuyRate, trueCost, strategy, shipmentType, customerType, urgency]);

  const sMeta = STRATEGY_META[strategy];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-foreground">AI Pricing Recommendation</h3>
        </div>
        {ai.promoDetected && (
          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] gap-1">
            <Sparkles className="h-3 w-3" /> Promo Rate Detected
          </Badge>
        )}
      </div>

      {/* Strategy Selector */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">Pricing Strategy</label>
        <Select value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
          <SelectTrigger className="h-8 text-xs bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STRATEGY_META).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                <span className="flex items-center gap-1.5">
                  <v.icon className={`h-3 w-3 ${v.color}`} />
                  {v.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground mt-1">{sMeta.desc}</p>
      </div>

      {/* Recommendation Card */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Recommended Sell Price</p>
            <p className="text-lg font-bold text-emerald-500">{fmt(ai.recSellPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Recommended Margin</p>
            <p className="text-lg font-bold text-foreground">{fmtPct(ai.recMargin)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Platform Retained</p>
            <p className="text-sm font-semibold text-emerald-500">{fmt(ai.recPlatformRetained)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Confidence</p>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${ai.confidence > 80 ? "bg-emerald-500" : ai.confidence > 60 ? "bg-amber-500" : "bg-destructive"}`}
                  style={{ width: `${ai.confidence}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground">{ai.confidence}%</span>
            </div>
          </div>
        </div>

        {ai.customerDiscount > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 rounded-lg px-2 py-1">
            <ArrowRight className="h-3 w-3" />
            Customer-facing savings: {fmt(ai.customerDiscount)}
          </div>
        )}
      </div>

      {/* Deal Quality Score */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className={`text-2xl font-black ${ai.dealScore >= 75 ? "text-emerald-500" : ai.dealScore >= 50 ? "text-amber-400" : "text-destructive"}`}>
          {ai.dealScore}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">
            Deal Quality: {ai.dealScore >= 75 ? "Strong" : ai.dealScore >= 50 ? "Conditional" : "Weak"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {ai.dealScore >= 75 ? "Pursue with confidence" : ai.dealScore >= 50 ? "Proceed with margin protection" : "Review before committing"}
          </p>
        </div>
        <Badge variant={ai.dealScore >= 75 ? "default" : "secondary"} className={`text-[10px] ${ai.dealScore >= 75 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : ""}`}>
          {ai.dealScore >= 75 ? "Accept" : ai.dealScore >= 50 ? "Caution" : "Review"}
        </Badge>
      </div>

      {/* AI Reasoning */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">AI Reasoning</p>
        <div className="space-y-1">
          {ai.reasons.map((r, i) => (
            <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <span className="text-violet-400 mt-0.5">•</span> {r}
            </p>
          ))}
        </div>
      </div>

      {/* Compare View */}
      {showCompare && currentSellPrice > 0 && (
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Current vs AI Recommended</p>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div />
            <div className="text-center font-semibold text-muted-foreground">Current</div>
            <div className="text-center font-semibold text-violet-400">AI</div>
            {[
              ["Sell Price", fmt(currentSellPrice), fmt(ai.recSellPrice)],
              ["Margin", fmtPct(currentMargin), fmtPct(ai.recMargin)],
              ["Net Profit", fmt(netProfit), fmt(ai.recNetProfit)],
              ["Platform", fmt(platformRetained), fmt(ai.recPlatformRetained)],
            ].map(([label, cur, rec]) => (
              <div key={label as string} className="contents">
                <div className="text-muted-foreground">{label}</div>
                <div className="text-center text-foreground">{cur}</div>
                <div className="text-center text-emerald-500 font-semibold">{rec}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 text-xs h-8 bg-violet-600 hover:bg-violet-700"
          onClick={() => onApplyRecommendation?.(ai.recMargin)}
          disabled={strategy === "manual"}
        >
          <Sparkles className="h-3 w-3 mr-1" /> Apply AI Recommendation
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          onClick={() => setShowCompare(!showCompare)}
        >
          {showCompare ? "Hide" : "Compare"}
        </Button>
      </div>
    </div>
  );
}
