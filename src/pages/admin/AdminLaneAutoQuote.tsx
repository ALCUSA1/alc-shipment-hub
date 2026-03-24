import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Zap, Shield, Target, BarChart3, AlertTriangle, Check, Pause,
  Play, TrendingUp, RefreshCw, Eye, Settings2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ── Types ── */
interface LaneAutoProfile {
  id: string;
  lane: string;
  origin: string;
  destination: string;
  shipmentTypes: string[];
  customerTypes: string[];
  enabled: boolean;
  autoSend: boolean;
  minConfidence: number;
  minMargin: number;
  minRetainedProfit: number;
  maxPromoSharing: number;
  totalAutoQuoted: number;
  autoQuoteWinRate: number;
  avgMargin: number;
  avgProfit: number;
  fallbackCount: number;
  lastAutoQuote: string;
  status: "active" | "paused" | "learning";
}

const LANE_PROFILES: LaneAutoProfile[] = [
  { id: "1", lane: "SHA → LAX", origin: "Shanghai", destination: "Los Angeles", shipmentTypes: ["FCL"], customerTypes: ["existing", "high_volume"], enabled: true, autoSend: true, minConfidence: 85, minMargin: 7, minRetainedProfit: 150, maxPromoSharing: 25, totalAutoQuoted: 89, autoQuoteWinRate: 72, avgMargin: 8.8, avgProfit: 210, fallbackCount: 12, lastAutoQuote: "2 hrs ago", status: "active" },
  { id: "2", lane: "NGB → LGB", origin: "Ningbo", destination: "Long Beach", shipmentTypes: ["FCL", "LCL"], customerTypes: ["existing", "high_volume", "strategic"], enabled: true, autoSend: false, minConfidence: 80, minMargin: 6, minRetainedProfit: 120, maxPromoSharing: 30, totalAutoQuoted: 65, autoQuoteWinRate: 68, avgMargin: 7.5, avgProfit: 185, fallbackCount: 8, lastAutoQuote: "5 hrs ago", status: "active" },
  { id: "3", lane: "HKG → NYC", origin: "Hong Kong", destination: "New York", shipmentTypes: ["FCL"], customerTypes: ["existing"], enabled: true, autoSend: true, minConfidence: 90, minMargin: 8, minRetainedProfit: 180, maxPromoSharing: 20, totalAutoQuoted: 42, autoQuoteWinRate: 75, avgMargin: 9.2, avgProfit: 245, fallbackCount: 5, lastAutoQuote: "1 day ago", status: "active" },
  { id: "4", lane: "PVG → ORD", origin: "Shanghai Pudong", destination: "Chicago", shipmentTypes: ["FCL", "Air"], customerTypes: ["high_volume"], enabled: false, autoSend: false, minConfidence: 85, minMargin: 7, minRetainedProfit: 150, maxPromoSharing: 25, totalAutoQuoted: 15, autoQuoteWinRate: 55, avgMargin: 7.1, avgProfit: 165, fallbackCount: 18, lastAutoQuote: "3 days ago", status: "paused" },
  { id: "5", lane: "RTM → SAV", origin: "Rotterdam", destination: "Savannah", shipmentTypes: ["FCL"], customerTypes: ["existing", "strategic"], enabled: true, autoSend: false, minConfidence: 80, minMargin: 8, minRetainedProfit: 160, maxPromoSharing: 20, totalAutoQuoted: 28, autoQuoteWinRate: 64, avgMargin: 9.8, avgProfit: 220, fallbackCount: 4, lastAutoQuote: "8 hrs ago", status: "learning" },
];

const PERFORMANCE_DATA = [
  { lane: "SHA→LAX", autoWin: 72, manualWin: 58, autoMargin: 8.8, manualMargin: 9.5 },
  { lane: "NGB→LGB", autoWin: 68, manualWin: 55, autoMargin: 7.5, manualMargin: 8.2 },
  { lane: "HKG→NYC", autoWin: 75, manualWin: 62, autoMargin: 9.2, manualMargin: 10.1 },
  { lane: "PVG→ORD", autoWin: 55, manualWin: 60, autoMargin: 7.1, manualMargin: 8.8 },
  { lane: "RTM→SAV", autoWin: 64, manualWin: 52, autoMargin: 9.8, manualMargin: 10.5 },
];

const ELIGIBILITY_CHECKS = [
  "Lane approved for auto-quote",
  "Customer type approved",
  "Shipment type approved",
  "Required shipment data complete",
  "Live rate source is current",
  "Pricing confidence ≥ threshold",
  "True total cost calculated",
  "Margin rules satisfied",
  "Retained profit ≥ minimum",
  "No approval rule triggered",
  "No exception flag active",
];

