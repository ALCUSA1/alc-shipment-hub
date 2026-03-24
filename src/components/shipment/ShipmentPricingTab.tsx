import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Search, Check, AlertTriangle, DollarSign, TrendingUp, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const MARGIN_TARGETS: Record<string, { min: number; target: number; stretch: number }> = {
  fcl: { min: 0.06, target: 0.08, stretch: 0.10 },
  lcl: { min: 0.12, target: 0.17, stretch: 0.22 },
  air: { min: 0.10, target: 0.13, stretch: 0.16 },
  trucking: { min: 0.06, target: 0.09, stretch: 0.12 },
};

interface Props {
  shipmentId: string;
  shipmentType?: string;
  originPort?: string;
  destinationPort?: string;
  mode?: string;
}

export function ShipmentPricingTab({ shipmentId, shipmentType, originPort, destinationPort, mode }: Props) {
  const { user } = useAuth();
  const [rateSearchOpen, setRateSearchOpen] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [costSections, setCostSections] = useState({ direct: true, variable: false, fixed: false, network: false });

  // Cost inputs
  const [costs, setCosts] = useState({
    terminalHandling: 0, documentation: 0, portFees: 0, carrierSurcharges: 0, otherDirect: 0,
    trucking: 0, drayage: 0, customs: 0, warehousing: 0, insurance: 0, specialHandling: 0,
    paymentProcessing: 0, agentCommission: 0, platformTxn: 0, customerSupport: 0, otherVariable: 0,
    monthlySoftware: 5000, monthlyTeam: 15000, monthlyOverhead: 3000, monthlyMarketing: 2000, monthlyTech: 1500,
    monthlyVolume: 100,
    referralPayout: 0, collaborationPayout: 0, capacityResale: 0,
  });

  // Revenue split
  const [splitType, setSplitType] = useState("no_network");

  // Fetch carrier rates for search
  const { data: carrierRates, isLoading: ratesLoading } = useQuery({
    queryKey: ["carrier-rates-search", originPort, destinationPort, mode],
    queryFn: async () => {
      let q = supabase.from("carrier_rates").select("*").gte("valid_until", new Date().toISOString().split("T")[0]);
      if (originPort) q = q.ilike("origin_port", `%${originPort}%`);
      if (destinationPort) q = q.ilike("destination_port", `%${destinationPort}%`);
      if (mode) q = q.eq("mode", mode);
      const { data } = await q.order("base_rate", { ascending: true }).limit(20);
      return data || [];
    },
  });

  // Fetch existing shipment rate
  const { data: existingRate } = useQuery({
    queryKey: ["shipment-rate", shipmentId],
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

  // Calculations
  const calc = useMemo(() => {
    const type = (shipmentType || mode || "fcl").toLowerCase();
    const margins = MARGIN_TARGETS[type] || MARGIN_TARGETS.fcl;

    const totalDirectShipmentCost = carrierBuyRate + costs.terminalHandling + costs.documentation + costs.portFees + costs.carrierSurcharges + costs.otherDirect + costs.trucking + costs.drayage + costs.customs + costs.warehousing + costs.insurance + costs.specialHandling;
    const totalVariableCost = costs.paymentProcessing + costs.agentCommission + costs.platformTxn + costs.customerSupport + costs.otherVariable;
    const totalMonthlyFixed = costs.monthlySoftware + costs.monthlyTeam + costs.monthlyOverhead + costs.monthlyMarketing + costs.monthlyTech;
    const fixedPerShipment = costs.monthlyVolume > 0 ? totalMonthlyFixed / costs.monthlyVolume : 0;
    const totalNetworkPayout = costs.referralPayout + costs.collaborationPayout + costs.capacityResale;
    const trueTotalCost = totalDirectShipmentCost + totalVariableCost + fixedPerShipment + totalNetworkPayout;
    const breakEven = trueTotalCost;
    const minSell = trueTotalCost / (1 - margins.min);
    const recommendedSell = trueTotalCost / (1 - margins.target);
    const stretchSell = trueTotalCost / (1 - margins.stretch);

    const sellPrice = recommendedSell;
    const grossProfit = sellPrice - totalDirectShipmentCost;
    const contributionProfit = sellPrice - totalDirectShipmentCost - totalVariableCost;
    const netProfit = sellPrice - trueTotalCost;
    const grossMargin = sellPrice > 0 ? (grossProfit / sellPrice) * 100 : 0;
    const contributionMargin = sellPrice > 0 ? (contributionProfit / sellPrice) * 100 : 0;
    const netMargin = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;

    // Revenue split
    const splitConfig = splitType === "no_network"
      ? { platform: 1, referral: 0, collaboration: 0 }
      : splitType === "referral_only"
      ? { platform: 0.7, referral: 0.3, collaboration: 0 }
      : splitType === "referral_collab"
      ? { platform: 0.6, referral: 0.2, collaboration: 0.2 }
      : { platform: 0.55, referral: 0.2, collaboration: 0.25 };

    const platformRetained = netProfit * splitConfig.platform;
    const referralShare = netProfit * splitConfig.referral;
    const collaborationShare = netProfit * splitConfig.collaboration;

    return {
      carrierBuyRate, totalDirectShipmentCost, totalVariableCost, fixedPerShipment, totalNetworkPayout,
      trueTotalCost, breakEven, minSell, recommendedSell, stretchSell,
      sellPrice, grossProfit, contributionProfit, netProfit,
      grossMargin, contributionMargin, netMargin,
      platformRetained, referralShare, collaborationShare,
      margins,
    };
  }, [carrierBuyRate, costs, splitType, shipmentType, mode]);

  const isHealthy = calc.netMargin >= (calc.margins.min * 100);
  const isWarning = calc.netMargin >= 3 && calc.netMargin < (calc.margins.min * 100);
  const isDanger = calc.netMargin < 3;

  const handleSelectRate = (rateId: string) => {
    setSelectedRateId(rateId);
    setRateSearchOpen(false);
    toast.success("Carrier rate selected");
  };

  const updateCost = (key: string, value: string) => {
    setCosts(prev => ({ ...prev, [key]: Number(value) || 0 }));
  };

  const CostInput = ({ label, field }: { label: string; field: string }) => (
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs text-[hsl(220,10%,55%)] whitespace-nowrap">{label}</label>
      <div className="relative w-28">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[hsl(220,10%,40%)]">$</span>
        <Input
          type="number"
          value={(costs as any)[field] || ""}
          onChange={(e) => updateCost(field, e.target.value)}
          className="h-7 pl-5 text-xs bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white w-full"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Section 1: Carrier Feed Rate */}
      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-400" />
              Carrier Feed Rate
            </h3>
            <p className="text-[10px] text-[hsl(220,10%,40%)]">Select shipping line buy rate from feed</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setRateSearchOpen(!rateSearchOpen)}
            className="h-7 text-xs border-[hsl(220,15%,20%)] bg-[hsl(220,15%,12%)] text-white hover:bg-[hsl(220,15%,15%)]">
            <Search className="h-3 w-3 mr-1" /> Search Rates
          </Button>
        </div>

        {/* Selected rate display */}
        {(selectedRate || existingRate) && (
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3 mb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><span className="text-[10px] text-[hsl(220,10%,40%)] block">Carrier</span><span className="text-xs text-white font-medium">{selectedRate?.carrier || existingRate?.carrier || "—"}</span></div>
              <div><span className="text-[10px] text-[hsl(220,10%,40%)] block">Buy Rate</span><span className="text-xs text-emerald-400 font-bold">{fmt(carrierBuyRate)}</span></div>
              <div><span className="text-[10px] text-[hsl(220,10%,40%)] block">Valid</span><span className="text-xs text-[hsl(220,10%,60%)]">{selectedRate?.valid_from || existingRate?.valid_from || "—"} → {selectedRate?.valid_until || existingRate?.valid_until || "—"}</span></div>
              <div><span className="text-[10px] text-[hsl(220,10%,40%)] block">Transit</span><span className="text-xs text-[hsl(220,10%,60%)]">{selectedRate?.transit_days || existingRate?.transit_days || "—"} days</span></div>
            </div>
          </div>
        )}

        {/* Rate search panel */}
        {rateSearchOpen && (
          <div className="border border-[hsl(220,15%,16%)] rounded-lg bg-[hsl(220,15%,8%)] p-3 max-h-64 overflow-y-auto">
            {ratesLoading ? <Skeleton className="h-20 bg-[hsl(220,15%,15%)]" /> : (carrierRates || []).length === 0 ? (
              <p className="text-xs text-[hsl(220,10%,35%)] text-center py-4">No matching carrier rates found</p>
            ) : (carrierRates || []).map((r: any) => (
              <div key={r.id} onClick={() => handleSelectRate(r.id)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors mb-1 ${selectedRateId === r.id ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-[hsl(220,15%,12%)]'}`}>
                <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                  <span className="text-white font-medium">{r.carrier}</span>
                  <span className="text-[hsl(220,10%,50%)]">{r.origin_port} → {r.destination_port}</span>
                  <span className="text-emerald-400 font-bold">{fmt(Number(r.base_rate))}</span>
                  <span className="text-[hsl(220,10%,40%)]">{r.transit_days || "—"}d • {r.container_type}</span>
                </div>
                {selectedRateId === r.id && <Check className="h-3.5 w-3.5 text-emerald-400 ml-2" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Cost Build Up */}
      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          Cost Build Up
        </h3>

        {/* Direct Costs */}
        <Collapsible open={costSections.direct} onOpenChange={(o) => setCostSections(p => ({ ...p, direct: o }))}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-[hsl(220,15%,12%)] transition-colors mb-1">
            <span className="text-xs font-medium text-[hsl(220,10%,60%)]">A. Direct Shipment Costs</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 font-semibold">{fmt(calc.totalDirectShipmentCost)}</span>
              {costSections.direct ? <ChevronUp className="h-3 w-3 text-[hsl(220,10%,40%)]" /> : <ChevronDown className="h-3 w-3 text-[hsl(220,10%,40%)]" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-1.5 pb-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-[hsl(220,10%,55%)]">Carrier Buy Rate (from feed)</label>
              <span className="text-xs text-emerald-400 font-bold w-28 text-right">{fmt(carrierBuyRate)}</span>
            </div>
            <CostInput label="Terminal Handling" field="terminalHandling" />
            <CostInput label="Documentation" field="documentation" />
            <CostInput label="Port Fees" field="portFees" />
            <CostInput label="Carrier Surcharges" field="carrierSurcharges" />
            <CostInput label="Trucking" field="trucking" />
            <CostInput label="Drayage" field="drayage" />
            <CostInput label="Customs Clearance" field="customs" />
            <CostInput label="Warehousing" field="warehousing" />
            <CostInput label="Insurance" field="insurance" />
            <CostInput label="Special Handling" field="specialHandling" />
            <CostInput label="Other Direct" field="otherDirect" />
          </CollapsibleContent>
        </Collapsible>

        {/* Variable Costs */}
        <Collapsible open={costSections.variable} onOpenChange={(o) => setCostSections(p => ({ ...p, variable: o }))}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-[hsl(220,15%,12%)] transition-colors mb-1">
            <span className="text-xs font-medium text-[hsl(220,10%,60%)]">B. Variable Operational Costs</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-semibold">{fmt(calc.totalVariableCost)}</span>
              {costSections.variable ? <ChevronUp className="h-3 w-3 text-[hsl(220,10%,40%)]" /> : <ChevronDown className="h-3 w-3 text-[hsl(220,10%,40%)]" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-1.5 pb-2">
            <CostInput label="Payment Processing" field="paymentProcessing" />
            <CostInput label="Agent Commission" field="agentCommission" />
            <CostInput label="Platform Transaction" field="platformTxn" />
            <CostInput label="Customer Support" field="customerSupport" />
            <CostInput label="Other Variable" field="otherVariable" />
          </CollapsibleContent>
        </Collapsible>

        {/* Fixed Cost Allocation */}
        <Collapsible open={costSections.fixed} onOpenChange={(o) => setCostSections(p => ({ ...p, fixed: o }))}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-[hsl(220,15%,12%)] transition-colors mb-1">
            <span className="text-xs font-medium text-[hsl(220,10%,60%)]">C. Fixed Platform Cost Allocation</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-400 font-semibold">{fmt(calc.fixedPerShipment)}</span>
              {costSections.fixed ? <ChevronUp className="h-3 w-3 text-[hsl(220,10%,40%)]" /> : <ChevronDown className="h-3 w-3 text-[hsl(220,10%,40%)]" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-1.5 pb-2">
            <CostInput label="Monthly Software" field="monthlySoftware" />
            <CostInput label="Monthly Team / Salary" field="monthlyTeam" />
            <CostInput label="Monthly Overhead" field="monthlyOverhead" />
            <CostInput label="Monthly Marketing" field="monthlyMarketing" />
            <CostInput label="Monthly Tech Infra" field="monthlyTech" />
            <CostInput label="Monthly Shipment Volume" field="monthlyVolume" />
            <div className="pt-1 border-t border-[hsl(220,15%,15%)]">
              <div className="flex justify-between text-xs">
                <span className="text-[hsl(220,10%,45%)]">Fixed Cost Per Shipment</span>
                <span className="text-purple-400 font-semibold">{fmt(calc.fixedPerShipment)}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Network Payout */}
        <Collapsible open={costSections.network} onOpenChange={(o) => setCostSections(p => ({ ...p, network: o }))}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-[hsl(220,15%,12%)] transition-colors mb-1">
            <span className="text-xs font-medium text-[hsl(220,10%,60%)]">D. Network Payout</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-400 font-semibold">{fmt(calc.totalNetworkPayout)}</span>
              {costSections.network ? <ChevronUp className="h-3 w-3 text-[hsl(220,10%,40%)]" /> : <ChevronDown className="h-3 w-3 text-[hsl(220,10%,40%)]" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 space-y-1.5 pb-2">
            <CostInput label="Referral Payout" field="referralPayout" />
            <CostInput label="Collaboration Payout" field="collaborationPayout" />
            <CostInput label="Capacity Resale" field="capacityResale" />
          </CollapsibleContent>
        </Collapsible>

        {/* True Total Cost */}
        <div className="mt-3 pt-3 border-t border-[hsl(220,15%,15%)] flex justify-between items-center">
          <span className="text-xs font-semibold text-white">True Total Cost</span>
          <span className="text-sm font-bold text-white">{fmt(calc.trueTotalCost)}</span>
        </div>
      </div>

      {/* Section 3: Sell Rate Logic */}
      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Sell Rate & Pricing Output</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3">
            <span className="text-[10px] text-[hsl(220,10%,40%)] block mb-0.5">Carrier Buy Rate</span>
            <span className="text-sm text-[hsl(220,10%,60%)] font-semibold">{fmt(calc.carrierBuyRate)}</span>
          </div>
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3">
            <span className="text-[10px] text-[hsl(220,10%,40%)] block mb-0.5">Break Even</span>
            <span className="text-sm text-amber-400 font-semibold">{fmt(calc.breakEven)}</span>
          </div>
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3">
            <span className="text-[10px] text-[hsl(220,10%,40%)] block mb-0.5">Min Acceptable</span>
            <span className="text-sm text-amber-400 font-semibold">{fmt(calc.minSell)}</span>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
            <span className="text-[10px] text-emerald-400/70 block mb-0.5">Recommended Sell</span>
            <span className="text-lg text-emerald-400 font-bold">{fmt(calc.recommendedSell)}</span>
          </div>
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3">
            <span className="text-[10px] text-[hsl(220,10%,40%)] block mb-0.5">Stretch Sell</span>
            <span className="text-sm text-green-400 font-semibold">{fmt(calc.stretchSell)}</span>
          </div>
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3">
            <span className="text-[10px] text-[hsl(220,10%,40%)] block mb-0.5">Target Margin</span>
            <span className="text-sm text-white font-semibold">{fmtPct(calc.margins.target * 100)}</span>
          </div>
        </div>

        {/* Warnings */}
        {isDanger && (
          <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs text-red-400">Net margin below minimum threshold. Approval required.</span>
          </div>
        )}
        {isWarning && (
          <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-amber-400">Net margin below target. Review recommended.</span>
          </div>
        )}
      </div>

      {/* Section 4: Profit Visibility & Revenue Split */}
      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-400" />
          Profit Visibility & Revenue Split
        </h3>

        <div className="mb-3">
          <label className="text-[10px] text-[hsl(220,10%,40%)] block mb-1">Revenue Split Scenario</label>
          <Select value={splitType} onValueChange={setSplitType}>
            <SelectTrigger className="h-7 text-xs bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,18%)]">
              <SelectItem value="no_network" className="text-xs text-white">No Network (100% Platform)</SelectItem>
              <SelectItem value="referral_only" className="text-xs text-white">Referral Only (70/30)</SelectItem>
              <SelectItem value="referral_collab" className="text-xs text-white">Referral + Collab (60/20/20)</SelectItem>
              <SelectItem value="complex" className="text-xs text-white">Complex Deal (55/20/25)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3">
            <span className="text-[10px] text-[hsl(220,10%,40%)] block mb-0.5">Gross Profit</span>
            <span className={`text-sm font-semibold ${calc.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(calc.grossProfit)}</span>
            <span className="text-[10px] text-[hsl(220,10%,40%)] ml-1">{fmtPct(calc.grossMargin)}</span>
          </div>
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3">
            <span className="text-[10px] text-[hsl(220,10%,40%)] block mb-0.5">Contribution Profit</span>
            <span className={`text-sm font-semibold ${calc.contributionProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(calc.contributionProfit)}</span>
            <span className="text-[10px] text-[hsl(220,10%,40%)] ml-1">{fmtPct(calc.contributionMargin)}</span>
          </div>
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3">
            <span className="text-[10px] text-[hsl(220,10%,40%)] block mb-0.5">Net Profit</span>
            <span className={`text-sm font-bold ${calc.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(calc.netProfit)}</span>
            <span className="text-[10px] text-[hsl(220,10%,40%)] ml-1">{fmtPct(calc.netMargin)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
            <span className="text-[10px] text-green-400/70 block mb-0.5">Platform Retained</span>
            <span className="text-sm font-bold text-green-400">{fmt(calc.platformRetained)}</span>
          </div>
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3">
            <span className="text-[10px] text-[hsl(220,10%,40%)] block mb-0.5">Referral Share</span>
            <span className="text-sm font-semibold text-amber-400">{fmt(calc.referralShare)}</span>
          </div>
          <div className="bg-[hsl(220,15%,8%)] border border-[hsl(220,15%,16%)] rounded-lg p-3">
            <span className="text-[10px] text-[hsl(220,10%,40%)] block mb-0.5">Collaboration Share</span>
            <span className="text-sm font-semibold text-blue-400">{fmt(calc.collaborationShare)}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
          Apply Price
        </Button>
        <Button size="sm" variant="outline" className="text-xs border-[hsl(220,15%,20%)] bg-[hsl(220,15%,12%)] text-white hover:bg-[hsl(220,15%,15%)]">
          Save Pricing Scenario
        </Button>
        {isDanger && (
          <Button size="sm" variant="outline" className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
            Submit for Approval
          </Button>
        )}
      </div>
    </div>
  );
}
