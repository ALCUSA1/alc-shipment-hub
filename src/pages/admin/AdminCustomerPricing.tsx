import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Users, Target, Shield, TrendingUp, AlertTriangle, DollarSign,
  Settings2, BarChart3, Brain, Sparkles, Copy, Check, Edit2, Eye,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ── Types ── */
type CustomerTier = "new" | "standard" | "high_volume" | "strategic" | "house" | "risk_controlled";
type PriceSensitivity = "high" | "medium" | "low";
type PricingMode = "max_profit" | "balanced" | "win_rate" | "strategic_growth" | "relationship";

interface CustomerPricingProfile {
  id: string;
  customerName: string;
  tier: CustomerTier;
  pricingMode: PricingMode;
  sensitivity: PriceSensitivity;
  strategicAccount: boolean;
  marginFloor: number;
  targetMargin: number;
  stretchMargin: number;
  minRetainedProfit: number;
  maxPassThrough: number;
  promoSharing: boolean;
  autoQuote: boolean;
  approvalThreshold: number;
  totalShipments: number;
  totalRevenue: number;
  avgMargin: number;
  winRate: number;
  lifetimeProfit: number;
}

const TIER_LABELS: Record<CustomerTier, string> = {
  new: "New", standard: "Standard", high_volume: "High Volume",
  strategic: "Strategic", house: "House Account", risk_controlled: "Risk Controlled",
};

const MODE_LABELS: Record<PricingMode, string> = {
  max_profit: "Max Profit", balanced: "Balanced", win_rate: "Win Rate Optimized",
  strategic_growth: "Strategic Growth", relationship: "Relationship Protection",
};

const SENSITIVITY_COLORS: Record<PriceSensitivity, string> = {
  high: "text-red-400", medium: "text-amber-400", low: "text-emerald-400",
};

const STRATEGY_TEMPLATES = [
  { id: "margin_protection", name: "Margin Protection", mode: "max_profit" as PricingMode, passThrough: 10, minProfit: 200, desc: "Prioritize platform profit, low discount flexibility" },
  { id: "balanced", name: "Balanced Relationship", mode: "balanced" as PricingMode, passThrough: 25, minProfit: 150, desc: "Moderate sharing, healthy margin protection" },
  { id: "growth", name: "Growth Acquisition", mode: "strategic_growth" as PricingMode, passThrough: 40, minProfit: 100, desc: "Aggressive flexibility, controlled profit floor" },
  { id: "strategic_defense", name: "Strategic Defense", mode: "win_rate" as PricingMode, passThrough: 35, minProfit: 120, desc: "Strong competitiveness, require approval on drops" },
  { id: "premium", name: "Premium Service", mode: "max_profit" as PricingMode, passThrough: 15, minProfit: 250, desc: "Higher target margin, lower promo sharing" },
];

const MOCK_PROFILES: CustomerPricingProfile[] = [
  { id: "1", customerName: "Apex Logistics", tier: "strategic", pricingMode: "balanced", sensitivity: "medium", strategicAccount: true, marginFloor: 6, targetMargin: 9, stretchMargin: 12, minRetainedProfit: 180, maxPassThrough: 30, promoSharing: true, autoQuote: true, approvalThreshold: 150, totalShipments: 145, totalRevenue: 485000, avgMargin: 9.2, winRate: 72, lifetimeProfit: 44620 },
  { id: "2", customerName: "Pacific Imports", tier: "high_volume", pricingMode: "win_rate", sensitivity: "high", strategicAccount: false, marginFloor: 5, targetMargin: 8, stretchMargin: 11, minRetainedProfit: 120, maxPassThrough: 40, promoSharing: true, autoQuote: true, approvalThreshold: 100, totalShipments: 210, totalRevenue: 620000, avgMargin: 7.8, winRate: 78, lifetimeProfit: 48360 },
  { id: "3", customerName: "Midwest Distribution", tier: "standard", pricingMode: "balanced", sensitivity: "low", strategicAccount: false, marginFloor: 8, targetMargin: 12, stretchMargin: 15, minRetainedProfit: 200, maxPassThrough: 20, promoSharing: false, autoQuote: false, approvalThreshold: 180, totalShipments: 42, totalRevenue: 156000, avgMargin: 11.5, winRate: 58, lifetimeProfit: 17940 },
  { id: "4", customerName: "Euro Traders AG", tier: "new", pricingMode: "max_profit", sensitivity: "medium", strategicAccount: false, marginFloor: 10, targetMargin: 14, stretchMargin: 18, minRetainedProfit: 220, maxPassThrough: 15, promoSharing: false, autoQuote: false, approvalThreshold: 200, totalShipments: 8, totalRevenue: 28000, avgMargin: 13.2, winRate: 45, lifetimeProfit: 3696 },
  { id: "5", customerName: "Tech Parts Inc", tier: "strategic", pricingMode: "strategic_growth", sensitivity: "low", strategicAccount: true, marginFloor: 5, targetMargin: 8, stretchMargin: 10, minRetainedProfit: 150, maxPassThrough: 35, promoSharing: true, autoQuote: true, approvalThreshold: 120, totalShipments: 95, totalRevenue: 380000, avgMargin: 8.8, winRate: 74, lifetimeProfit: 33440 },
];

