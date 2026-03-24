import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Sparkles, Shield, Users, TrendingUp, Target, MapPin,
  Ship, Plane, Truck, Package, ShieldCheck, Brain, Save,
  AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  DEFAULT_PROMO_RULE, DEFAULT_CUSTOMER_RULES, DEFAULT_LANE_RULES,
  DEFAULT_SHIPMENT_TYPE_RULES, DEFAULT_PROFIT_PROTECTION, DEFAULT_AI_BOUNDARIES,
  DEFAULT_APPROVAL_RULES, RULE_TEMPLATES, PRICING_MODE_LABELS,
} from "./defaults";
import type {
  PromoHandlingRule, CustomerStrategyRule, ShipmentTypeRule,
  ProfitProtectionRule, AiBoundary, ApprovalEscalationRule,
} from "./types";

/* ─── Sub-panels ─── */

function PromoRulesPanel() {
  const [rule, setRule] = useState<PromoHandlingRule>(DEFAULT_PROMO_RULE);
  const update = <K extends keyof PromoHandlingRule>(k: K, v: PromoHandlingRule[K]) => setRule(prev => ({ ...prev, [k]: v }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Promo Advantage Strategy
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch checked={rule.isActive} onCheckedChange={v => update("isActive", v)} />
            <Badge className={rule.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"} variant="outline">
              {rule.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Promo Detection Threshold</Label>
            <div className="flex items-center gap-2">
              <Slider value={[rule.promoDetectionThreshold]} onValueChange={([v]) => update("promoDetectionThreshold", v)} min={5} max={30} step={1} className="flex-1" />
              <span className="text-sm font-mono w-10 text-right">{rule.promoDetectionThreshold}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Rate must be this % below historical avg to trigger</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Historical Lookback</Label>
            <Select value={String(rule.historicalLookbackDays)} onValueChange={v => update("historicalLookbackDays", Number(v))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Default Action When Promo Detected</Label>
          <Select value={rule.defaultAction} onValueChange={v => update("defaultAction", v as any)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRICING_MODE_LABELS).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Min Savings Retention</Label>
            <div className="flex items-center gap-2">
              <Slider value={[rule.minSavingsRetention]} onValueChange={([v]) => update("minSavingsRetention", v)} min={0} max={100} step={5} className="flex-1" />
              <span className="text-sm font-mono w-10 text-right">{rule.minSavingsRetention}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Max Pass-Through</Label>
            <div className="flex items-center gap-2">
              <Slider value={[rule.maxPassThrough]} onValueChange={([v]) => update("maxPassThrough", v)} min={0} max={100} step={5} className="flex-1" />
              <span className="text-sm font-mono w-10 text-right">{rule.maxPassThrough}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Min Retained Platform Profit</Label>
            <Input type="number" value={rule.minRetainedProfit} onChange={e => update("minRetainedProfit", Number(e.target.value))} className="h-8 text-sm" />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={rule.allowAggressiveForStrategic} onCheckedChange={v => update("allowAggressiveForStrategic", v)} />
            <Label className="text-xs">Allow aggressive pricing for strategic accounts</Label>
          </div>
        </div>

        <Button size="sm" onClick={() => toast.success("Promo rules saved")} className="w-full">
          <Save className="h-3 w-3 mr-1.5" /> Save Promo Rules
        </Button>
      </CardContent>
    </Card>
  );
}

function CustomerStrategyPanel() {
  const [rules, setRules] = useState<CustomerStrategyRule[]>(DEFAULT_CUSTOMER_RULES);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-400" />
          Customer Pricing Strategy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === rule.id ? null : rule.id)}
              className="flex items-center justify-between w-full p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Switch checked={rule.isActive} onCheckedChange={v => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: v } : r))} onClick={e => e.stopPropagation()} />
                <span className="text-sm font-medium">{rule.label}</span>
                <Badge variant="outline" className="text-[10px]">{PRICING_MODE_LABELS[rule.defaultPricingMode]}</Badge>
              </div>
              {expanded === rule.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {expanded === rule.id && (
              <div className="p-3 pt-0 space-y-3 border-t border-border">
                <p className="text-[11px] text-muted-foreground italic">{rule.notes}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Max Pass-Through</Label>
                    <div className="flex items-center gap-2">
                      <Slider value={[rule.maxPassThrough]} onValueChange={([v]) => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, maxPassThrough: v } : r))} min={0} max={100} step={5} className="flex-1" />
                      <span className="text-xs font-mono">{rule.maxPassThrough}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Min Margin Floor</Label>
                    <div className="flex items-center gap-2">
                      <Slider value={[rule.minMarginFloor]} onValueChange={([v]) => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, minMarginFloor: v } : r))} min={0} max={20} step={0.5} className="flex-1" />
                      <span className="text-xs font-mono">{rule.minMarginFloor}%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Min Retained Profit</Label>
                    <Input type="number" value={rule.minRetainedProfit} onChange={e => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, minRetainedProfit: Number(e.target.value) } : r))} className="h-7 text-xs" />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <Switch checked={rule.discountAllowed} onCheckedChange={v => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, discountAllowed: v } : r))} />
                    <Label className="text-xs">Discount Allowed</Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        <Button size="sm" onClick={() => toast.success("Customer rules saved")} className="w-full">
          <Save className="h-3 w-3 mr-1.5" /> Save Customer Rules
        </Button>
      </CardContent>
    </Card>
  );
}