const AdminLaneAutoQuote = () => {
  const [profiles, setProfiles] = useState(LANE_PROFILES);

  const totalAutoQuoted = profiles.reduce((s, p) => s + p.totalAutoQuoted, 0);
  const avgWinRate = Math.round(profiles.filter(p => p.enabled).reduce((s, p) => s + p.autoQuoteWinRate, 0) / profiles.filter(p => p.enabled).length);
  const totalFallbacks = profiles.reduce((s, p) => s + p.fallbackCount, 0);

  const toggleLane = (id: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled, status: !p.enabled ? "active" : "paused" } : p));
    toast.success("Lane automation updated");
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-amber-400" />
          <h1 className="text-2xl font-bold">Lane Auto-Quote Control</h1>
        </div>
        <p className="text-sm text-muted-foreground">Fully automated quoting for selected lanes with safety guardrails</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Auto-Quote Lanes", value: `${profiles.filter(p => p.enabled).length}`, icon: Zap, color: "text-amber-400" },
          { label: "Total Auto-Quoted", value: totalAutoQuoted.toString(), icon: Check, color: "text-emerald-400" },
          { label: "Auto-Quote Win Rate", value: `${avgWinRate}%`, icon: Target, color: "text-blue-400" },
          { label: "Manual Fallbacks", value: totalFallbacks.toString(), icon: AlertTriangle, color: "text-amber-400" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-lg font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="lanes">
        <TabsList className="bg-transparent p-0 gap-1 mb-6">
          {[
            { value: "lanes", label: "Lane Profiles", icon: Target },
            { value: "performance", label: "Performance", icon: BarChart3 },
            { value: "safety", label: "Safety & Eligibility", icon: Shield },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg px-4 py-2 text-xs font-medium border border-border">
              <tab.icon className="h-3.5 w-3.5 mr-1.5" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Lane Profiles */}
        <TabsContent value="lanes" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Auto-Quote Lane Profiles</CardTitle>
                <Button size="sm" className="text-xs h-7">+ Add Lane</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Lane</TableHead>
                    <TableHead className="text-xs">Types</TableHead>
                    <TableHead className="text-xs">Min Confidence</TableHead>
                    <TableHead className="text-xs">Min Margin</TableHead>
                    <TableHead className="text-xs">Min Profit</TableHead>
                    <TableHead className="text-xs text-right">Auto-Quoted</TableHead>
                    <TableHead className="text-xs text-right">Win Rate</TableHead>
                    <TableHead className="text-xs text-right">Avg Profit</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Auto-Send</TableHead>
                    <TableHead className="text-xs">Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-xs">{p.lane}</TableCell>
                      <TableCell><div className="flex gap-1">{p.shipmentTypes.map(t => <Badge key={t} variant="secondary" className="text-[8px]">{t}</Badge>)}</div></TableCell>
                      <TableCell className="text-xs font-mono">{p.minConfidence}%</TableCell>
                      <TableCell className="text-xs font-mono">{p.minMargin}%</TableCell>
                      <TableCell className="text-xs font-mono">${p.minRetainedProfit}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{p.totalAutoQuoted}</TableCell>
                      <TableCell className="text-right">
                        <span className={`text-xs font-semibold ${p.autoQuoteWinRate >= 65 ? "text-emerald-400" : p.autoQuoteWinRate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                          {p.autoQuoteWinRate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-emerald-400">${p.avgProfit}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] ${
                          p.status === "active" ? "text-emerald-400 border-emerald-400/30" :
                          p.status === "learning" ? "text-blue-400 border-blue-400/30" :
                          "text-muted-foreground"
                        }`}>
                          {p.status === "active" ? <Play className="h-2.5 w-2.5 mr-0.5" /> :
                           p.status === "learning" ? <Eye className="h-2.5 w-2.5 mr-0.5" /> :
                           <Pause className="h-2.5 w-2.5 mr-0.5" />}
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.autoSend ? "default" : "secondary"} className="text-[9px]">
                          {p.autoSend ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch checked={p.enabled} onCheckedChange={() => toggleLane(p.id)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="mt-0 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Auto vs Manual Win Rate by Lane</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={PERFORMANCE_DATA}>
                    <XAxis dataKey="lane" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="autoWin" name="Auto Win %" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="manualWin" name="Manual Win %" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Lane Automation Insights</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: TrendingUp, text: "SHA→LAX auto-quote outperforms manual by 14% win rate", type: "success" },
                  { icon: AlertTriangle, text: "PVG→ORD underperforming — auto win rate 5% below manual. Consider pausing.", type: "warning" },
                  { icon: Check, text: "HKG→NYC has strongest auto-quote performance — 75% win rate, $245 avg profit", type: "success" },
                  { icon: Shield, text: "RTM→SAV in learning mode — collecting 20 more outcomes before activating", type: "info" },
                  { icon: Target, text: "NGB→LGB could benefit from enabling auto-send — strong confidence metrics", type: "opportunity" },
                ].map((insight, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                    insight.type === "warning" ? "border-amber-500/20 bg-amber-500/5" :
                    insight.type === "success" ? "border-emerald-500/20 bg-emerald-500/5" :
                    insight.type === "opportunity" ? "border-blue-500/20 bg-blue-500/5" :
                    "border-border bg-muted/30"
                  }`}>
                    <insight.icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                      insight.type === "warning" ? "text-amber-400" :
                      insight.type === "success" ? "text-emerald-400" :
                      insight.type === "opportunity" ? "text-blue-400" : "text-muted-foreground"
                    }`} />
                    <span className="text-xs text-foreground">{insight.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Safety */}
        <TabsContent value="safety" className="mt-0">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  Auto-Quote Eligibility Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">All checks must pass before a shipment is auto-quoted:</p>
                {ELIGIBILITY_CHECKS.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-foreground">{check}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Fallback Triggers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">Automation stops and routes to manual when:</p>
                {[
                  "Rate source is stale or expired",
                  "Margin falls below configured threshold",
                  "Retained platform profit too low",
                  "Promo sharing exceeds allowed limit",
                  "Confidence score below minimum",
                  "Unusual shipment complexity detected",
                  "Missing required service cost inputs",
                  "Customer pricing brain requires approval",
                  "Lane volatility exceeds safe range",
                  "Missing cargo or routing data",
                ].map((trigger, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/30">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs text-foreground">{trigger}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminLaneAutoQuote;
