import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown, ChevronUp, Search, Check, AlertTriangle, DollarSign,
  TrendingUp, ShieldCheck, Layers, Settings2, Percent, Target,
  ArrowRight, Save, SendHorizonal, Zap, BarChart3, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { AiPricingRecommendation } from "./AiPricingRecommendation";
import { DealScorePanel } from "./DealScorePanel";
import { RateIntelligencePanel } from "./RateIntelligencePanel";
import { DynamicMarginPanel } from "./DynamicMarginPanel";
import { WhatIfSimulator } from "./WhatIfSimulator";
import { DealNegotiationAssistant } from "./DealNegotiationAssistant";
import { CustomerResponsePredictor } from "./CustomerResponsePredictor";

/* ── Formatting helpers ── */
const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtD = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

/* ── Margin targets by shipment type ── */
const MARGIN_TARGETS: Record<string, { min: number; target: number; stretch: number; label: string }> = {
  fcl: { min: 6, target: 8, stretch: 10, label: "$80–$150/shipment" },
  lcl: { min: 12, target: 17, stretch: 22, label: "15%–25% net" },
  air: { min: 10, target: 13, stretch: 16, label: "10%–20% net" },
  trucking: { min: 6, target: 9, stretch: 12, label: "Competitive+" },
};

/* ── Margin adjustments ── */
const URGENCY_ADJ: Record<string, number> = { standard: 0, priority: 1.5, urgent: 3 };
const CAPACITY_ADJ: Record<string, number> = { loose: -1, normal: 0, tight: 2 };
const CUSTOMER_ADJ: Record<string, number> = { new: 1, existing: 0, high_volume: -1.5 };

interface Props {
  shipmentId: string;
  shipmentType?: string;
  originPort?: string;
  destinationPort?: string;
  mode?: string;
  shipmentRef?: string;
  status?: string;
}