function ShipmentTypePanel() {
  const [rules, setRules] = useState<ShipmentTypeRule[]>(DEFAULT_SHIPMENT_TYPE_RULES);
  const icons: Record<string, any> = { fcl: Ship, lcl: Package, air: Plane, trucking: Truck };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Ship className="h-4 w-4 text-cyan-400" />
          Shipment Type Pricing Logic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map(rule => {
            const Icon = icons[rule.mode] || Package;
            return (
              <div key={rule.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{rule.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Min", key: "minMargin" as const, color: "text-red-400" },
                    { label: "Target", key: "targetMargin" as const, color: "text-foreground" },
                    { label: "Stretch", key: "stretchMargin" as const, color: "text-emerald-400" },
                  ].map(m => (
                    <div key={m.key} className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{m.label} %</Label>
                      <Input
                        type="number"
                        value={rule[m.key]}
                        onChange={e => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, [m.key]: Number(e.target.value) } : r))}
                        className={`h-7 text-xs font-mono ${m.color}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Min Retained Profit ($)</Label>
                  <Input type="number" value={rule.minRetainedProfit} onChange={e => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, minRetainedProfit: Number(e.target.value) } : r))} className="h-7 text-xs" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={rule.approvalBelowMin} onCheckedChange={v => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, approvalBelowMin: v } : r))} />
                  <Label className="text-[10px]">Require approval below min</Label>
                </div>
              </div>
            );
          })}
        </div>
        <Button size="sm" onClick={() => toast.success("Shipment type rules saved")} className="w-full">
          <Save className="h-3 w-3 mr-1.5" /> Save Shipment Type Rules
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfitProtectionPanel() {
  const [pp, setPp] = useState<ProfitProtectionRule>(DEFAULT_PROFIT_PROTECTION);

  return (
    <Card className="border-red-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-red-400" />
          Profit Protection Rules
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">Critical</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Min Dollar Profit / Shipment</Label>
            <Input type="number" value={pp.minDollarProfitPerShipment} onChange={e => setPp(prev => ({ ...prev, minDollarProfitPerShipment: Number(e.target.value) }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max Network Payout %</Label>
            <div className="flex items-center gap-2">
              <Slider value={[pp.maxNetworkPayoutPercent]} onValueChange={([v]) => setPp(prev => ({ ...prev, maxNetworkPayoutPercent: v }))} min={0} max={60} step={5} className="flex-1" />
              <span className="text-sm font-mono">{pp.maxNetworkPayoutPercent}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max Total Discount ($)</Label>
            <Input type="number" value={pp.maxTotalDiscount} onChange={e => setPp(prev => ({ ...prev, maxTotalDiscount: Number(e.target.value) }))} className="h-8 text-sm" />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={pp.breakEvenProtection} onCheckedChange={v => setPp(prev => ({ ...prev, breakEvenProtection: v }))} />
            <Label className="text-xs font-medium">Break-even Protection Always On</Label>
          </div>
        </div>
        <Button size="sm" onClick={() => toast.success("Profit protection saved")} className="w-full">
          <Save className="h-3 w-3 mr-1.5" /> Save Protection Rules
        </Button>
      </CardContent>
    </Card>
  );
}

function AiBoundaryPanel() {
  const [ai, setAi] = useState<AiBoundary>(DEFAULT_AI_BOUNDARIES);

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-400" />
          AI Pricing Boundaries
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {[
            { key: "allowFullRetention" as const, label: "AI may recommend full savings retention" },
            { key: "allowPartialPassThrough" as const, label: "AI may recommend partial customer pass-through" },
            { key: "allowAggressiveStrategic" as const, label: "AI may recommend aggressive strategic pricing" },
            { key: "allowAutoApply" as const, label: "AI may auto-apply pricing under safe conditions" },
            { key: "requireApprovalBelowThreshold" as const, label: "Require approval when below thresholds" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <Label className="text-xs">{item.label}</Label>
              <Switch checked={ai[item.key]} onCheckedChange={v => setAi(prev => ({ ...prev, [item.key]: v }))} />
            </div>
          ))}
        </div>
        <Separator />
        <div className="space-y-3">
          <Label className="text-xs font-semibold">Confidence Thresholds</Label>
          {[
            { key: "lowConfidenceThreshold" as const, label: "Low (→ human review)", color: "text-red-400" },
            { key: "medConfidenceThreshold" as const, label: "Medium (→ suggest only)", color: "text-amber-400" },
            { key: "highConfidenceThreshold" as const, label: "High (→ allow apply)", color: "text-emerald-400" },
          ].map(item => (
            <div key={item.key} className="flex items-center gap-3">
              <Label className={`text-[11px] w-36 ${item.color}`}>{item.label}</Label>
              <Slider value={[ai[item.key]]} onValueChange={([v]) => setAi(prev => ({ ...prev, [item.key]: v }))} min={0} max={100} step={5} className="flex-1" />
              <span className="text-xs font-mono w-8 text-right">{ai[item.key]}%</span>
            </div>
          ))}
        </div>
        <Button size="sm" onClick={() => toast.success("AI boundaries saved")} className="w-full">
          <Save className="h-3 w-3 mr-1.5" /> Save AI Boundaries
        </Button>
      </CardContent>
    </Card>
  );
}

function ApprovalEscalationPanel() {
  const [rules, setRules] = useState<ApprovalEscalationRule[]>(DEFAULT_APPROVAL_RULES);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Approval Escalation Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Switch checked={rule.isActive} onCheckedChange={v => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: v } : r))} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{rule.name}</p>
              <p className="text-[10px] text-muted-foreground">{rule.condition}</p>
            </div>
            <Input
              type="number"
              value={rule.thresholdValue}
              onChange={e => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, thresholdValue: Number(e.target.value) } : r))}
              className="h-7 w-20 text-xs text-right"
            />
          </div>
        ))}
        <Button size="sm" onClick={() => toast.success("Escalation rules saved")} className="w-full">
          <Save className="h-3 w-3 mr-1.5" /> Save Escalation Rules
        </Button>
      </CardContent>
    </Card>
  );
}

function TemplatesPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-cyan-400" />
          Rule Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RULE_TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => toast.success(`Template "${tpl.name}" applied`)}
              className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Target className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold">{tpl.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{tpl.description}</p>
                <Badge variant="outline" className="text-[9px] mt-1">{tpl.category}</Badge>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main export ─── */

export function RuleCategoryPanel({ category }: { category: string }) {
  switch (category) {
    case "promo": return <PromoRulesPanel />;
    case "customer": return <CustomerStrategyPanel />;
    case "shipment_type": return <ShipmentTypePanel />;
    case "profit_protection": return <ProfitProtectionPanel />;
    case "ai_boundaries": return <AiBoundaryPanel />;
    case "approval": return <ApprovalEscalationPanel />;
    case "templates": return <TemplatesPanel />;
    default: return <PromoRulesPanel />;
  }
}
