import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, TrendingUp, Shield, Users, AlertTriangle,
  Check, Target, Zap, BarChart3,
} from "lucide-react";

const fmtPct = (v: number) => `${v.toFixed(0)}%`;

interface Props {
  netProfit: number;
  platformRetained: number;
  netMargin: number;
  sellPrice: number;
  trueCost: number;
  customerType: string;
  urgency: string;
  shipmentType: string;
  hasComplexRouting?: boolean;
  missingDocs?: boolean;
}

const SCORE_LABELS = [
  { min: 90, label: "High Value Deal", color: "text-emerald-500", bg: "bg-emerald-500", rec: "Accept and prioritize" },
  { min: 75, label: "Strong Deal", color: "text-emerald-400", bg: "bg-emerald-400", rec: "Accept with confidence" },
  { min: 60, label: "Conditional Deal", color: "text-amber-400", bg: "bg-amber-400", rec: "Accept with margin protection" },
  { min: 40, label: "Margin Risk", color: "text-orange-400", bg: "bg-orange-400", rec: "Accept only with approval" },
  { min: 0, label: "Weak Deal", color: "text-destructive", bg: "bg-destructive", rec: "Decline or rework" },
];

export function DealScorePanel({
  netProfit, platformRetained, netMargin, sellPrice, trueCost,
  customerType, urgency, shipmentType, hasComplexRouting, missingDocs,
}: Props) {
  const scores = useMemo(() => {
    // A. Profitability (30 pts)
    let profitability = 0;
    if (netProfit > 300) profitability = 30;
    else if (netProfit > 150) profitability = 22;
    else if (netProfit > 50) profitability = 14;
    else if (netProfit > 0) profitability = 7;

    // B. Win Probability (20 pts)
    let winProb = 10;
    if (customerType === "existing" || customerType === "high_volume") winProb += 5;
    if (netMargin < 15) winProb += 3; // competitive pricing
    if (urgency === "standard") winProb += 2;

    // C. Strategic Value (20 pts)
    let strategic = 10;
    if (customerType === "new") strategic += 5; // new customer acquisition
    if (customerType === "high_volume") strategic += 8;
    if (sellPrice > 5000) strategic += 2;

    // D. Operational Risk (15 pts, inverted — lower risk = higher score)
    let risk = 15;
    if (hasComplexRouting) risk -= 5;
    if (missingDocs) risk -= 4;
    if (urgency === "urgent") risk -= 3;

    // E. Customer Quality (15 pts)
    let custQuality = 8;
    if (customerType === "high_volume") custQuality = 15;
    else if (customerType === "existing") custQuality = 12;
    else custQuality = 6;

    const total = Math.min(100, Math.max(0, profitability + winProb + strategic + risk + custQuality));

    const label = SCORE_LABELS.find(s => total >= s.min)!;

    // Reasoning
    const reasons: string[] = [];
    if (profitability >= 22) reasons.push("Strong margin and healthy platform profit.");
    else if (profitability < 14) reasons.push("Low profitability — review cost structure.");
    if (customerType === "high_volume") reasons.push("High-volume customer with strong repeat value.");
    if (customerType === "new") reasons.push("New customer acquisition opportunity.");
    if (hasComplexRouting) reasons.push("Complex routing increases operational risk.");
    if (missingDocs) reasons.push("Missing documents may delay execution.");
    if (urgency === "urgent") reasons.push("Urgent timeline increases execution pressure.");
    if (total >= 75) reasons.push("Recommend fast-track pricing approval.");
    if (total < 40) reasons.push("Shipment unlikely to generate acceptable margin. Consider rework or decline.");

    return {
      total, label,
      profitability: Math.round((profitability / 30) * 100),
      winProb: Math.round((winProb / 20) * 100),
      strategic: Math.round((strategic / 20) * 100),
      risk: Math.round((risk / 15) * 100),
      custQuality: Math.round((custQuality / 15) * 100),
      reasons,
    };
  }, [netProfit, platformRetained, netMargin, sellPrice, trueCost, customerType, urgency, hasComplexRouting, missingDocs]);

  const SubScore = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
    <div className="flex items-center gap-2">
      <Icon className={`h-3 w-3 ${color} shrink-0`} />
      <div className="flex-1">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <span className="text-[10px] font-semibold text-foreground">{fmtPct(value)}</span>
        </div>
        <div className="h-1 rounded-full bg-secondary overflow-hidden">
          <div className={`h-full rounded-full ${value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-400" : "bg-destructive"}`} style={{ width: `${value}%` }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-foreground">Deal Score</h3>
      </div>

      {/* Main Score */}
      <div className={`rounded-xl border p-4 flex items-center gap-4 ${
        scores.total >= 75 ? "border-emerald-500/30 bg-emerald-500/5" :
        scores.total >= 40 ? "border-amber-500/30 bg-amber-500/5" :
        "border-destructive/30 bg-destructive/5"
      }`}>
        <div className={`text-4xl font-black ${scores.label.color}`}>
          {scores.total}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-bold ${scores.label.color}`}>{scores.label.label}</p>
          <p className="text-[10px] text-muted-foreground">{scores.label.rec}</p>
        </div>
        <Badge className={`text-[10px] ${
          scores.total >= 75 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
          scores.total >= 40 ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
          "bg-destructive/15 text-destructive border-destructive/30"
        }`}>
          {scores.total >= 75 ? "Pursue" : scores.total >= 40 ? "Caution" : "Review"}
        </Badge>
      </div>

      {/* Sub Scores */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
        <SubScore label="Profitability" value={scores.profitability} icon={TrendingUp} color="text-emerald-500" />
        <SubScore label="Win Probability" value={scores.winProb} icon={Trophy} color="text-blue-400" />
        <SubScore label="Strategic Value" value={scores.strategic} icon={Zap} color="text-violet-400" />
        <SubScore label="Operational Risk" value={scores.risk} icon={Shield} color="text-amber-400" />
        <SubScore label="Customer Quality" value={scores.custQuality} icon={Users} color="text-pink-400" />
      </div>

      {/* AI Reasoning */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">AI Analysis</p>
        <div className="space-y-1">
          {scores.reasons.map((r, i) => (
            <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <span className={`mt-0.5 ${r.includes("⚠") || r.includes("risk") || r.includes("decline") || r.includes("Low") || r.includes("Missing") ? "text-amber-400" : "text-blue-400"}`}>•</span>
              {r}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