const PROFITABILITY_DATA = [
  { name: "Apex Logistics", profit: 44620, margin: 9.2 },
  { name: "Pacific Imports", profit: 48360, margin: 7.8 },
  { name: "Midwest Dist.", profit: 17940, margin: 11.5 },
  { name: "Euro Traders", profit: 3696, margin: 13.2 },
  { name: "Tech Parts Inc", profit: 33440, margin: 8.8 },
];

const AdminCustomerPricing = () => {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const selected = MOCK_PROFILES.find(p => p.id === selectedProfile);

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-5 w-5 text-violet-400" />
          <h1 className="text-2xl font-bold">Customer Pricing Brain</h1>
        </div>
        <p className="text-sm text-muted-foreground">Customer-specific pricing profiles, strategies, and intelligence</p>
      </div>

      <Tabs defaultValue="profiles">
        <TabsList className="bg-transparent p-0 gap-1 mb-6">
          {[
            { value: "profiles", label: "Pricing Profiles", icon: Users },
            { value: "intelligence", label: "Profitability Intelligence", icon: BarChart3 },
            { value: "templates", label: "Strategy Templates", icon: Sparkles },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg px-4 py-2 text-xs font-medium border border-border">
              <tab.icon className="h-3.5 w-3.5 mr-1.5" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Profiles Tab ── */}
        <TabsContent value="profiles" className="mt-0">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Customer List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Customer Pricing Profiles</CardTitle>
                    <Button size="sm" variant="outline" className="text-xs h-7">+ New Profile</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Tier</TableHead>
                        <TableHead className="text-xs">Mode</TableHead>
                        <TableHead className="text-xs">Sensitivity</TableHead>
                        <TableHead className="text-xs text-right">Avg Margin</TableHead>
                        <TableHead className="text-xs text-right">Win Rate</TableHead>
                        <TableHead className="text-xs text-right">Profit</TableHead>
                        <TableHead className="text-xs w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MOCK_PROFILES.map(p => (
                        <TableRow key={p.id} className={`cursor-pointer ${selectedProfile === p.id ? "bg-accent/10" : ""}`} onClick={() => setSelectedProfile(p.id)}>
                          <TableCell className="font-medium text-xs">
                            <div className="flex items-center gap-2">
                              {p.customerName}
                              {p.strategicAccount && <Badge variant="outline" className="text-[8px] h-4 text-violet-400 border-violet-400/30">Strategic</Badge>}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className="text-[9px]">{TIER_LABELS[p.tier]}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{MODE_LABELS[p.pricingMode]}</TableCell>
                          <TableCell><span className={`text-xs font-semibold ${SENSITIVITY_COLORS[p.sensitivity]}`}>{p.sensitivity}</span></TableCell>
                          <TableCell className="text-right text-xs font-mono">{p.avgMargin}%</TableCell>
                          <TableCell className="text-right text-xs font-mono">{p.winRate}%</TableCell>
                          <TableCell className="text-right text-xs font-mono text-emerald-400">${p.lifetimeProfit.toLocaleString()}</TableCell>
                          <TableCell><Eye className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Profile Detail */}
            <div>
              {selected ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{selected.customerName}</CardTitle>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditMode(!editMode)}>
                        <Edit2 className="h-3 w-3 mr-1" />{editMode ? "Cancel" : "Edit"}
                      </Button>
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[9px]">{TIER_LABELS[selected.tier]}</Badge>
                      {selected.strategicAccount && <Badge variant="outline" className="text-[9px] text-violet-400 border-violet-400/30">Strategic</Badge>}
                      <Badge variant="outline" className="text-[9px]">{MODE_LABELS[selected.pricingMode]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Margin Rules */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Margin Rules</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-border p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">Floor</p>
                          <p className="text-sm font-bold text-red-400">{selected.marginFloor}%</p>
                        </div>
                        <div className="rounded-lg border border-accent/30 bg-accent/5 p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">Target</p>
                          <p className="text-sm font-bold text-accent">{selected.targetMargin}%</p>
                        </div>
                        <div className="rounded-lg border border-border p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">Stretch</p>
                          <p className="text-sm font-bold text-emerald-400">{selected.stretchMargin}%</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Commercial Controls */}
                    <div className="space-y-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Commercial Controls</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Min Retained Profit</span>
                          <span className="text-xs font-semibold">${selected.minRetainedProfit}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Max Pass-Through</span>
                          <span className="text-xs font-semibold">{selected.maxPassThrough}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Approval Threshold</span>
                          <span className="text-xs font-semibold">${selected.approvalThreshold}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Promo Sharing</span>
                          <Badge variant={selected.promoSharing ? "default" : "secondary"} className="text-[9px]">{selected.promoSharing ? "Allowed" : "Blocked"}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Auto Quote</span>
                          <Badge variant={selected.autoQuote ? "default" : "secondary"} className="text-[9px]">{selected.autoQuote ? "Enabled" : "Disabled"}</Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Performance */}
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Performance</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-[9px] text-muted-foreground">Shipments</p>
                          <p className="text-sm font-bold">{selected.totalShipments}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-[9px] text-muted-foreground">Revenue</p>
                          <p className="text-sm font-bold">${(selected.totalRevenue / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-[9px] text-muted-foreground">Avg Margin</p>
                          <p className="text-sm font-bold text-accent">{selected.avgMargin}%</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-[9px] text-muted-foreground">Win Rate</p>
                          <p className="text-sm font-bold text-emerald-400">{selected.winRate}%</p>
                        </div>
                      </div>
                    </div>

                    {/* AI Insight */}
                    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="h-3 w-3 text-violet-400" />
                        <span className="text-[10px] font-semibold text-violet-400">AI Insight</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {selected.sensitivity === "high"
                          ? `${selected.customerName} is highly price sensitive. Recommend partial promo sharing to maintain win rate.`
                          : selected.tier === "strategic"
                          ? `Strategic account with strong lifetime value. Current margin of ${selected.avgMargin}% is sustainable.`
                          : `Standard pricing behavior. Margin can safely be maintained at ${selected.targetMargin}%.`}
                      </p>
                    </div>

                    {editMode && (
                      <Button className="w-full" size="sm" onClick={() => { setEditMode(false); toast.success("Profile saved"); }}>
                        <Check className="h-3.5 w-3.5 mr-1.5" />Save Changes
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Select a customer to view their pricing profile</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Intelligence Tab ── */}
        <TabsContent value="intelligence" className="mt-0 space-y-6">
          <div className="grid md:grid-cols-4 gap-3">
            {[
              { label: "Total Customer Profit", value: "$148,056", color: "text-emerald-400" },
              { label: "Avg Margin Across Customers", value: "9.7%", color: "text-accent" },
              { label: "Best Win Rate Customer", value: "Pacific Imports (78%)", color: "text-blue-400" },
              { label: "Highest Margin Customer", value: "Euro Traders (13.2%)", color: "text-violet-400" },
            ].map(kpi => (
              <Card key={kpi.label}>
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{kpi.label}</p>
                  <p className={`text-lg font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Profitability</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={PROFITABILITY_DATA}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="profit" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Behavior Insights</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: TrendingUp, text: "Pacific Imports converts best at 7–9% margin range", type: "pattern" },
                  { icon: AlertTriangle, text: "Euro Traders has low win rate — pricing too aggressive for new customer", type: "warning" },
                  { icon: Target, text: "Tech Parts Inc responds well to promo sharing — 18% higher win rate", type: "opportunity" },
                  { icon: Shield, text: "Midwest Distribution accepts premium pricing — safe to maintain 11%+ margin", type: "pattern" },
                  { icon: DollarSign, text: "Apex Logistics generates most consistent profit despite moderate margin", type: "pattern" },
                ].map((insight, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                    insight.type === "warning" ? "border-amber-500/20 bg-amber-500/5" :
                    insight.type === "opportunity" ? "border-emerald-500/20 bg-emerald-500/5" :
                    "border-border bg-muted/30"
                  }`}>
                    <insight.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                      insight.type === "warning" ? "text-amber-400" :
                      insight.type === "opportunity" ? "text-emerald-400" : "text-muted-foreground"
                    }`} />
                    <span className="text-xs text-foreground">{insight.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="mt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STRATEGY_TEMPLATES.map(tpl => (
              <Card key={tpl.id} className="hover:border-accent/30 transition-colors cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{tpl.name}</h3>
                    <Badge variant="outline" className="text-[9px]">{MODE_LABELS[tpl.mode]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{tpl.desc}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span>Max Pass: <strong className="text-foreground">{tpl.passThrough}%</strong></span>
                    <span>Min Profit: <strong className="text-foreground">${tpl.minProfit}</strong></span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full text-xs h-8" onClick={() => toast.success(`Template "${tpl.name}" applied`)}>
                    <Copy className="h-3 w-3 mr-1.5" />Apply to Customer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminCustomerPricing;
