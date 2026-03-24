import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  DollarSign, TrendingUp, Calculator, AlertTriangle, CheckCircle2,
  ChevronDown, Save, FileText, Shield, Users, Percent,
  Ship, Truck, Plane, Package, Target, Zap, BarChart3, Brain, Play,
} from "lucide-react";
import { RuleCategoryPanel } from "@/components/admin/pricing-rules/RuleCategoryPanel";
import { SimulationPanel } from "@/components/admin/pricing-rules/SimulationPanel";

/* ─── Constants ─── */
const SHIPMENT_TYPES = [
  { value: "fcl", label: "FCL (Full Container)", icon: Ship },
  { value: "lcl", label: "LCL (Less Container)", icon: Package },
  { value: "air", label: "Air Freight", icon: Plane },
  { value: "trucking", label: "Trucking / Drayage", icon: Truck },
];

const MARGIN_RANGES: Record<string, { min: number; max: number; default: number }> = {
  fcl: { min: 5, max: 10, default: 7 },
  lcl: { min: 10, max: 20, default: 15 },
  air: { min: 8, max: 15, default: 12 },
  trucking: { min: 5, max: 12, default: 8 },
};

const TARGET_MARGINS: Record<string, string> = {
  fcl: "$80 – $150 per shipment",
  lcl: "15% – 25% net margin",
  air: "10% – 20% net margin",
  trucking: "Competitive but positive",
};

const URGENCY_ADJ: Record<string, number> = { standard: 0, priority: 2, urgent: 4 };
const CAPACITY_ADJ: Record<string, number> = { loose: -2, normal: 0, tight: 3 };
const COMPETITION_ADJ: Record<string, number> = { high: -2.5, normal: 0, low: 3.5 };

const SPLIT_PRESETS = {
  none: { platform: 100, referral: 0, collaborator: 0 },
  referral: { platform: 70, referral: 30, collaborator: 0 },
  referral_collab: { platform: 60, referral: 20, collaborator: 20 },
  complex: { platform: 55, referral: 25, collaborator: 20 },
};

type SplitPreset = keyof typeof SPLIT_PRESETS;

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => n.toFixed(1) + "%";

