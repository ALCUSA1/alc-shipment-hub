import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Handshake, Shield, Target, TrendingDown, AlertTriangle, Check,
  Copy, ChevronDown, ChevronUp, Zap, ArrowRight, Ban,
  MessageSquare, DollarSign,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

type NegMode = "margin_protection" | "balanced" | "win_deal" | "strategic" | "walk_away";

const MODE_META: Record<NegMode, { label: string; icon: any; color: string; desc: string }> = {
  margin_protection: { label: "Protect Margin", icon: Shield, color: "text-emerald-500", desc: "Hold price unless small reduction preserves strong profit" },
  balanced: { label: "Balanced", icon: Target, color: "text-blue-400", desc: "Allow moderate reduction with healthy retained profit" },
  win_deal: { label: "Win the Deal", icon: Zap, color: "text-amber-400", desc: "More aggressive pricing if win probability justifies it" },
  strategic: { label: "Strategic Account", icon: Handshake, color: "text-violet-400", desc: "Lower margin acceptable for long-term customer value" },
  walk_away: { label: "Walk Away", icon: Ban, color: "text-destructive", desc: "No further discount — deal quality is weak" },
};

interface Props {
  carrierBuyRate: number;
  trueCost: number;
  currentMargin: number;
  currentSellPrice: number;
  netProfit: number;
  platformRetained: number;
  shipmentType: string;
  customerType?: string;
}