export function ShipmentPricingTab({ shipmentId, shipmentType, originPort, destinationPort, mode, shipmentRef, status }: Props) {
  const { user } = useAuth();
  const [rateSearchOpen, setRateSearchOpen] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [sections, setSections] = useState({ direct: true, variable: false, fixed: false, network: false });
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* ── Margin adjusters ── */
  const [urgency, setUrgency] = useState("standard");
  const [capacity, setCapacity] = useState("normal");
  const [customerType, setCustomerType] = useState("existing");
  const [competitionAdj, setCompetitionAdj] = useState(0);
  const [manualMarginOverride, setManualMarginOverride] = useState<number | null>(null);

  /* ── Cost state ── */
  const [costs, setCosts] = useState({
    thc: 0, documentation: 0, portFees: 0, carrierSurcharges: 0, otherDirect: 0,
    trucking: 0, customs: 0, insurance: 0,
    paymentProcessing: 0, agentCommission: 0, platformTxn: 0, customerSupport: 0, otherVariable: 0,
    monthlySoftware: 5000, monthlyTeam: 15000, monthlyOverhead: 3000, monthlyMarketing: 2000, monthlyTech: 1500,
    monthlyVolume: 100,
    referralPayout: 0, collaborationPayout: 0, otherPayout: 0,
  });

  /* ── Revenue split ── */
  const [splitType, setSplitType] = useState("no_network");

  /* ── Carrier rate queries ── */
  const { data: carrierRates, isLoading: ratesLoading } = useQuery({
    queryKey: ["pricing-carrier-rates", originPort, destinationPort, mode],
    queryFn: async () => {
      let q = supabase.from("carrier_rates").select("*").gte("valid_until", new Date().toISOString().split("T")[0]);
      if (originPort) q = q.ilike("origin_port", `%${originPort}%`);
      if (destinationPort) q = q.ilike("destination_port", `%${destinationPort}%`);
      if (mode) q = q.eq("mode", mode);
      const { data } = await q.order("base_rate", { ascending: true }).limit(20);
      return data || [];
    },
  });

  const { data: existingRate } = useQuery({
    queryKey: ["pricing-shipment-rate", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("shipment_rates").select("*").eq("shipment_id", shipmentId).eq("is_selected", true).limit(1).maybeSingle();
      return data;
    },
  });

  const selectedRate = useMemo(() => {
    if (selectedRateId) return carrierRates?.find((r: any) => r.id === selectedRateId);
    return null;
  }, [selectedRateId, carrierRates]);

  const carrierBuyRate = selectedRate ? Number(selectedRate.base_rate) : (existingRate ? Number(existingRate.total_buy_rate || existingRate.total_freight || existingRate.base_rate || 0) : 0);

  /* ── Core calculations ── */
  const calc = useMemo(() => {
    const type = (shipmentType || mode || "fcl").toLowerCase();
    const margins = MARGIN_TARGETS[type] || MARGIN_TARGETS.fcl;

    const totalDirect = carrierBuyRate + costs.thc + costs.documentation + costs.portFees + costs.carrierSurcharges + costs.otherDirect + costs.trucking + costs.customs + costs.insurance;
    const totalVariable = costs.paymentProcessing + costs.agentCommission + costs.platformTxn + costs.customerSupport + costs.otherVariable;
    const totalMonthly = costs.monthlySoftware + costs.monthlyTeam + costs.monthlyOverhead + costs.monthlyMarketing + costs.monthlyTech;
    const fixedPerShipment = costs.monthlyVolume > 0 ? totalMonthly / costs.monthlyVolume : 0;
    const totalNetwork = costs.referralPayout + costs.collaborationPayout + costs.otherPayout;
    const trueCost = totalDirect + totalVariable + fixedPerShipment + totalNetwork;

    // Margin logic
    const baseMargin = margins.target;
    const adjustedMargin = manualMarginOverride ?? Math.max(
      margins.min,
      baseMargin + (URGENCY_ADJ[urgency] || 0) + (CAPACITY_ADJ[capacity] || 0) + (CUSTOMER_ADJ[customerType] || 0) + competitionAdj
    );

    const breakEven = trueCost;
    const minSell = trueCost / (1 - margins.min / 100);
    const recommendedSell = trueCost / (1 - adjustedMargin / 100);
    const stretchSell = trueCost / (1 - margins.stretch / 100);

    const sellPrice = recommendedSell;
    const grossProfit = sellPrice - totalDirect;
    const contributionProfit = sellPrice - totalDirect - totalVariable;
    const netProfit = sellPrice - trueCost;
    const grossMargin = sellPrice > 0 ? (grossProfit / sellPrice) * 100 : 0;
    const contributionMargin = sellPrice > 0 ? (contributionProfit / sellPrice) * 100 : 0;
    const netMargin = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;

    // Revenue split
    const splitConfig = splitType === "no_network"
      ? { platform: 1, referral: 0, collab: 0 }
      : splitType === "referral_only"
      ? { platform: 0.7, referral: 0.3, collab: 0 }
      : splitType === "referral_collab"
      ? { platform: 0.6, referral: 0.2, collab: 0.2 }
      : { platform: 0.55, referral: 0.2, collab: 0.25 };

    const platformRetained = netProfit * splitConfig.platform;
    const referralShare = netProfit * splitConfig.referral;
    const collabShare = netProfit * splitConfig.collab;

    return {
      totalDirect, totalVariable, fixedPerShipment, totalNetwork, trueCost,
      baseMargin, adjustedMargin, margins,
      breakEven, minSell, recommendedSell, stretchSell,
      sellPrice, grossProfit, contributionProfit, netProfit,
      grossMargin, contributionMargin, netMargin,
      platformRetained, referralShare, collabShare,
    };
  }, [carrierBuyRate, costs, splitType, shipmentType, mode, urgency, capacity, customerType, competitionAdj, manualMarginOverride]);

  const isHealthy = calc.netMargin >= calc.margins.min;
  const isWarning = calc.netMargin >= 3 && calc.netMargin < calc.margins.min;
  const isDanger = calc.netMargin < 3;
  const needsApproval = isDanger || manualMarginOverride !== null || calc.platformRetained < 50;

  const handleSelectRate = (rateId: string) => {
    setSelectedRateId(rateId);
    setRateSearchOpen(false);
    toast.success("Carrier rate selected");
  };

  const updateCost = (key: string, value: string) => {
    setCosts(prev => ({ ...prev, [key]: Number(value) || 0 }));
  };

  /* ── Reusable sub-components ── */
  const CostRow = ({ label, field }: { label: string; field: string }) => (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <label className="text-xs text-muted-foreground whitespace-nowrap">{label}</label>
      <div className="relative w-24">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
        <Input
          type="number"
          value={(costs as any)[field] || ""}
          onChange={(e) => updateCost(field, e.target.value)}
          className="h-7 pl-5 text-xs bg-card border-border text-foreground w-full"
        />
      </div>
    </div>
  );

  const SectionToggle = ({ id, label, total, color, icon: Icon }: { id: string; label: string; total: number; color: string; icon: any }) => (
    <Collapsible open={(sections as any)[id]} onOpenChange={(o) => setSections(p => ({ ...p, [id]: o }))}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors">
        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${color}`}>{fmt(total)}</span>
          {(sections as any)[id] ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 pr-2 space-y-0.5 pb-2 pt-1">
        {id === "direct" && (
          <>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-xs text-muted-foreground">Carrier Buy Rate</span>
              <span className="text-xs font-bold text-emerald-500 w-24 text-right pr-2">{fmt(carrierBuyRate)}</span>
            </div>
            <CostRow label="Terminal Handling" field="thc" />
            <CostRow label="Documentation" field="documentation" />
            <CostRow label="Port Fees" field="portFees" />
            <CostRow label="Carrier Surcharges" field="carrierSurcharges" />
            <CostRow label="Trucking" field="trucking" />
            <CostRow label="Customs Clearance" field="customs" />
            <CostRow label="Insurance" field="insurance" />
            <CostRow label="Other Direct" field="otherDirect" />
          </>
        )}
        {id === "variable" && (
          <>
            <CostRow label="Payment Processing" field="paymentProcessing" />
            <CostRow label="Agent Commission" field="agentCommission" />
            <CostRow label="Platform Txn" field="platformTxn" />
            <CostRow label="Customer Support" field="customerSupport" />
            <CostRow label="Other Variable" field="otherVariable" />
          </>
        )}
        {id === "fixed" && (
          <>
            <CostRow label="Monthly Software" field="monthlySoftware" />
            <CostRow label="Monthly Team" field="monthlyTeam" />
            <CostRow label="Monthly Overhead" field="monthlyOverhead" />
            <CostRow label="Monthly Marketing" field="monthlyMarketing" />
            <CostRow label="Monthly Tech" field="monthlyTech" />
            <CostRow label="Monthly Volume" field="monthlyVolume" />
            <div className="pt-1.5 border-t border-border flex justify-between">
              <span className="text-[10px] text-muted-foreground">Per-Shipment Allocation</span>
              <span className="text-xs font-semibold text-purple-500">{fmtD(calc.fixedPerShipment)}</span>
            </div>
          </>
        )}
        {id === "network" && (
          <>
            <CostRow label="Referral Payout" field="referralPayout" />
            <CostRow label="Collaboration Payout" field="collaborationPayout" />
            <CostRow label="Other Payout" field="otherPayout" />
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  const MetricCard = ({ label, value, sub, variant = "default" }: { label: string; value: string; sub?: string; variant?: "default" | "highlight" | "danger" }) => (
    <div className={`rounded-lg p-3 border ${
      variant === "highlight" ? "bg-emerald-500/10 border-emerald-500/30" :
      variant === "danger" ? "bg-destructive/10 border-destructive/30" :
      "bg-card border-border"
    }`}>
      <span className="text-[10px] text-muted-foreground block mb-0.5">{label}</span>
      <span className={`text-sm font-bold ${
        variant === "highlight" ? "text-emerald-500" :
        variant === "danger" ? "text-destructive" :
        "text-foreground"
      }`}>{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground ml-1">{sub}</span>}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── HEADER BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">{shipmentRef || shipmentId?.slice(0, 8)}</h2>
              {status && <Badge variant="outline" className="text-[10px] h-5">{status.replace(/_/g, " ")}</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {originPort || "Origin"} → {destinationPort || "Destination"} • {(shipmentType || mode || "FCL").toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!needsApproval ? (
            <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
              <Check className="h-3 w-3" /> Apply Price
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-8 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1">
              <SendHorizonal className="h-3 w-3" /> Submit for Approval
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
            <Save className="h-3 w-3" /> Save Scenario
          </Button>
        </div>
      </div>

      {/* ── 3-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ═══ LEFT: COST INPUTS ═══ */}
        <div className="lg:col-span-4 space-y-3">
          {/* Carrier Rate */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-accent" />
                Carrier Rate
              </h3>
              <Button size="sm" variant="outline" onClick={() => setRateSearchOpen(!rateSearchOpen)}
                className="h-6 text-[10px] gap-1">
                <Search className="h-3 w-3" /> Search
              </Button>
            </div>

            {(selectedRate || existingRate) && (
              <div className="bg-secondary/50 border border-border rounded-lg p-2.5 mb-2 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Carrier</span>
                  <span className="text-xs text-foreground font-medium">{selectedRate?.carrier || existingRate?.carrier || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Buy Rate</span>
                  <span className="text-xs text-emerald-500 font-bold">{fmt(carrierBuyRate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Valid</span>
                  <span className="text-[10px] text-muted-foreground">{selectedRate?.valid_from || existingRate?.valid_from || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Transit</span>
                  <span className="text-[10px] text-muted-foreground">{selectedRate?.transit_days || existingRate?.transit_days || "—"}d</span>
                </div>
              </div>
            )}

            {rateSearchOpen && (
              <div className="border border-border rounded-lg bg-secondary/30 p-2 max-h-48 overflow-y-auto">
                {ratesLoading ? <Skeleton className="h-16" /> : (carrierRates || []).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-3">No matching rates</p>
                ) : (carrierRates || []).map((r: any) => (
                  <div key={r.id} onClick={() => handleSelectRate(r.id)}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors mb-0.5 ${
                      selectedRateId === r.id ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-secondary'
                    }`}>
                    <div className="flex-1 text-[10px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-foreground font-medium">{r.carrier}</span>
                        <span className="text-emerald-500 font-bold">{fmt(Number(r.base_rate))}</span>
                      </div>
                      <div className="text-muted-foreground">{r.origin_port} → {r.destination_port} • {r.transit_days || "—"}d</div>
                    </div>
                    {selectedRateId === r.id && <Check className="h-3 w-3 text-emerald-500 ml-1" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cost Build-Up */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Layers className="h-3.5 w-3.5 text-amber-500" />
              Cost Build-Up
            </h3>

            <SectionToggle id="direct" label="Direct Shipment Costs" total={calc.totalDirect} color="text-emerald-500" icon={DollarSign} />
            <SectionToggle id="variable" label="Variable Operational" total={calc.totalVariable} color="text-amber-500" icon={TrendingUp} />
            <SectionToggle id="fixed" label="Fixed Platform Allocation" total={calc.fixedPerShipment} color="text-purple-500" icon={Settings2} />
            <SectionToggle id="network" label="Network Payout" total={calc.totalNetwork} color="text-accent" icon={Zap} />

            <div className="mt-2 pt-2 border-t-2 border-border flex justify-between items-center px-1">
              <span className="text-xs font-bold text-foreground">True Total Cost</span>
              <span className="text-base font-black text-foreground">{fmt(calc.trueCost)}</span>
            </div>
          </div>
        </div>

        {/* ═══ CENTER: SELL PRICE ENGINE ═══ */}
        <div className="lg:col-span-4 space-y-3">
          {/* Margin Logic */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3">
              <Percent className="h-3.5 w-3.5 text-accent" />
              Margin Logic
            </h3>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Base Margin ({(shipmentType || mode || "FCL").toUpperCase()})</span>
                <span className="text-xs font-semibold text-foreground">{fmtPct(calc.baseMargin)}</span>
              </div>

              {/* Adjustments */}
              <div className="space-y-2 bg-secondary/30 rounded-lg p-2.5">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Urgency</label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard" className="text-xs">Standard (+0%)</SelectItem>
                      <SelectItem value="priority" className="text-xs">Priority (+1.5%)</SelectItem>
                      <SelectItem value="urgent" className="text-xs">Urgent (+3%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Capacity</label>
                  <Select value={capacity} onValueChange={setCapacity}>
                    <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loose" className="text-xs">Loose (−1%)</SelectItem>
                      <SelectItem value="normal" className="text-xs">Normal (+0%)</SelectItem>
                      <SelectItem value="tight" className="text-xs">Tight (+2%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Customer Type</label>
                  <Select value={customerType} onValueChange={setCustomerType}>
                    <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new" className="text-xs">New (+1%)</SelectItem>
                      <SelectItem value="existing" className="text-xs">Existing (+0%)</SelectItem>
                      <SelectItem value="high_volume" className="text-xs">High Volume (−1.5%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Competition Adj.</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[competitionAdj]}
                      onValueChange={([v]) => setCompetitionAdj(v)}
                      min={-3} max={3} step={0.5}
                      className="flex-1"
                    />
                    <span className="text-[10px] font-medium text-foreground w-10 text-right">{competitionAdj > 0 ? '+' : ''}{competitionAdj}%</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-border">
                <span className="text-xs font-semibold text-foreground">Final Adjusted Margin</span>
                <span className={`text-sm font-bold ${calc.adjustedMargin >= calc.margins.min ? 'text-emerald-500' : 'text-destructive'}`}>
                  {fmtPct(calc.adjustedMargin)}
                </span>
              </div>

              {showAdvanced && (
                <div className="pt-1">
                  <label className="text-[10px] text-muted-foreground block mb-1">Manual Override (%)</label>
                  <Input
                    type="number"
                    value={manualMarginOverride ?? ""}
                    onChange={(e) => setManualMarginOverride(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Leave blank for auto"
                    className="h-7 text-xs"
                  />
                </div>
              )}

              <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-[10px] text-accent hover:underline">
                {showAdvanced ? "Hide advanced" : "Show advanced options"}
              </button>
            </div>
          </div>

          {/* Price Output */}
          <div className="rounded-xl border-2 border-emerald-500/30 bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3">
              <Target className="h-3.5 w-3.5 text-emerald-500" />
              Price Output
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <MetricCard label="Break Even" value={fmt(calc.breakEven)} />
              <MetricCard label="Minimum Price" value={fmt(calc.minSell)} sub={`@ ${fmtPct(calc.margins.min)}`} />
            </div>

            {/* Hero card */}
            <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xl p-4 text-center mb-3">
              <span className="text-[10px] text-emerald-500/70 font-medium block mb-1">RECOMMENDED SELL PRICE</span>
              <span className="text-3xl font-black text-emerald-500 tracking-tight">{fmt(calc.recommendedSell)}</span>
              <span className="text-[10px] text-muted-foreground block mt-1">@ {fmtPct(calc.adjustedMargin)} margin</span>
            </div>

            <MetricCard label="Stretch Price" value={fmt(calc.stretchSell)} sub={`@ ${fmtPct(calc.margins.stretch)}`} />

            <p className="text-[9px] text-muted-foreground text-center mt-2 italic">
              Sell Price = True Cost ÷ (1 − Margin%)
            </p>
          </div>

          {/* Target guidance */}
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Target: {calc.margins.label}
            </span>
          </div>
        </div>

        {/* ═══ RIGHT: PROFIT & SPLIT ═══ */}
        <div className="lg:col-span-4 space-y-3">
          {/* Profit Visibility */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Profit Visibility
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-xs text-muted-foreground">Total Cost</span>
                <span className="text-xs font-semibold text-foreground">{fmt(calc.trueCost)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-xs text-muted-foreground">Sell Price</span>
                <span className="text-xs font-semibold text-emerald-500">{fmt(calc.sellPrice)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-xs text-muted-foreground">Gross Profit</span>
                <span className={`text-xs font-semibold ${calc.grossProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {fmt(calc.grossProfit)} <span className="text-[10px] text-muted-foreground">{fmtPct(calc.grossMargin)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="text-xs text-muted-foreground">Contribution Profit</span>
                <span className={`text-xs font-semibold ${calc.contributionProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {fmt(calc.contributionProfit)} <span className="text-[10px] text-muted-foreground">{fmtPct(calc.contributionMargin)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center py-2 bg-emerald-500/5 rounded-lg px-2 -mx-1">
                <span className="text-xs font-bold text-foreground">Net Profit</span>
                <span className={`text-base font-black ${calc.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {fmt(calc.netProfit)}
                </span>
              </div>
              <div className="text-center">
                <span className={`text-lg font-black ${isHealthy ? 'text-emerald-500' : isWarning ? 'text-amber-500' : 'text-destructive'}`}>
                  {fmtPct(calc.netMargin)}
                </span>
                <span className="text-[10px] text-muted-foreground block">Net Margin</span>
              </div>
            </div>
          </div>

          {/* Revenue Split */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3">
              <Shield className="h-3.5 w-3.5 text-accent" />
              Revenue Split
            </h3>

            <div className="mb-3">
              <Select value={splitType} onValueChange={setSplitType}>
                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_network" className="text-xs">No Network (100% Platform)</SelectItem>
                  <SelectItem value="referral_only" className="text-xs">Referral Only (70/30)</SelectItem>
                  <SelectItem value="referral_collab" className="text-xs">Referral + Collab (60/20/20)</SelectItem>
                  <SelectItem value="complex" className="text-xs">Complex Deal (55/20/25)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <span className="text-[10px] text-emerald-500/70 block mb-0.5">Platform Retained</span>
                <span className="text-sm font-black text-emerald-500">{fmt(calc.platformRetained)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card border border-border rounded-lg p-2.5">
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Referral</span>
                  <span className="text-xs font-semibold text-amber-500">{fmt(calc.referralShare)}</span>
                </div>
                <div className="bg-card border border-border rounded-lg p-2.5">
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Collaboration</span>
                  <span className="text-xs font-semibold text-accent">{fmt(calc.collabShare)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Margin Engine */}
          <div className="rounded-xl border border-border bg-card p-4">
            <DynamicMarginPanel
              shipmentType={shipmentType || mode || "fcl"}
              carrierBuyRate={carrierBuyRate}
              currentMargin={calc.adjustedMargin}
            />
          </div>

          {/* Rate Intelligence */}
          <div className="rounded-xl border border-border bg-card p-4">
            <RateIntelligencePanel
              carrierBuyRate={carrierBuyRate}
              shipmentType={shipmentType || mode || "fcl"}
              customerType={customerType}
              origin={originPort || ""}
              destination={destinationPort || ""}
            />
          </div>

          {/* AI Pricing Recommendation */}
          <div className="rounded-xl border border-border bg-card p-4">
            <AiPricingRecommendation
              carrierBuyRate={carrierBuyRate}
              trueCost={calc.trueCost}
              currentMargin={calc.adjustedMargin}
              currentSellPrice={calc.sellPrice}
              netProfit={calc.netProfit}
              platformRetained={calc.platformRetained}
              shipmentType={shipmentType || mode || "fcl"}
              customerType={customerType}
              urgency={urgency}
              onApplyRecommendation={(margin) => {
                setManualMarginOverride(margin);
                toast.success("AI recommendation applied");
              }}
            />
          </div>

          {/* What-If Simulator */}
          <WhatIfSimulator
            carrierBuyRate={carrierBuyRate}
            trueCost={calc.trueCost}
            currentMargin={calc.adjustedMargin}
            currentSellPrice={calc.sellPrice}
            netProfit={calc.netProfit}
            platformRetained={calc.platformRetained}
            shipmentType={shipmentType || mode || "fcl"}
          />

          {/* Deal Negotiation Assistant */}
          <DealNegotiationAssistant
            carrierBuyRate={carrierBuyRate}
            trueCost={calc.trueCost}
            currentMargin={calc.adjustedMargin}
            currentSellPrice={calc.sellPrice}
            netProfit={calc.netProfit}
            platformRetained={calc.platformRetained}
            shipmentType={shipmentType || mode || "fcl"}
            customerType={customerType}
          />

          {/* Customer Response Predictor */}
          <CustomerResponsePredictor
            currentSellPrice={calc.sellPrice}
            trueCost={calc.trueCost}
            currentMargin={calc.adjustedMargin}
            netProfit={calc.netProfit}
            platformRetained={calc.platformRetained}
            shipmentType={shipmentType || mode || "fcl"}
            customerType={customerType}
            urgency={urgency}
          />

          {/* Deal Score */}
          <div className="rounded-xl border border-border bg-card p-4">
            <DealScorePanel
              netProfit={calc.netProfit}
              platformRetained={calc.platformRetained}
              netMargin={calc.netMargin}
              sellPrice={calc.sellPrice}
              trueCost={calc.trueCost}
              customerType={customerType}
              urgency={urgency}
              shipmentType={shipmentType || mode || "fcl"}
            />
          </div>

          {/* Alerts */}
          <div className="space-y-2">
            {isDanger && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-destructive block">Critical: Below Threshold</span>
                  <span className="text-[10px] text-destructive/80">Net margin is below minimum. Approval required before applying.</span>
                </div>
              </div>
            )}
            {isWarning && !isDanger && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-amber-500 block">Warning: Below Target</span>
                  <span className="text-[10px] text-amber-500/80">Margin is below target range. Consider adjustments.</span>
                </div>
              </div>
            )}
            {isHealthy && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-emerald-500 block">Healthy Margin</span>
                  <span className="text-[10px] text-emerald-500/80">Pricing meets or exceeds target margins.</span>
                </div>
              </div>
            )}
            {calc.sellPrice < calc.trueCost && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-destructive block">Sell Price Below Cost</span>
                  <span className="text-[10px] text-destructive/80">This shipment will lose money at the current sell price.</span>
                </div>
              </div>
            )}
          </div>

          {/* Profit Summary Table */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-2">Profit Summary</h3>
            <div className="space-y-1 text-[10px]">
              {[
                ["Direct Cost", fmt(calc.totalDirect)],
                ["Variable Cost", fmt(calc.totalVariable)],
                ["Fixed Allocation", fmtD(calc.fixedPerShipment)],
                ["Network Payout", fmt(calc.totalNetwork)],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-muted-foreground"><span>{l}</span><span>{v}</span></div>
              ))}
              <div className="border-t border-border pt-1 flex justify-between font-semibold text-foreground">
                <span>True Total Cost</span><span>{fmt(calc.trueCost)}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-500">
                <span>Sell Price</span><span>{fmt(calc.sellPrice)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between font-bold text-emerald-500">
                <span>Net Profit</span><span>{fmt(calc.netProfit)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Platform Revenue</span><span>{fmt(calc.platformRetained)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Network Revenue</span><span>{fmt(calc.referralShare + calc.collabShare)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
