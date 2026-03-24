import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye, TrendingUp, TrendingDown, Clock, AlertTriangle,
  Check, ChevronDown, ChevronUp, UserCheck, MessageSquare,
  Ban, Zap, ShieldCheck, Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

type BehaviorBadge = "Price Sensitive" | "Habitual Negotiator" | "Fast Closer" | "Value Driven" | "Margin Friendly" | "Strategic Buyer";

interface Props {
  currentSellPrice: number;
  trueCost: number;
  currentMargin: number;
  netProfit: number;
  platformRetained: number;
  shipmentType: string;
  customerType?: string;
  urgency?: string;
  promoDetected?: boolean;
  discountFromOriginal?: number;
  negotiationRounds?: number;
}

export function CustomerResponsePredictor({
  currentSellPrice, trueCost, currentMargin, netProfit, platformRetained,
  shipmentType, customerType = "existing", urgency = "standard",
  promoDetected = false, discountFromOriginal = 0, negotiationRounds = 0,
}: Props) {
  const [open, setOpen] = useState(false);

  const prediction = useMemo(() => {
    // --- Customer behavior profile (simulated from history) ---
    const profiles: Record<string, { sensitivity: number; avgDiscount: number; avgRounds: number; speed: string; badges: BehaviorBadge[] }> = {
      new: { sensitivity: 0.7, avgDiscount: 5, avgRounds: 2, speed: "delayed", badges: ["Price Sensitive"] },
      existing: { sensitivity: 0.4, avgDiscount: 3, avgRounds: 1, speed: "24h", badges: ["Value Driven"] },
      high_volume: { sensitivity: 0.3, avgDiscount: 2, avgRounds: 1, speed: "same_day", badges: ["Fast Closer", "Margin Friendly"] },
      strategic: { sensitivity: 0.5, avgDiscount: 4, avgRounds: 2, speed: "24h", badges: ["Strategic Buyer", "Habitual Negotiator"] },
    };
    const profile = profiles[customerType] || profiles.existing;

    // --- Acceptance zone calculation ---
    const historicalAcceptMargin = customerType === "high_volume" ? 7 : customerType === "new" ? 10 : 8.5;
    const inAcceptanceZone = currentMargin <= historicalAcceptMargin * 1.15;
    const discountAlreadyGiven = discountFromOriginal > 0;

    // --- Base acceptance probability ---
    let acceptProb = 45;
    if (inAcceptanceZone) acceptProb += 25;
    if (discountAlreadyGiven) acceptProb += Math.min(discountFromOriginal * 3, 15);
    if (urgency === "urgent") acceptProb += 10;
    if (promoDetected) acceptProb += 5;
    if (customerType === "high_volume") acceptProb += 8;
    if (negotiationRounds >= 2) acceptProb += 5; // fatigue
    acceptProb -= profile.sensitivity * 15;
    acceptProb = Math.min(95, Math.max(5, Math.round(acceptProb)));

    // --- Negotiation probability ---
    let negProb = 35;
    if (profile.avgRounds > 1) negProb += 10;
    if (!discountAlreadyGiven) negProb += 10;
    if (currentMargin > historicalAcceptMargin * 1.2) negProb += 10;
    negProb -= negotiationRounds * 8;
    negProb = Math.min(80, Math.max(2, negProb));

    // --- Rejection probability ---
    let rejProb = Math.max(2, 100 - acceptProb - negProb);

    // Normalize to 100
    const total = acceptProb + negProb + rejProb;
    acceptProb = Math.round(acceptProb / total * 100);
    negProb = Math.round(negProb / total * 100);
    rejProb = 100 - acceptProb - negProb;

    // --- Classification ---
    let classification: string;
    let classColor: string;
    if (acceptProb >= 65) { classification = "Likely Immediate Acceptance"; classColor = "text-emerald-500"; }
    else if (acceptProb >= 45) { classification = "Likely Accept with Small Negotiation"; classColor = "text-blue-400"; }
    else if (acceptProb >= 30) { classification = "Likely Needs Strategic Discount"; classColor = "text-amber-400"; }
    else if (acceptProb >= 15) { classification = "Likely Price Resistance"; classColor = "text-orange-400"; }
    else { classification = "Likely Reject"; classColor = "text-destructive"; }

    // --- Response speed ---
    let speed = profile.speed;
    if (urgency === "urgent") speed = "same_day";

    const speedLabel: Record<string, string> = {
      same_day: "Same Day", "24h": "Within 24 Hours", delayed: "2–3 Days", follow_up: "Requires Follow-up",
    };

    // --- Recommended action ---
    let action: string;
    let actionIcon: any;
    if (acceptProb >= 65) { action = "Send Current Quote"; actionIcon = Check; }
    else if (acceptProb >= 45 && negProb > 25) { action = "Offer Limited Concession"; actionIcon = Target; }
    else if (acceptProb >= 30) { action = "Send Safe Counter Offer"; actionIcon = MessageSquare; }
    else if (acceptProb >= 15) { action = "Escalate Strategically"; actionIcon = Zap; }
    else { action = "Walk Away"; actionIcon = Ban; }

    // --- Confidence ---
    let confidence = 60;
    if (customerType !== "new") confidence += 15;
    if (negotiationRounds > 0) confidence += 10;
    if (promoDetected) confidence += 5;
    confidence = Math.min(95, confidence);

    // --- AI reasoning ---
    const reasons: string[] = [];
    if (inAcceptanceZone) reasons.push("Current quote is within the customer's historical acceptance range.");
    else reasons.push(`Current margin (${fmtPct(currentMargin)}) is above the customer's typical acceptance zone (${fmtPct(historicalAcceptMargin)}).`);
    if (discountAlreadyGiven) reasons.push(`Discount of ${fmtPct(discountFromOriginal)} already applied — reduces further negotiation likelihood.`);
    if (profile.badges.includes("Habitual Negotiator")) reasons.push("This customer typically negotiates at least once before accepting.");
    if (profile.badges.includes("Fast Closer")) reasons.push("Customer pattern shows quick decision-making on competitive quotes.");
    if (urgency === "urgent") reasons.push("Urgent shipment increases acceptance speed and probability.");
    if (promoDetected) reasons.push("Promo rate advantage may allow a controlled concession if needed.");

    // --- Price response curve ---
    const safeCounter = currentSellPrice * 0.97;
    const aggressiveCounter = currentSellPrice * 0.93;
    const redLinePrice = trueCost * 1.04;

    const curve = [
      { label: "Current", price: currentSellPrice, accept: acceptProb, profit: netProfit, margin: currentMargin },
      { label: "−3%", price: safeCounter, accept: Math.min(95, acceptProb + 12), profit: safeCounter - trueCost, margin: safeCounter > 0 ? ((safeCounter - trueCost) / safeCounter) * 100 : 0 },
      { label: "−7%", price: aggressiveCounter, accept: Math.min(95, acceptProb + 22), profit: aggressiveCounter - trueCost, margin: aggressiveCounter > 0 ? ((aggressiveCounter - trueCost) / aggressiveCounter) * 100 : 0 },
      { label: "Red Line", price: redLinePrice, accept: Math.min(95, acceptProb + 30), profit: redLinePrice - trueCost, margin: redLinePrice > 0 ? ((redLinePrice - trueCost) / redLinePrice) * 100 : 0 },
    ];

    return {
      acceptProb, negProb, rejProb, classification, classColor,
      speed: speedLabel[speed] || speed, action, actionIcon,
      confidence, reasons, badges: profile.badges, curve,
    };
  }, [currentSellPrice, trueCost, currentMargin, netProfit, platformRetained, shipmentType, customerType, urgency, promoDetected, discountFromOriginal, negotiationRounds]);

  const probBar = (label: string, value: number, color: string) => (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-bold ${color}`}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${
          color === "text-emerald-500" ? "bg-emerald-500" :
          color === "text-amber-400" ? "bg-amber-500" :
          color === "text-destructive" ? "bg-destructive" : "bg-blue-500"
        }`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-accent/20 bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Eye className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">Customer Response Predictor</span>
          {!open && (
            <Badge className="text-[9px] bg-accent/10 text-accent border-accent/30 ml-1">
              {prediction.acceptProb}% accept
            </Badge>
          )}
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
              {/* Classification Badge */}
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-bold ${prediction.classColor}`}>{prediction.classification}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Confidence: {prediction.confidence}%</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {prediction.speed}
                </div>
              </div>

              {/* Probability Bars */}
              <div className="space-y-2">
                {probBar("Acceptance", prediction.acceptProb, "text-emerald-500")}
                {probBar("Further Negotiation", prediction.negProb, "text-amber-400")}
                {probBar("Rejection", prediction.rejProb, "text-destructive")}
              </div>

              {/* Customer Behavior Badges */}
              <div className="flex flex-wrap gap-1.5">
                {prediction.badges.map(b => (
                  <Badge key={b} variant="secondary" className="text-[9px] bg-muted/50 text-muted-foreground border-border">
                    {b}
                  </Badge>
                ))}
              </div>

              {/* Recommended Action */}
              <div className={`rounded-lg border p-3 ${
                prediction.acceptProb >= 65 ? "border-emerald-500/30 bg-emerald-500/5" :
                prediction.acceptProb >= 30 ? "border-amber-500/30 bg-amber-500/5" :
                "border-destructive/30 bg-destructive/5"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <prediction.actionIcon className={`h-3.5 w-3.5 ${prediction.classColor}`} />
                  <p className="text-xs font-semibold text-foreground">{prediction.action}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {prediction.acceptProb >= 65
                    ? "Quote is within acceptance zone. Sending now maximizes close speed."
                    : prediction.acceptProb >= 45
                    ? "Minor concession likely improves close probability without significant profit loss."
                    : prediction.acceptProb >= 30
                    ? "Customer likely needs a meaningful counter-offer or value justification."
                    : "Low conversion probability. Evaluate if deal economics justify continued pursuit."
                  }
                </p>
              </div>

              {/* Price Response Curve */}
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Price Response Curve</p>
                <div className="space-y-1.5">
                  {prediction.curve.map(pt => (
                    <div key={pt.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-14 shrink-0">{pt.label}</span>
                      <div className="flex-1 h-4 rounded bg-secondary/50 relative overflow-hidden">
                        <div
                          className={`h-full rounded transition-all duration-500 ${
                            pt.accept >= 70 ? "bg-emerald-500/60" :
                            pt.accept >= 45 ? "bg-amber-500/60" : "bg-destructive/40"
                          }`}
                          style={{ width: `${pt.accept}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">
                          {pt.accept}%
                        </span>
                      </div>
                      <div className="text-right shrink-0 w-20">
                        <span className="text-[10px] text-muted-foreground">{fmt(pt.price)}</span>
                        <span className={`text-[9px] ml-1 ${pt.profit > 0 ? "text-emerald-500" : "text-destructive"}`}>
                          {fmt(pt.profit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">AI Reasoning</p>
                <div className="space-y-1">
                  {prediction.reasons.map((r, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-cyan-400 mt-0.5">•</span> {r}
                    </p>
                  ))}
                </div>
              </div>

              {/* Sales Rep Quick Guide */}
              <div className="rounded-lg border border-border bg-accent/5 p-3">
                <p className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">Sales Action Guide</p>
                <div className="space-y-0.5 text-[11px] text-muted-foreground">
                  {prediction.acceptProb >= 65 && <p>• Send current quote with confidence</p>}
                  {prediction.acceptProb >= 45 && prediction.acceptProb < 65 && (
                    <>
                      <p>• Expect one negotiation round</p>
                      <p>• Offer no more than 3% discount</p>
                    </>
                  )}
                  {prediction.acceptProb < 45 && prediction.acceptProb >= 20 && (
                    <>
                      <p>• Request volume commitment before discounting</p>
                      <p>• Do not go below last safe price</p>
                    </>
                  )}
                  {prediction.acceptProb < 20 && <p>• Consider disengaging — low ROI on further negotiation</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
