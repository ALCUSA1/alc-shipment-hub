import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  FlaskConical, ArrowRight, Save, Check, AlertTriangle, TrendingUp,
  TrendingDown, Minus, BarChart3, Target, Zap, Trophy, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

type Strategy = "max_profit" | "balanced" | "win_rate" | "strategic_growth";

const STRATEGY_META: Record<Strategy, { label: string; icon: any; margin: number; winAdj: number }> = {
  max_profit: { label: "Max Profit", icon: TrendingUp, margin: 1.35, winAdj: -12 },
  balanced: { label: "Balanced", icon: Target, margin: 1.0, winAdj: 0 },
  win_rate: { label: "Win Rate", icon: Trophy, margin: 0.7, winAdj: 18 },
  strategic_growth: { label: "Strategic", icon: Zap, margin: 0.6, winAdj: 25 },
};

interface Props {
  carrierBuyRate: number;
  trueCost: number;
  currentMargin: number;
  currentSellPrice: number;
  netProfit: number;
  platformRetained: number;
  shipmentType: string;
}

export function WhatIfSimulator({
  carrierBuyRate, trueCost, currentMargin, currentSellPrice, netProfit, platformRetained, shipmentType,
}: Props) {
  const [open, setOpen] = useState(false);
  const [simMargin, setSimMargin] = useState(currentMargin || 8);
  const [simStrategy, setSimStrategy] = useState<Strategy>("balanced");
  const [promoRetained, setPromoRetained] = useState(70);
  const [platformSplit, setPlatformSplit] = useState(70);
  const [referralSplit, setReferralSplit] = useState(20);

  const baseline = useMemo(() => {
    const sellPrice = trueCost > 0 ? trueCost / (1 - currentMargin / 100) : 0;
    const profit = sellPrice - trueCost;
    const retained = profit * 0.7;
    const winProb = 65;
    const dealScore = Math.min(100, Math.round((profit > 200 ? 30 : 15) + (currentMargin > 10 ? 25 : 12) + 20));
    return { sellPrice: currentSellPrice || sellPrice, profit: netProfit || profit, retained: platformRetained || retained, margin: currentMargin, winProb, dealScore };
  }, [trueCost, currentMargin, currentSellPrice, netProfit, platformRetained]);

  const simulation = useMemo(() => {
    const effectiveMargin = simMargin * STRATEGY_META[simStrategy].margin;
    const sellPrice = trueCost > 0 ? trueCost / (1 - Math.max(effectiveMargin, 2) / 100) : 0;
    const profit = sellPrice - trueCost;
    const retained = profit * (platformSplit / 100);
    const winProb = Math.min(95, Math.max(10, baseline.winProb + STRATEGY_META[simStrategy].winAdj + (baseline.margin - effectiveMargin) * 3));
    const dealScore = Math.min(100, Math.round(
      (profit > 200 ? 30 : profit > 100 ? 20 : 10) +
      (effectiveMargin > 10 ? 25 : effectiveMargin > 6 ? 15 : 5) +
      (winProb > 70 ? 20 : 10) + 15
    ));
    return { sellPrice, profit, retained, margin: effectiveMargin, winProb, dealScore };
  }, [simMargin, simStrategy, trueCost, platformSplit, baseline]);

  const delta = (base: number, sim: number) => {
    const diff = sim - base;
    if (Math.abs(diff) < 0.5) return { icon: Minus, color: "text-muted-foreground", text: "—" };
    return diff > 0
      ? { icon: TrendingUp, color: "text-emerald-500", text: `+${fmt(diff)}` }
      : { icon: TrendingDown, color: "text-destructive", text: fmt(diff) };
  };

  const deltaPct = (base: number, sim: number) => {
    const diff = sim - base;
    if (Math.abs(diff) < 0.1) return { color: "text-muted-foreground", text: "—" };
    return diff > 0
      ? { color: "text-emerald-500", text: `+${fmtPct(diff)}` }
      : { color: "text-destructive", text: fmtPct(diff) };
  };

  const rows = [
    { label: "Sell Price", base: baseline.sellPrice, sim: simulation.sellPrice, fmt: fmt },
    { label: "Net Profit", base: baseline.profit, sim: simulation.profit, fmt: fmt },
    { label: "Platform Profit", base: baseline.retained, sim: simulation.retained, fmt: fmt },
  ];

  return (
    <div className="rounded-xl border border-accent/20 bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <FlaskConical className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">What-If Simulator</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div className="p-4 space-y-4">
              {/* Strategy Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.entries(STRATEGY_META) as [Strategy, typeof STRATEGY_META[Strategy]][]).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setSimStrategy(k)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-[10px] transition-all ${
                      simStrategy === k
                        ? "border-violet-500/50 bg-violet-500/10 text-violet-400"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <v.icon className="h-3.5 w-3.5" />
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Margin Slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Margin %</span>
                  <span className="text-xs font-bold text-foreground">{fmtPct(simMargin)}</span>
                </div>
                <Slider
                  value={[simMargin]}
                  onValueChange={([v]) => setSimMargin(v)}
                  min={2}
                  max={25}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                  <span>2%</span><span>25%</span>
                </div>
              </div>

              {/* Platform Split */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Platform Split</span>
                  <span className="text-xs font-bold text-foreground">{platformSplit}%</span>
                </div>
                <Slider
                  value={[platformSplit]}
                  onValueChange={([v]) => setPlatformSplit(v)}
                  min={40}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Comparison Table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-4 gap-0 text-[10px] bg-muted/30">
                  <div className="px-3 py-2 font-semibold text-muted-foreground">Metric</div>
                  <div className="px-3 py-2 font-semibold text-muted-foreground text-center">Current</div>
                  <div className="px-3 py-2 font-semibold text-violet-400 text-center">Simulated</div>
                  <div className="px-3 py-2 font-semibold text-muted-foreground text-center">Δ</div>
                </div>
                {rows.map(r => {
                  const d = delta(r.base, r.sim);
                  return (
                    <div key={r.label} className="grid grid-cols-4 gap-0 border-t border-border text-[11px]">
                      <div className="px-3 py-2 text-muted-foreground">{r.label}</div>
                      <div className="px-3 py-2 text-center text-foreground">{r.fmt(r.base)}</div>
                      <div className="px-3 py-2 text-center font-semibold text-foreground">{r.fmt(r.sim)}</div>
                      <div className={`px-3 py-2 text-center font-semibold ${d.color}`}>{d.text}</div>
                    </div>
                  );
                })}
                {/* Margin row */}
                <div className="grid grid-cols-4 gap-0 border-t border-border text-[11px]">
                  <div className="px-3 py-2 text-muted-foreground">Margin %</div>
                  <div className="px-3 py-2 text-center text-foreground">{fmtPct(baseline.margin)}</div>
                  <div className="px-3 py-2 text-center font-semibold text-foreground">{fmtPct(simulation.margin)}</div>
                  <div className={`px-3 py-2 text-center font-semibold ${deltaPct(baseline.margin, simulation.margin).color}`}>
                    {deltaPct(baseline.margin, simulation.margin).text}
                  </div>
                </div>
                {/* Win Prob row */}
                <div className="grid grid-cols-4 gap-0 border-t border-border text-[11px]">
                  <div className="px-3 py-2 text-muted-foreground">Win Probability</div>
                  <div className="px-3 py-2 text-center text-foreground">{fmtPct(baseline.winProb)}</div>
                  <div className="px-3 py-2 text-center font-semibold text-foreground">{fmtPct(simulation.winProb)}</div>
                  <div className={`px-3 py-2 text-center font-semibold ${deltaPct(baseline.winProb, simulation.winProb).color}`}>
                    {deltaPct(baseline.winProb, simulation.winProb).text}
                  </div>
                </div>
              </div>

              {/* AI Impact Prediction */}
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-violet-400 font-semibold mb-1">AI Impact Prediction</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {simulation.margin < baseline.margin
                    ? `Reducing margin from ${fmtPct(baseline.margin)} to ${fmtPct(simulation.margin)} increases win probability by ~${fmtPct(simulation.winProb - baseline.winProb)} but ${simulation.retained < baseline.retained ? `reduces platform profit by ${fmt(baseline.retained - simulation.retained)}` : `maintains platform profit`}.`
                    : simulation.margin > baseline.margin
                    ? `Increasing margin to ${fmtPct(simulation.margin)} improves platform profit by ${fmt(simulation.retained - baseline.retained)} but may reduce win probability by ~${fmtPct(baseline.winProb - simulation.winProb)}.`
                    : "Current scenario matches baseline. Adjust margin or strategy to see impact."
                  }
                </p>
              </div>

              {/* Warnings */}
              {simulation.profit < 0 && (
                <div className="flex items-center gap-2 text-[11px] text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Simulated scenario results in negative profit. Not recommended.
                </div>
              )}
              {simulation.retained < 100 && simulation.profit > 0 && (
                <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Platform retained profit below $100 threshold. Approval may be required.
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs h-8 bg-violet-600 hover:bg-violet-700">
                  <Check className="h-3 w-3 mr-1" /> Apply Scenario
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8">
                  <Save className="h-3 w-3 mr-1" /> Save
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
