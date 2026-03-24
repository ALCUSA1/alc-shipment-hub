import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Zap, Shield, Target, TrendingUp, AlertTriangle, Check,
  Settings2, Ship, Plane, Package, Truck, Brain, Eye,
  BarChart3, Lock, Unlock, Gauge,
} from "lucide-react";

type AutoMode = "safe" | "balanced" | "aggressive" | "manual";

const MODE_META: Record<AutoMode, { label: string; desc: string; color: string; icon: any }> = {
  safe: { label: "Safe Mode", desc: "Only high-confidence, rule-compliant deals", color: "text-emerald-500", icon: Shield },
  balanced: { label: "Balanced Mode", desc: "Moderate flexibility within rule boundaries", color: "text-blue-400", icon: Target },
  aggressive: { label: "Aggressive Mode", desc: "Maximize speed and win rate within limits", color: "text-amber-400", icon: Zap },
  manual: { label: "Manual Override", desc: "Always require human approval", color: "text-muted-foreground", icon: Lock },
};

const SHIPMENT_TYPES = [
  { value: "fcl", label: "FCL", icon: Ship },
  { value: "lcl", label: "LCL", icon: Package },
  { value: "air", label: "Air", icon: Plane },
  { value: "trucking", label: "Trucking", icon: Truck },
];

interface AutoConfig {
  enabled: boolean;
  mode: AutoMode;
  minConfidence: number;
  minMargin: number;
  minRetainedProfit: number;
  maxDiscount: number;
  maxNetworkPayout: number;
  allowedTypes: string[];
  allowedCustomerTypes: string[];
  autoSendToCustomer: boolean;
}

const DEFAULT_CONFIG: AutoConfig = {
  enabled: false,
  mode: "safe",
  minConfidence: 85,
  minMargin: 8,
  minRetainedProfit: 150,
  maxDiscount: 200,
  maxNetworkPayout: 35,
  allowedTypes: ["fcl", "lcl"],
  allowedCustomerTypes: ["existing", "high_volume"],
  autoSendToCustomer: false,
};

// Simulated auto-priced shipments for the review table
const MOCK_AUTO_PRICED = [
  { id: "SHP-2026-041", customer: "Apex Logistics", lane: "SHA → LAX", type: "FCL", confidence: 92, margin: 9.2, profit: 285, mode: "balanced", status: "auto_quoted" },
  { id: "SHP-2026-042", customer: "Pacific Imports", lane: "NGB → LGB", type: "FCL", confidence: 88, margin: 8.5, profit: 210, mode: "safe", status: "auto_quoted" },
  { id: "SHP-2026-043", customer: "Midwest Dist.", lane: "HKG → NYC", type: "LCL", confidence: 78, margin: 14.1, profit: 165, mode: "balanced", status: "pending_review" },
];