const AdminPricingEngine = () => {
  /* ── Shipment details ── */
  const [shipmentType, setShipmentType] = useState("fcl");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [customerType, setCustomerType] = useState("existing");
  const [urgency, setUrgency] = useState("standard");
  const [capacity, setCapacity] = useState("normal");
  const [competition, setCompetition] = useState("normal");

  /* ── Direct costs ── */
  const [freightCost, setFreightCost] = useState(2500);
  const [truckingCost, setTruckingCost] = useState(800);
  const [terminalCharges, setTerminalCharges] = useState(350);
  const [docFees, setDocFees] = useState(125);
  const [customsCost, setCustomsCost] = useState(200);
  const [portFees, setPortFees] = useState(150);
  const [otherDirect, setOtherDirect] = useState(0);

  /* ── Variable costs ── */
  const [paymentProcessing, setPaymentProcessing] = useState(65);
  const [agentCommission, setAgentCommission] = useState(150);
  const [platformTxCost, setPlatformTxCost] = useState(25);
  const [supportCost, setSupportCost] = useState(40);
  const [insuranceCost, setInsuranceCost] = useState(75);
  const [otherVariable, setOtherVariable] = useState(0);

  /* ── Fixed costs ── */
  const [softwareCost, setSoftwareCost] = useState(5000);
  const [salaryCost, setSalaryCost] = useState(35000);
  const [overheadCost, setOverheadCost] = useState(8000);
  const [marketingCost, setMarketingCost] = useState(3000);
  const [techCost, setTechCost] = useState(4000);
  const [monthlyVolume, setMonthlyVolume] = useState(200);

  /* ── Network payouts ── */
  const [referralPayout, setReferralPayout] = useState(0);
  const [collabPayout, setCollabPayout] = useState(0);
  const [resalePayout, setResalePayout] = useState(0);
  const [otherNetwork, setOtherNetwork] = useState(0);

  /* ── Margin override ── */
  const [useDefaultMargin, setUseDefaultMargin] = useState(true);
  const [manualMargin, setManualMargin] = useState(10);

  /* ── Revenue split ── */
  const [splitPreset, setSplitPreset] = useState<SplitPreset>("none");
  const [platformSplit, setPlatformSplit] = useState(100);
  const [referralSplit, setReferralSplit] = useState(0);
  const [collabSplit, setCollabSplit] = useState(0);

  /* ── Safeguards ── */
  const [minMarginFloor, setMinMarginFloor] = useState(50);
  const [maxMarginCap, setMaxMarginCap] = useState(500);
  const [firstShipmentDiscount, setFirstShipmentDiscount] = useState(false);
  const [highVolumeDiscount, setHighVolumeDiscount] = useState(false);

  /* ── Collapsible state ── */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    direct: true, variable: false, fixed: false, network: false,
  });

  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  /* ── Calculations ── */
  const calcs = useMemo(() => {
    const directTotal = freightCost + truckingCost + terminalCharges + docFees + customsCost + portFees + otherDirect;
    const variableTotal = paymentProcessing + agentCommission + platformTxCost + supportCost + insuranceCost + otherVariable;
    const fixedMonthly = softwareCost + salaryCost + overheadCost + marketingCost + techCost;
    const fixedPerShipment = monthlyVolume > 0 ? fixedMonthly / monthlyVolume : 0;
    const networkTotal = referralPayout + collabPayout + resalePayout + otherNetwork;
    const trueCost = directTotal + variableTotal + fixedPerShipment + networkTotal;

    const range = MARGIN_RANGES[shipmentType] || MARGIN_RANGES.fcl;
    const baseMarginPct = useDefaultMargin ? range.default : manualMargin;
    const urgAdj = URGENCY_ADJ[urgency] || 0;
    const capAdj = CAPACITY_ADJ[capacity] || 0;
    const compAdj = COMPETITION_ADJ[competition] || 0;
    const adjustedMarginPct = baseMarginPct + urgAdj + capAdj + compAdj;

    let marginAmount = trueCost * (adjustedMarginPct / 100);

    // Discounts
    if (firstShipmentDiscount) marginAmount *= 0.85;
    if (highVolumeDiscount) marginAmount *= 0.9;

    // Safeguards
    marginAmount = Math.max(marginAmount, minMarginFloor);
    marginAmount = Math.min(marginAmount, maxMarginCap);

    const sellPrice = trueCost + marginAmount;
    const grossMargin = sellPrice - directTotal;
    const netMargin = sellPrice - trueCost;
    const grossMarginPct = sellPrice > 0 ? (grossMargin / sellPrice) * 100 : 0;
    const netMarginPct = sellPrice > 0 ? (netMargin / sellPrice) * 100 : 0;

    // Revenue split
    const totalSplitPct = platformSplit + referralSplit + collabSplit;
    const normPlatform = totalSplitPct > 0 ? platformSplit / totalSplitPct : 1;
    const normReferral = totalSplitPct > 0 ? referralSplit / totalSplitPct : 0;
    const normCollab = totalSplitPct > 0 ? collabSplit / totalSplitPct : 0;

    const platformShare = netMargin * normPlatform;
    const referralShare = netMargin * normReferral;
    const collabShare = netMargin * normCollab;
    const networkShare = referralShare + collabShare;

    // Warnings
    const warnings: string[] = [];
    if (netMargin < 0) warnings.push("Sell price is below true cost — this shipment loses money.");
    if (netMarginPct < 3 && netMargin >= 0) warnings.push("Net margin below 3% — dangerously thin.");
    if (netMarginPct < 5 && netMarginPct >= 3) warnings.push("Net margin below target (5%) — review pricing.");
    if (sellPrice < trueCost) warnings.push("Sell price is below minimum profitable threshold.");

    return {
      directTotal, variableTotal, fixedPerShipment, fixedMonthly, networkTotal, trueCost,
      baseMarginPct, adjustedMarginPct, marginAmount, sellPrice,
      grossMargin, netMargin, grossMarginPct, netMarginPct,
      platformShare, referralShare, collabShare, networkShare,
      warnings, range,
    };
  }, [
    freightCost, truckingCost, terminalCharges, docFees, customsCost, portFees, otherDirect,
    paymentProcessing, agentCommission, platformTxCost, supportCost, insuranceCost, otherVariable,
    softwareCost, salaryCost, overheadCost, marketingCost, techCost, monthlyVolume,
    referralPayout, collabPayout, resalePayout, otherNetwork,
    shipmentType, urgency, capacity, competition, useDefaultMargin, manualMargin,
    platformSplit, referralSplit, collabSplit,
    firstShipmentDiscount, highVolumeDiscount, minMarginFloor, maxMarginCap,
  ]);

  const handleSplitPreset = (preset: SplitPreset) => {
    setSplitPreset(preset);
    const s = SPLIT_PRESETS[preset];
    setPlatformSplit(s.platform);
    setReferralSplit(s.referral);
    setCollabSplit(s.collaborator);
  };

  const marginColor = calcs.netMarginPct >= 5 ? "text-emerald-400" : calcs.netMarginPct >= 0 ? "text-amber-400" : "text-red-400";
  const marginBg = calcs.netMarginPct >= 5 ? "bg-emerald-500/10 border-emerald-500/20" : calcs.netMarginPct >= 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";

  /* ── Input helper ── */
  const NumField = ({ label, value, onChange, prefix = "$" }: { label: string; value: number; onChange: (v: number) => void; prefix?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="pl-7 h-8 text-sm"
        />
      </div>
    </div>
  );

  const SectionHeader = ({ title, icon: Icon, total, sectionKey }: { title: string; icon: any; total: number; sectionKey: string }) => (
    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono font-bold text-foreground">${fmt(total)}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections[sectionKey] ? "rotate-180" : ""}`} />
      </div>
    </CollapsibleTrigger>
  );

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pricing Engine</h1>
        <p className="text-sm text-muted-foreground">LRN Cost Model — Calculate true cost, sell price, and revenue splits</p>
      </div>
      <Tabs defaultValue="calculator">
        <TabsList className="bg-transparent p-0 gap-1 mb-6">
          {[
            { value: "calculator", label: "Calculator", icon: Calculator },
            { value: "rules", label: "Margin Rules", icon: Target },
            { value: "splits", label: "Revenue Split Rules", icon: Users },
            { value: "brain", label: "Pricing Rules Brain", icon: Brain },
            { value: "simulation", label: "Simulation", icon: Play },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg px-4 py-2 text-xs font-medium border border-border"
            >
              <tab.icon className="h-3.5 w-3.5 mr-1.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="calculator" className="mt-0 space-y-6">
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Cost", value: `$${fmt(calcs.trueCost)}`, icon: DollarSign, color: "text-foreground" },
              { label: "Sell Price", value: `$${fmt(calcs.sellPrice)}`, icon: Target, color: "text-accent" },
              { label: "Gross Margin", value: `$${fmt(calcs.grossMargin)}`, icon: TrendingUp, color: "text-emerald-400" },
              { label: "Net Margin %", value: pct(calcs.netMarginPct), icon: Percent, color: marginColor },
              { label: "Platform Share", value: `$${fmt(calcs.platformShare)}`, icon: Shield, color: "text-blue-400" },
              { label: "Network Share", value: `$${fmt(calcs.networkShare)}`, icon: Users, color: "text-violet-400" },
            ].map(card => (
              <Card key={card.label} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <card.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{card.label}</span>
                  </div>
                  <p className={`text-lg font-bold font-mono ${card.color}`}>{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Warnings ── */}
          {calcs.warnings.length > 0 && (
            <div className="space-y-2">
              {calcs.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-sm text-red-300">{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* ── LEFT: Input Sections ── */}
            <div className="lg:col-span-2 space-y-4">
              {/* Shipment Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Ship className="h-4 w-4 text-accent" />
                    Shipment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Shipment Type</Label>
                      <Select value={shipmentType} onValueChange={setShipmentType}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SHIPMENT_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Origin</Label>
                      <Input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Shanghai" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Destination</Label>
                      <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g. Los Angeles" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Customer Type</Label>
                      <Select value={customerType} onValueChange={setCustomerType}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New Customer</SelectItem>
                          <SelectItem value="existing">Existing Customer</SelectItem>
                          <SelectItem value="high_volume">High Volume</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Urgency</Label>
                      <Select value={urgency} onValueChange={setUrgency}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard (0%)</SelectItem>
                          <SelectItem value="priority">Priority (+2%)</SelectItem>
                          <SelectItem value="urgent">Urgent (+4%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Capacity</Label>
                      <Select value={capacity} onValueChange={setCapacity}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="loose">Loose (-2%)</SelectItem>
                          <SelectItem value="normal">Normal (0%)</SelectItem>
                          <SelectItem value="tight">Tight (+3%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Competition</Label>
                      <Select value={competition} onValueChange={setCompetition}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High (-2.5%)</SelectItem>
                          <SelectItem value="normal">Normal (0%)</SelectItem>
                          <SelectItem value="low">Low (+3.5%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Sections — Collapsible */}
              {/* 1. Direct Cost */}
              <Card>
                <Collapsible open={openSections.direct} onOpenChange={() => toggleSection("direct")}>
                  <SectionHeader title="Direct Shipment Cost" icon={Package} total={calcs.directTotal} sectionKey="direct" />
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <NumField label="Ocean/Air Freight" value={freightCost} onChange={setFreightCost} />
                        <NumField label="Trucking Cost" value={truckingCost} onChange={setTruckingCost} />
                        <NumField label="Terminal Handling" value={terminalCharges} onChange={setTerminalCharges} />
                        <NumField label="Documentation Fees" value={docFees} onChange={setDocFees} />
                        <NumField label="Customs Clearance" value={customsCost} onChange={setCustomsCost} />
                        <NumField label="Port Fees" value={portFees} onChange={setPortFees} />
                        <NumField label="Other Direct" value={otherDirect} onChange={setOtherDirect} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* 2. Variable Cost */}
              <Card>
                <Collapsible open={openSections.variable} onOpenChange={() => toggleSection("variable")}>
                  <SectionHeader title="Variable Operational Cost" icon={Zap} total={calcs.variableTotal} sectionKey="variable" />
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <NumField label="Payment Processing" value={paymentProcessing} onChange={setPaymentProcessing} />
                        <NumField label="Agent Commission" value={agentCommission} onChange={setAgentCommission} />
                        <NumField label="Platform Tx Cost" value={platformTxCost} onChange={setPlatformTxCost} />
                        <NumField label="Customer Support" value={supportCost} onChange={setSupportCost} />
                        <NumField label="Insurance" value={insuranceCost} onChange={setInsuranceCost} />
                        <NumField label="Other Variable" value={otherVariable} onChange={setOtherVariable} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* 3. Fixed Cost */}
              <Card>
                <Collapsible open={openSections.fixed} onOpenChange={() => toggleSection("fixed")}>
                  <SectionHeader title="Fixed Platform Cost Allocation" icon={BarChart3} total={calcs.fixedPerShipment} sectionKey="fixed" />
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <NumField label="Software Cost /mo" value={softwareCost} onChange={setSoftwareCost} />
                        <NumField label="Team/Salary /mo" value={salaryCost} onChange={setSalaryCost} />
                        <NumField label="Office/Overhead /mo" value={overheadCost} onChange={setOverheadCost} />
                        <NumField label="Marketing /mo" value={marketingCost} onChange={setMarketingCost} />
                        <NumField label="Tech/Infra /mo" value={techCost} onChange={setTechCost} />
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Monthly Volume</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">#</span>
                            <Input type="number" value={monthlyVolume} onChange={e => setMonthlyVolume(Number(e.target.value) || 1)} className="pl-7 h-8 text-sm" />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total Monthly Fixed:</span>
                          <span className="font-mono font-medium">${fmt(calcs.fixedMonthly)}</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-muted-foreground">÷ {monthlyVolume} shipments =</span>
                          <span className="font-mono font-bold text-accent">${fmt(calcs.fixedPerShipment)} per shipment</span>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* 4. Network Payout */}
              <Card>
                <Collapsible open={openSections.network} onOpenChange={() => toggleSection("network")}>
                  <SectionHeader title="Network Payout Cost" icon={Users} total={calcs.networkTotal} sectionKey="network" />
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <NumField label="Referral Payout" value={referralPayout} onChange={setReferralPayout} />
                        <NumField label="Collaboration Payout" value={collabPayout} onChange={setCollabPayout} />
                        <NumField label="Capacity Resale" value={resalePayout} onChange={setResalePayout} />
                        <NumField label="Other Network" value={otherNetwork} onChange={setOtherNetwork} />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Profit Summary Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-accent" />
                    Profit Summary Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden">
                    {[
                      { label: "Direct Cost", value: calcs.directTotal, type: "cost" },
                      { label: "Variable Cost", value: calcs.variableTotal, type: "cost" },
                      { label: "Fixed Allocation", value: calcs.fixedPerShipment, type: "cost" },
                      { label: "Network Payout", value: calcs.networkTotal, type: "cost" },
                      { label: "True Total Cost", value: calcs.trueCost, type: "total" },
                      { label: "Sell Price", value: calcs.sellPrice, type: "sell" },
                      { label: "Gross Margin", value: calcs.grossMargin, type: "margin" },
                      { label: "Net Margin", value: calcs.netMargin, type: "margin" },
                      { label: "Platform Revenue", value: calcs.platformShare, type: "platform" },
                      { label: "Network Revenue", value: calcs.networkShare, type: "network" },
                    ].map((row, i) => (
                      <div
                        key={row.label}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                          row.type === "total" ? "bg-muted/70 font-bold border-t border-b border-border" :
                          row.type === "sell" ? "bg-accent/5 font-bold" :
                          i % 2 === 0 ? "bg-transparent" : "bg-muted/20"
                        }`}
                      >
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={`font-mono font-semibold ${
                          row.type === "margin" ? (row.value >= 0 ? "text-emerald-400" : "text-red-400") :
                          row.type === "sell" ? "text-accent" :
                          row.type === "platform" ? "text-blue-400" :
                          row.type === "network" ? "text-violet-400" :
                          "text-foreground"
                        }`}>
                          ${fmt(row.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── RIGHT: Sidebar Panels ── */}
            <div className="space-y-4">
              {/* Margin Logic */}
              <Card className={`border ${marginBg}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Percent className="h-4 w-4 text-accent" />
                    Margin Logic
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Default for {shipmentType.toUpperCase()}</span>
                      <Badge variant="secondary" className="text-[10px]">{calcs.range.min}% – {calcs.range.max}%</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={useDefaultMargin} onCheckedChange={setUseDefaultMargin} />
                      <Label className="text-xs">Use default ({calcs.range.default}%)</Label>
                    </div>
                    {!useDefaultMargin && (
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Manual Margin</span>
                          <span className="font-mono font-bold">{manualMargin}%</span>
                        </div>
                        <Slider value={[manualMargin]} onValueChange={([v]) => setManualMargin(v)} min={0} max={40} step={0.5} />
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Adjustments</span>
                    {[
                      { label: "Urgency", value: URGENCY_ADJ[urgency], name: urgency },
                      { label: "Capacity", value: CAPACITY_ADJ[capacity], name: capacity },
                      { label: "Competition", value: COMPETITION_ADJ[competition], name: competition },
                    ].map(adj => (
                      <div key={adj.label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{adj.label} ({adj.name})</span>
                        <span className={`font-mono ${adj.value > 0 ? "text-emerald-400" : adj.value < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                          {adj.value > 0 ? "+" : ""}{adj.value}%
                        </span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Adjusted Margin</span>
                      <span className={`font-mono ${marginColor}`}>{pct(calcs.adjustedMarginPct)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Target for {shipmentType.toUpperCase()}</div>
                    <div className="text-sm font-medium">{TARGET_MARGINS[shipmentType]}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Split */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    LRN Revenue Split
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "none", label: "No Network" },
                      { key: "referral", label: "Referral Only" },
                      { key: "referral_collab", label: "Ref + Collab" },
                      { key: "complex", label: "Complex Deal" },
                    ] as { key: SplitPreset; label: string }[]).map(p => (
                      <Button
                        key={p.key}
                        variant={splitPreset === p.key ? "default" : "outline"}
                        size="sm"
                        className="text-[10px] h-7"
                        onClick={() => handleSplitPreset(p.key)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Platform", value: platformSplit, onChange: setPlatformSplit, color: "text-blue-400" },
                      { label: "Referral", value: referralSplit, onChange: setReferralSplit, color: "text-amber-400" },
                      { label: "Collaborator", value: collabSplit, onChange: setCollabSplit, color: "text-violet-400" },
                    ].map(s => (
                      <div key={s.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className={`font-mono font-bold ${s.color}`}>{s.value}%</span>
                        </div>
                        <Slider value={[s.value]} onValueChange={([v]) => s.onChange(v)} min={0} max={100} step={5} />
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total Margin Pool</span>
                      <span className="font-mono font-bold">${fmt(calcs.netMargin)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Platform Share</span>
                      <span className="font-mono text-blue-400">${fmt(calcs.platformShare)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Referral Share</span>
                      <span className="font-mono text-amber-400">${fmt(calcs.referralShare)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Collaboration Share</span>
                      <span className="font-mono text-violet-400">${fmt(calcs.collabShare)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Safeguards */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" />
                    Safeguards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <NumField label="Minimum Margin Floor" value={minMarginFloor} onChange={setMinMarginFloor} />
                  <NumField label="Maximum Margin Cap" value={maxMarginCap} onChange={setMaxMarginCap} />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">First Shipment Discount (15%)</Label>
                    <Switch checked={firstShipmentDiscount} onCheckedChange={setFirstShipmentDiscount} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">High Volume Discount (10%)</Label>
                    <Switch checked={highVolumeDiscount} onCheckedChange={setHighVolumeDiscount} />
                  </div>
                </CardContent>
              </Card>

              {/* Recommended Price Output */}
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="p-4 space-y-3">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Recommended Sell Price</p>
                    <p className="text-3xl font-bold font-mono text-accent">${fmt(calcs.sellPrice)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Gross Margin</p>
                      <p className="text-sm font-mono font-bold text-emerald-400">{pct(calcs.grossMarginPct)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Net Margin</p>
                      <p className={`text-sm font-mono font-bold ${marginColor}`}>{pct(calcs.netMarginPct)}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Button className="w-full h-8 text-xs" onClick={() => toast.success("Pricing scenario saved")}>
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Save Pricing Scenario
                    </Button>
                    <Button variant="outline" className="w-full h-8 text-xs" onClick={() => toast.info("Creating quote from pricing...")}>
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Create Quote from This Price
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Margin Rules Tab ── */}
        <TabsContent value="rules" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Default Margin Rules by Shipment Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-5 gap-0 bg-muted/50 text-xs font-semibold text-muted-foreground">
                  {["Type", "Min %", "Max %", "Default %", "Target Profit"].map(h => (
                    <div key={h} className="px-4 py-2.5 border-b border-border">{h}</div>
                  ))}
                </div>
                {Object.entries(MARGIN_RANGES).map(([type, range]) => (
                  <div key={type} className="grid grid-cols-5 gap-0 text-sm">
                    <div className="px-4 py-3 font-medium border-b border-border">{type.toUpperCase()}</div>
                    <div className="px-4 py-3 font-mono border-b border-border">{range.min}%</div>
                    <div className="px-4 py-3 font-mono border-b border-border">{range.max}%</div>
                    <div className="px-4 py-3 font-mono font-bold text-accent border-b border-border">{range.default}%</div>
                    <div className="px-4 py-3 text-muted-foreground border-b border-border">{TARGET_MARGINS[type]}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-semibold">Dynamic Pricing Adjustments</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { title: "Urgency", items: [["Standard", "0%"], ["Priority", "+2%"], ["Urgent", "+4%"]] },
                    { title: "Capacity", items: [["Loose", "-2%"], ["Normal", "0%"], ["Tight", "+3%"]] },
                    { title: "Competition", items: [["High", "-2.5%"], ["Normal", "0%"], ["Low", "+3.5%"]] },
                  ].map(group => (
                    <Card key={group.title}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs">{group.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        {group.items.map(([label, adj]) => (
                          <div key={label} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={`font-mono ${adj.startsWith("+") ? "text-emerald-400" : adj.startsWith("-") ? "text-red-400" : "text-muted-foreground"}`}>{adj}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Revenue Split Rules Tab ── */}
        <TabsContent value="splits" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">LRN Revenue Split Presets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "No Network Involvement", desc: "Platform keeps 100% of margin", splits: { Platform: "100%" } },
                  { title: "Referral Only", desc: "User referred the customer or opportunity", splits: { Platform: "70%", Referral: "30%" } },
                  { title: "Referral + Collaboration", desc: "Multiple network participants contributed", splits: { Platform: "60%", Referral: "20%", Collaborator: "20%" } },
                  { title: "Complex Deal", desc: "Multi-party deal with extensive coordination", splits: { Platform: "55%", Referral: "25%", Collaborator: "20%" } },
                ].map(preset => (
                  <Card key={preset.title} className="border-border">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-1">{preset.title}</h4>
                      <p className="text-xs text-muted-foreground mb-3">{preset.desc}</p>
                      <div className="space-y-1">
                        {Object.entries(preset.splits).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-mono font-bold">{v}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
                <h4 className="text-sm font-semibold mb-2">Business Rules</h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> All splits are applied to the Net Margin (Sell Price − True Cost)</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> Splits are normalized to 100% regardless of individual slider values</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> Admin can override any preset for individual deals</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> Network payouts are separate from revenue splits — payouts are costs, splits are profit distribution</li>
                  <li className="flex items-start gap-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" /> If net margin is negative, no payouts are distributed to the network</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pricing Rules Brain ── */}
        <TabsContent value="brain" className="mt-0">
          <PricingRulesBrainTab />
        </TabsContent>

        {/* ── Simulation ── */}
        <TabsContent value="simulation" className="mt-0">
          <SimulationPanel />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminPricingEngine;
