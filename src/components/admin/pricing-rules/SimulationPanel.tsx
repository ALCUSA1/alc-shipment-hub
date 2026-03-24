import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Play, Sparkles, AlertTriangle, Check, ShieldCheck, ArrowRight } from "lucide-react";
import type { SimulationInput, SimulationOutput, ShipmentMode, CustomerSegment } from "./types";
import {
  DEFAULT_PROMO_RULE, DEFAULT_CUSTOMER_RULES, DEFAULT_LANE_RULES,
  DEFAULT_SHIPMENT_TYPE_RULES, DEFAULT_PROFIT_PROTECTION, DEFAULT_APPROVAL_RULES,
  PRICING_MODE_LABELS,
} from "./defaults";

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function SimulationPanel() {
  const [input, setInput] = useState<SimulationInput>({
    carrierBuyRate: 1800,
    shipmentType: "fcl",
    customerType: "existing",
    tradeLane: "ASIA-USWC",
    promoDetected: true,
    competitionLevel: "normal",
    urgency: "standard",
  });
  const [hasRun, setHasRun] = useState(false);

  const output = useMemo<SimulationOutput | null>(() => {
    if (!hasRun) return null;

    const rules: string[] = [];
    const reasoning: string[] = [];
    let pricingMode = DEFAULT_PROMO_RULE.defaultAction;
    let savingsRetention = DEFAULT_PROMO_RULE.minSavingsRetention;
    let maxPass = DEFAULT_PROMO_RULE.maxPassThrough;
    let minRetained = DEFAULT_PROMO_RULE.minRetainedProfit;
    let approvalRequired = false;

    // 1. Profit protection (highest priority)
    const pp = DEFAULT_PROFIT_PROTECTION;
    const stRule = DEFAULT_SHIPMENT_TYPE_RULES.find(r => r.mode === input.shipmentType);
    const minMargin = stRule?.minMargin ?? pp.minNetMarginByType[input.shipmentType];
    minRetained = Math.max(minRetained, stRule?.minRetainedProfit ?? 0, pp.minRetainedProfitByType[input.shipmentType]);
    rules.push("Profit Protection: Break-even guard active");
    reasoning.push(`Minimum margin floor: ${minMargin}% — minimum retained profit: ${fmt(minRetained)}`);

    // 2. Shipment type rules
    if (stRule) {
      pricingMode = stRule.promoHandling;
      rules.push(`Shipment Type Rule: ${stRule.label}`);
      reasoning.push(`${stRule.label} default target margin: ${stRule.targetMargin}%`);
    }

    // 3. Lane strategy
    const laneRule = DEFAULT_LANE_RULES.find(r => r.tradeLane === input.tradeLane);
    if (laneRule && laneRule.isActive) {
      pricingMode = laneRule.defaultPricingMode;
      savingsRetention = laneRule.promoRetention;
      maxPass = laneRule.maxPassThrough;
      rules.push(`Lane Strategy: ${laneRule.name}`);
      reasoning.push(`${laneRule.name} — competition: ${laneRule.competitionLevel}, growth lane: ${laneRule.isGrowthLane ? "yes" : "no"}`);
    }

    // 4. Customer strategy
    const custRule = DEFAULT_CUSTOMER_RULES.find(r => r.segment === input.customerType);
    if (custRule && custRule.isActive) {
      pricingMode = custRule.defaultPricingMode;
      maxPass = Math.min(maxPass, custRule.maxPassThrough);
      minRetained = Math.max(minRetained, custRule.minRetainedProfit);
      rules.push(`Customer Strategy: ${custRule.label}`);
      reasoning.push(custRule.notes);
    }

    // 5. Promo handling
    const historicalAvg = input.carrierBuyRate * 1.15;
    const promoSavings = input.promoDetected ? historicalAvg - input.carrierBuyRate : 0;
    if (input.promoDetected && promoSavings > 0) {
      rules.push("Promo Rate Handling: Active");
      const retained = promoSavings * (savingsRetention / 100);
      const passed = promoSavings * (Math.min(maxPass, 100 - savingsRetention) / 100);
      reasoning.push(`Promo savings: ${fmt(promoSavings)} — retaining ${fmt(retained)} (${savingsRetention}%), passing ${fmt(passed)} (${(100 - savingsRetention).toFixed(0)}%)`);
    }

    // 6. Approval escalation
    for (const esc of DEFAULT_APPROVAL_RULES) {
      if (!esc.isActive) continue;
      if (esc.conditionType === "new_customer_promo" && input.customerType === "new" && input.promoDetected) {
        approvalRequired = true;
        rules.push(`Approval: ${esc.name}`);
        reasoning.push("New customer receiving promo advantage — escalation required");
      }
    }

    // Calculate outputs
    const trueCost = input.carrierBuyRate * 1.35; // simplified cost build-up
    const margin = stRule?.targetMargin ?? 8;
    let sellPrice = trueCost / (1 - margin / 100);
    if (input.promoDetected) {
      const retainedSavings = promoSavings * (savingsRetention / 100);
      sellPrice += retainedSavings * 0.5; // partial boost
    }
    if (input.urgency === "urgent") sellPrice *= 1.04;
    if (input.urgency === "priority") sellPrice *= 1.02;

    const netProfit = sellPrice - trueCost;
    const platformProfit = netProfit * 0.7;

    if (platformProfit < minRetained) {
      approvalRequired = true;
      reasoning.push(`Platform profit ${fmt(platformProfit)} is below threshold ${fmt(minRetained)} — approval required`);
    }

    return {
      rulesFired: rules,
      pricingMode,
      savingsRetained: savingsRetention,
      savingsPassedThrough: 100 - savingsRetention,
      resultingSellPrice: sellPrice,
      resultingPlatformProfit: platformProfit,
      approvalRequired,
      reasoning,
    };
  }, [hasRun, input]);

  const update = <K extends keyof SimulationInput>(key: K, val: SimulationInput[K]) => {
    setInput(prev => ({ ...prev, [key]: val }));
    setHasRun(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Play className="h-4 w-4 text-violet-400" />
              Simulation Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Carrier Buy Rate</Label>
                <Input type="number" value={input.carrierBuyRate} onChange={e => update("carrierBuyRate", Number(e.target.value))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Shipment Type</Label>
                <Select value={input.shipmentType} onValueChange={v => update("shipmentType", v as ShipmentMode)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fcl">FCL</SelectItem>
                    <SelectItem value="lcl">LCL</SelectItem>
                    <SelectItem value="air">Air</SelectItem>
                    <SelectItem value="trucking">Trucking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Customer Type</Label>
                <Select value={input.customerType} onValueChange={v => update("customerType", v as CustomerSegment)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Customer</SelectItem>
                    <SelectItem value="existing">Existing</SelectItem>
                    <SelectItem value="high_volume">High Volume</SelectItem>
                    <SelectItem value="strategic">Strategic Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trade Lane</Label>
                <Select value={input.tradeLane} onValueChange={v => update("tradeLane", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASIA-USWC">Asia → US West Coast</SelectItem>
                    <SelectItem value="ASIA-EUR">Asia → Europe</SelectItem>
                    <SelectItem value="EUR-USEC">Europe → US East Coast</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Competition Level</Label>
                <Select value={input.competitionLevel} onValueChange={v => update("competitionLevel", v as any)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Urgency</Label>
                <Select value={input.urgency} onValueChange={v => update("urgency", v as any)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch checked={input.promoDetected} onCheckedChange={v => update("promoDetected", v)} />
              <Label className="text-sm">Promo Rate Detected</Label>
            </div>
            <Separator />
            <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => setHasRun(true)}>
              <Play className="h-4 w-4 mr-2" /> Run Simulation
            </Button>
          </CardContent>
        </Card>

        {/* Output */}
        <Card className={output ? "border-violet-500/30" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              Simulation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!output ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Configure inputs and click "Run Simulation" to see results
              </div>
            ) : (
              <div className="space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pricing Mode</p>
                    <Badge className="mt-1 bg-violet-500/15 text-violet-400 border-violet-500/30 text-xs">
                      {PRICING_MODE_LABELS[output.pricingMode]}
                    </Badge>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Approval</p>
                    <Badge className={`mt-1 text-xs ${output.approvalRequired ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"}`}>
                      {output.approvalRequired ? "Required" : "Not Required"}
                    </Badge>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sell Price</p>
                    <p className="text-lg font-bold text-foreground">{fmt(output.resultingSellPrice)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Platform Profit</p>
                    <p className={`text-lg font-bold ${output.resultingPlatformProfit >= 150 ? "text-emerald-500" : "text-amber-400"}`}>
                      {fmt(output.resultingPlatformProfit)}
                    </p>
                  </div>
                </div>

                {input.promoDetected && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Savings Retained</p>
                      <p className="text-sm font-bold text-emerald-400">{output.savingsRetained}%</p>
                    </div>
                    <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Passed to Customer</p>
                      <p className="text-sm font-bold text-blue-400">{output.savingsPassedThrough}%</p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Rules Fired */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Rules Triggered ({output.rulesFired.length})</p>
                  <div className="space-y-1">
                    {output.rulesFired.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                        <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                        {r}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Reasoning */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">AI Reasoning</p>
                  <div className="space-y-1.5">
                    {output.reasoning.map((r, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <ArrowRight className="h-3 w-3 text-violet-400 mt-0.5 shrink-0" /> {r}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