export function DealNegotiationAssistant({
  carrierBuyRate, trueCost, currentMargin, currentSellPrice,
  netProfit, platformRetained, shipmentType, customerType = "existing",
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<NegMode>("balanced");
  const [customerAsksLower, setCustomerAsksLower] = useState(false);
  const [competitorLower, setCompetitorLower] = useState(false);
  const [repeatOpportunity, setRepeatOpportunity] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState("normal");
  const [priceSlider, setPriceSlider] = useState(currentSellPrice || 1800);
  const [notes, setNotes] = useState("");

  const redLine = useMemo(() => {
    const minRetained = 80;
    const minMargin = 3;
    const sellAtMinMargin = trueCost > 0 ? trueCost / (1 - minMargin / 100) : 0;
    const profitAtMinMargin = sellAtMinMargin - trueCost;
    const sellAtMinRetained = trueCost + (minRetained / 0.7);
    return Math.max(sellAtMinMargin, sellAtMinRetained, trueCost + 1);
  }, [trueCost]);

  const softFloor = useMemo(() => {
    const targetRetained = 150;
    return trueCost + (targetRetained / 0.7);
  }, [trueCost]);

  const lastSafe = useMemo(() => {
    const targetRetained = 120;
    return trueCost + (targetRetained / 0.7);
  }, [trueCost]);

  const negotiation = useMemo(() => {
    const modeDiscounts: Record<NegMode, number> = {
      margin_protection: 0.02,
      balanced: 0.05,
      win_deal: 0.10,
      strategic: 0.12,
      walk_away: 0,
    };

    const maxDiscount = currentSellPrice * modeDiscounts[mode];
    const safeCounter = currentSellPrice - maxDiscount * 0.5;
    const aggressiveCounter = currentSellPrice - maxDiscount;

    const sliderProfit = priceSlider - trueCost;
    const sliderMargin = priceSlider > 0 ? ((priceSlider - trueCost) / priceSlider) * 100 : 0;
    const sliderRetained = sliderProfit * 0.7;
    const sliderWinProb = Math.min(95, Math.max(10, 65 + (currentSellPrice - priceSlider) / currentSellPrice * 200));

    let action: string;
    let actionColor: string;
    if (mode === "walk_away") {
      action = "Walk Away";
      actionColor = "text-destructive";
    } else if (priceSlider <= redLine) {
      action = "Escalate for Approval";
      actionColor = "text-destructive";
    } else if (priceSlider <= lastSafe) {
      action = "Counter Aggressively";
      actionColor = "text-amber-400";
    } else if (priceSlider < currentSellPrice) {
      action = "Counter Slightly Lower";
      actionColor = "text-blue-400";
    } else {
      action = "Hold Price";
      actionColor = "text-emerald-500";
    }

    const needsApproval = priceSlider <= redLine || sliderRetained < 100;

    // Generate reasoning
    let reasoning = "";
    if (customerAsksLower && competitorLower) {
      reasoning = "Customer pressure with competitor context. Moderate reduction recommended to protect win probability.";
    } else if (customerAsksLower) {
      reasoning = "Customer requests lower price. Evaluate if current margin allows safe reduction.";
    } else if (competitorLower) {
      reasoning = "Competitor pressure indicated. Consider strategic counter to maintain competitiveness.";
    } else {
      reasoning = "No active negotiation pressure. Recommend holding current price.";
    }

    if (repeatOpportunity) {
      reasoning += " Repeat business opportunity justifies moderate flexibility.";
    }

    // Counter offer options
    const options = [
      {
        label: "Hold Current",
        price: currentSellPrice,
        discount: 0,
        profit: netProfit,
        retained: platformRetained,
        margin: currentMargin,
        winProb: 65,
        risk: "low" as const,
      },
      {
        label: "Safe Counter",
        price: safeCounter,
        discount: currentSellPrice - safeCounter,
        profit: safeCounter - trueCost,
        retained: (safeCounter - trueCost) * 0.7,
        margin: safeCounter > 0 ? ((safeCounter - trueCost) / safeCounter) * 100 : 0,
        winProb: 75,
        risk: "low" as const,
      },
      {
        label: "Aggressive Counter",
        price: aggressiveCounter,
        discount: currentSellPrice - aggressiveCounter,
        profit: aggressiveCounter - trueCost,
        retained: (aggressiveCounter - trueCost) * 0.7,
        margin: aggressiveCounter > 0 ? ((aggressiveCounter - trueCost) / aggressiveCounter) * 100 : 0,
        winProb: 85,
        risk: (aggressiveCounter <= lastSafe ? "high" : "medium") as "high" | "medium" | "low",
      },
    ];

    return {
      action, actionColor, maxDiscount, safeCounter, aggressiveCounter,
      sliderProfit, sliderMargin, sliderRetained, sliderWinProb,
      needsApproval, reasoning, options,
    };
  }, [mode, currentSellPrice, trueCost, priceSlider, redLine, lastSafe, netProfit, platformRetained, currentMargin, customerAsksLower, competitorLower, repeatOpportunity]);

  const responseTemplates = [
    `We've reviewed the shipment economics and can offer a revised rate of ${fmt(negotiation.safeCounter)} based on current market conditions.`,
    `We can make a small adjustment to support this move while maintaining the required service scope.`,
    `This is already a highly competitive rate for the lane and service combination.`,
  ];

  const riskColor = (r: "low" | "medium" | "high") =>
    r === "low" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" :
    r === "medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/30" :
    "text-destructive bg-destructive/10 border-destructive/30";

  return (
    <div className="rounded-xl border border-accent/20 bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Handshake className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">Deal Negotiation Assistant</span>
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
              {/* Negotiation Mode */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Negotiation Mode</p>
                <Select value={mode} onValueChange={(v) => setMode(v as NegMode)}>
                  <SelectTrigger className="h-8 text-xs bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODE_META).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        <span className="flex items-center gap-1.5">
                          <v.icon className={`h-3 w-3 ${v.color}`} />
                          {v.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">{MODE_META[mode].desc}</p>
              </div>

              {/* Negotiation Signals */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Negotiation Signals</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Customer asks lower", state: customerAsksLower, set: setCustomerAsksLower },
                    { label: "Competitor is lower", state: competitorLower, set: setCompetitorLower },
                    { label: "Repeat opportunity", state: repeatOpportunity, set: setRepeatOpportunity },
                  ].map(s => (
                    <label key={s.label} className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                      <Switch checked={s.state} onCheckedChange={s.set} className="scale-75" />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Boundaries */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Price Boundaries</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-muted-foreground">Red Line</p>
                    <p className="text-xs font-bold text-destructive">{fmt(redLine)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Soft Floor</p>
                    <p className="text-xs font-bold text-amber-400">{fmt(softFloor)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Last Safe</p>
                    <p className="text-xs font-bold text-blue-400">{fmt(lastSafe)}</p>
                  </div>
                </div>
              </div>

              {/* Interactive Price Slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Negotiate Price</span>
                  <span className="text-sm font-bold text-foreground">{fmt(priceSlider)}</span>
                </div>
                <Slider
                  value={[priceSlider]}
                  onValueChange={([v]) => setPriceSlider(v)}
                  min={Math.max(trueCost * 0.95, redLine * 0.9)}
                  max={currentSellPrice * 1.1}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                  <span>Red Line</span><span>Current + 10%</span>
                </div>

                {/* Live result */}
                <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-muted-foreground">Margin</p>
                    <p className={`text-xs font-bold ${negotiation.sliderMargin < 5 ? "text-destructive" : "text-foreground"}`}>
                      {fmtPct(negotiation.sliderMargin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Profit</p>
                    <p className={`text-xs font-bold ${negotiation.sliderProfit < 0 ? "text-destructive" : "text-emerald-500"}`}>
                      {fmt(negotiation.sliderProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Retained</p>
                    <p className={`text-xs font-bold ${negotiation.sliderRetained < 100 ? "text-amber-400" : "text-emerald-500"}`}>
                      {fmt(negotiation.sliderRetained)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">Win Prob</p>
                    <p className="text-xs font-bold text-foreground">{fmtPct(negotiation.sliderWinProb)}</p>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className={`rounded-lg border p-3 ${
                negotiation.action === "Hold Price" ? "border-emerald-500/30 bg-emerald-500/5" :
                negotiation.action === "Walk Away" || negotiation.action === "Escalate for Approval" ? "border-destructive/30 bg-destructive/5" :
                "border-amber-500/30 bg-amber-500/5"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recommendation</p>
                  <Badge className={`text-[10px] ${
                    negotiation.action === "Hold Price" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                    negotiation.action === "Walk Away" || negotiation.action === "Escalate for Approval" ? "bg-destructive/15 text-destructive border-destructive/30" :
                    "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  }`}>
                    {negotiation.action}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{negotiation.reasoning}</p>
                {negotiation.needsApproval && (
                  <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Approval required at this price point
                  </p>
                )}
              </div>

              {/* Counter Offer Ladder */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Counter Offer Options</p>
                <div className="space-y-2">
                  {negotiation.options.map(opt => (
                    <div key={opt.label} className={`rounded-lg border p-2.5 flex items-center justify-between ${riskColor(opt.risk).split(" ").slice(1).join(" ")} border`}>
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-foreground">{opt.label}</p>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>{fmt(opt.price)}</span>
                          <span>Margin: {fmtPct(opt.margin)}</span>
                          <span>Profit: {fmt(opt.profit)}</span>
                        </div>
                      </div>
                      <Badge className={`text-[9px] ${riskColor(opt.risk)}`}>
                        {opt.risk === "low" ? "Safe" : opt.risk === "medium" ? "Caution" : "Risky"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Response Templates */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Response Templates</p>
                <div className="space-y-1.5">
                  {responseTemplates.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                      <MessageSquare className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                      <p className="flex-1">{t}</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(t); toast.success("Copied to clipboard"); }}
                        className="shrink-0 hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Negotiation Notes</p>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add negotiation context, competitor info, customer feedback..."
                  className="min-h-[60px] text-xs resize-none"
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs h-8 bg-amber-600 hover:bg-amber-700">
                  <Check className="h-3 w-3 mr-1" /> Apply Counter
                </Button>
                {negotiation.needsApproval && (
                  <Button size="sm" variant="outline" className="text-xs h-8 border-destructive/30 text-destructive hover:bg-destructive/10">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Request Approval
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