export function AutonomousPricingPanel() {
  const [config, setConfig] = useState<AutoConfig>(DEFAULT_CONFIG);
  const [showReview, setShowReview] = useState(false);

  const update = <K extends keyof AutoConfig>(key: K, value: AutoConfig[K]) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const toggleType = (type: string) => {
    update("allowedTypes", config.allowedTypes.includes(type)
      ? config.allowedTypes.filter(t => t !== type)
      : [...config.allowedTypes, type]);
  };

  const toggleCustomerType = (ct: string) => {
    update("allowedCustomerTypes", config.allowedCustomerTypes.includes(ct)
      ? config.allowedCustomerTypes.filter(t => t !== ct)
      : [...config.allowedCustomerTypes, ct]);
  };

  const modeMeta = MODE_META[config.mode];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Brain className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Autonomous Pricing Mode</h2>
            <p className="text-xs text-muted-foreground">Auto-generate quotes within predefined rules</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{config.enabled ? "Active" : "Disabled"}</span>
          <Switch checked={config.enabled} onCheckedChange={(v) => update("enabled", v)} />
          {config.enabled && (
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
              <Zap className="h-3 w-3" /> Live
            </Badge>
          )}
        </div>
      </div>

      {!config.enabled && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Autonomous pricing is currently disabled.</p>
          <p className="text-xs text-muted-foreground mt-1">Enable it above to auto-generate quotes.</p>
        </div>
      )}

      {config.enabled && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Configuration */}
          <div className="space-y-4">
            {/* Mode Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-accent" />
                  Auto-Quote Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(MODE_META) as [AutoMode, typeof MODE_META["safe"]][]).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => update("mode", key)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        config.mode === key
                          ? "border-violet-500/50 bg-violet-500/10"
                          : "border-border bg-card hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <meta.icon className={`h-3.5 w-3.5 ${meta.color}`} />
                        <span className="text-xs font-semibold text-foreground">{meta.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{meta.desc}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Thresholds */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-accent" />
                  Safety Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Minimum AI Confidence</Label>
                    <span className="text-xs font-semibold text-foreground">{config.minConfidence}%</span>
                  </div>
                  <Slider value={[config.minConfidence]} onValueChange={([v]) => update("minConfidence", v)} min={50} max={98} step={1} />
                  <p className="text-[10px] text-muted-foreground mt-1">Deals below this confidence require manual review</p>
                </div>
                <Separator />
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Minimum Margin %</Label>
                    <span className="text-xs font-semibold text-foreground">{config.minMargin}%</span>
                  </div>
                  <Slider value={[config.minMargin]} onValueChange={([v]) => update("minMargin", v)} min={3} max={25} step={0.5} />
                </div>
                <div>
                  <Label className="text-xs">Minimum Retained Profit ($)</Label>
                  <Input type="number" value={config.minRetainedProfit} onChange={e => update("minRetainedProfit", Number(e.target.value) || 0)} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Max Discount Allowed ($)</Label>
                  <Input type="number" value={config.maxDiscount} onChange={e => update("maxDiscount", Number(e.target.value) || 0)} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Max Network Payout %</Label>
                    <span className="text-xs font-semibold text-foreground">{config.maxNetworkPayout}%</span>
                  </div>
                  <Slider value={[config.maxNetworkPayout]} onValueChange={([v]) => update("maxNetworkPayout", v)} min={0} max={60} step={5} />
                </div>
              </CardContent>
            </Card>

            {/* Allowed Scope */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-accent" />
                  Allowed Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs mb-2 block">Shipment Types</Label>
                  <div className="flex gap-2 flex-wrap">
                    {SHIPMENT_TYPES.map(st => (
                      <button
                        key={st.value}
                        onClick={() => toggleType(st.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                          config.allowedTypes.includes(st.value)
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                            : "border-border bg-card text-muted-foreground hover:bg-secondary/50"
                        }`}
                      >
                        <st.icon className="h-3 w-3" />
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Customer Types</Label>
                  <div className="flex gap-2 flex-wrap">
                    {["new", "existing", "high_volume", "strategic"].map(ct => (
                      <button
                        key={ct}
                        onClick={() => toggleCustomerType(ct)}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                          config.allowedCustomerTypes.includes(ct)
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                            : "border-border bg-card text-muted-foreground hover:bg-secondary/50"
                        }`}
                      >
                        {ct.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Auto-Send Quote to Customer</Label>
                    <p className="text-[10px] text-muted-foreground">Automatically email quote after generation</p>
                  </div>
                  <Switch checked={config.autoSendToCustomer} onCheckedChange={v => update("autoSendToCustomer", v)} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Status & Review */}
          <div className="space-y-4">
            {/* Status Card */}
            <Card className="border-violet-500/30 bg-violet-500/5">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <modeMeta.icon className={`h-5 w-5 ${modeMeta.color}`} />
                  <div>
                    <p className="text-sm font-bold text-foreground">{modeMeta.label}</p>
                    <p className="text-[10px] text-muted-foreground">{modeMeta.desc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-black text-emerald-500">12</p>
                    <p className="text-[10px] text-muted-foreground">Auto-Quoted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-amber-400">3</p>
                    <p className="text-[10px] text-muted-foreground">Pending Review</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-foreground">87%</p>
                    <p className="text-[10px] text-muted-foreground">Avg Confidence</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Safety Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Safety Guardrails Active
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Confidence ≥ " + config.minConfidence + "%", met: true },
                  { label: "Margin ≥ " + config.minMargin + "%", met: true },
                  { label: "Retained Profit ≥ $" + config.minRetainedProfit, met: true },
                  { label: "Max Discount ≤ $" + config.maxDiscount, met: true },
                  { label: "Network Payout ≤ " + config.maxNetworkPayout + "%", met: true },
                  { label: "No missing cost inputs", met: true },
                  { label: "No rule violations", met: true },
                ].map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-muted-foreground">{g.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Auto-Priced Shipments */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4 text-accent" />
                    Recent Auto-Priced
                  </CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setShowReview(!showReview)}>
                    {showReview ? "Collapse" : "View All"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {MOCK_AUTO_PRICED.map(ship => (
                  <div key={ship.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-secondary/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{ship.id}</span>
                        <Badge className={`text-[9px] ${
                          ship.status === "auto_quoted" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        }`}>
                          {ship.status === "auto_quoted" ? "Auto-Quoted" : "Pending Review"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{ship.customer} • {ship.lane}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-emerald-500">${ship.profit}</p>
                      <p className="text-[10px] text-muted-foreground">{ship.margin}% • {ship.confidence}%</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Save */}
            <Button className="w-full" onClick={() => toast.success("Autonomous pricing configuration saved")}>
              Save Configuration
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
