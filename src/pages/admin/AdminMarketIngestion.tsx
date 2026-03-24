import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Radio, Database, RefreshCw, AlertTriangle, Check, Clock, Upload,
  TrendingDown, TrendingUp, Zap, Shield, Activity, Globe,
} from "lucide-react";

/* ── Mock data ── */
interface RateSource {
  id: string;
  name: string;
  type: "carrier_api" | "edi_feed" | "contract_upload" | "manual_entry" | "market_feed";
  carrier: string;
  trustLevel: "high" | "medium" | "low";
  status: "active" | "stale" | "error" | "paused";
  lastSync: string;
  nextSync: string;
  ratesIngested: number;
  invalidRates: number;
  promoDetected: number;
  coverage: number;
}

const SOURCES: RateSource[] = [
  { id: "1", name: "Maersk API", type: "carrier_api", carrier: "Maersk", trustLevel: "high", status: "active", lastSync: "2 min ago", nextSync: "in 28 min", ratesIngested: 1245, invalidRates: 3, promoDetected: 18, coverage: 92 },
  { id: "2", name: "MSC EDI Feed", type: "edi_feed", carrier: "MSC", trustLevel: "high", status: "active", lastSync: "15 min ago", nextSync: "in 45 min", ratesIngested: 890, invalidRates: 7, promoDetected: 12, coverage: 85 },
  { id: "3", name: "CMA CGM Contract", type: "contract_upload", carrier: "CMA CGM", trustLevel: "high", status: "active", lastSync: "2 days ago", nextSync: "manual", ratesIngested: 340, invalidRates: 0, promoDetected: 5, coverage: 68 },
  { id: "4", name: "Hapag-Lloyd Manual", type: "manual_entry", carrier: "Hapag-Lloyd", trustLevel: "medium", status: "stale", lastSync: "5 days ago", nextSync: "manual", ratesIngested: 156, invalidRates: 2, promoDetected: 3, coverage: 45 },
  { id: "5", name: "Freightos Index", type: "market_feed", carrier: "Multi-carrier", trustLevel: "low", status: "active", lastSync: "1 hr ago", nextSync: "in 23 hr", ratesIngested: 2100, invalidRates: 45, promoDetected: 0, coverage: 78 },
  { id: "6", name: "Evergreen API", type: "carrier_api", carrier: "Evergreen", trustLevel: "high", status: "error", lastSync: "12 hrs ago", nextSync: "retry in 5 min", ratesIngested: 520, invalidRates: 0, promoDetected: 8, coverage: 55 },
];

const RECENT_INGESTIONS = [
  { id: "1", source: "Maersk API", lane: "SHA → LAX", type: "FCL 40HC", rate: 1850, prev: 2100, change: -11.9, promo: true, status: "valid", time: "2 min ago" },
  { id: "2", source: "MSC EDI", lane: "NGB → LGB", type: "FCL 20GP", rate: 1420, prev: 1380, change: 2.9, promo: false, status: "valid", time: "15 min ago" },
  { id: "3", source: "Maersk API", lane: "HKG → NYC", type: "FCL 40GP", rate: 2800, prev: 2750, change: 1.8, promo: false, status: "valid", time: "18 min ago" },
  { id: "4", source: "CMA CGM", lane: "PVG → ORD", type: "FCL 40HC", rate: 2100, prev: 2650, change: -20.8, promo: true, status: "valid", time: "2 days ago" },
  { id: "5", source: "Freightos", lane: "RTM → SAV", type: "FCL 40GP", rate: 0, prev: 1800, change: 0, promo: false, status: "invalid", time: "1 hr ago" },
];

const VALIDATION_ISSUES = [
  { id: "1", source: "Freightos", issue: "Missing buy rate (0 value)", lane: "RTM → SAV", severity: "critical" },
  { id: "2", source: "Hapag-Lloyd Manual", issue: "Rate expired — validity ended 3 days ago", lane: "SHA → HAM", severity: "warning" },
  { id: "3", source: "Freightos", issue: "Suspiciously low rate ($120 for FCL)", lane: "YTN → LAX", severity: "warning" },
  { id: "4", source: "MSC EDI", issue: "Duplicate rate detected — overlapping validity", lane: "NGB → LGB", severity: "info" },
];

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  active: { color: "text-emerald-400", label: "Active" },
  stale: { color: "text-amber-400", label: "Stale" },
  error: { color: "text-red-400", label: "Error" },
  paused: { color: "text-muted-foreground", label: "Paused" },
};

const TRUST_CONFIG: Record<string, { color: string }> = {
  high: { color: "text-emerald-400" },
  medium: { color: "text-amber-400" },
  low: { color: "text-muted-foreground" },
};

const TYPE_LABELS: Record<string, string> = {
  carrier_api: "Carrier API", edi_feed: "EDI Feed", contract_upload: "Contract Upload",
  manual_entry: "Manual Entry", market_feed: "Market Feed",
};

const AdminMarketIngestion = () => {
  const totalRates = SOURCES.reduce((s, src) => s + src.ratesIngested, 0);
  const totalPromos = SOURCES.reduce((s, src) => s + src.promoDetected, 0);
  const activeSources = SOURCES.filter(s => s.status === "active").length;
  const avgCoverage = Math.round(SOURCES.reduce((s, src) => s + src.coverage, 0) / SOURCES.length);

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Radio className="h-5 w-5 text-blue-400" />
          <h1 className="text-2xl font-bold">Market Rate Ingestion</h1>
        </div>
        <p className="text-sm text-muted-foreground">Live rate feeds, source management, and ingestion monitoring</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Sources", value: `${activeSources}/${SOURCES.length}`, icon: Globe, color: "text-emerald-400" },
          { label: "Total Rates Ingested", value: totalRates.toLocaleString(), icon: Database, color: "text-blue-400" },
          { label: "Promo Rates Detected", value: totalPromos.toString(), icon: Zap, color: "text-violet-400" },
          { label: "Avg Lane Coverage", value: `${avgCoverage}%`, icon: Activity, color: "text-accent" },
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

      <Tabs defaultValue="sources">
        <TabsList className="bg-transparent p-0 gap-1 mb-6">
          {[
            { value: "sources", label: "Rate Sources", icon: Globe },
            { value: "feed", label: "Live Feed", icon: Activity },
            { value: "validation", label: "Validation Issues", icon: AlertTriangle },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg px-4 py-2 text-xs font-medium border border-border">
              <tab.icon className="h-3.5 w-3.5 mr-1.5" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Sources */}
        <TabsContent value="sources" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Connected Rate Sources</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => toast.success("Syncing all sources...")}>
                    <RefreshCw className="h-3 w-3 mr-1" />Sync All
                  </Button>
                  <Button size="sm" className="text-xs h-7"><Upload className="h-3 w-3 mr-1" />Add Source</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Carrier</TableHead>
                    <TableHead className="text-xs">Trust</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Last Sync</TableHead>
                    <TableHead className="text-xs text-right">Rates</TableHead>
                    <TableHead className="text-xs text-right">Promos</TableHead>
                    <TableHead className="text-xs">Coverage</TableHead>
                    <TableHead className="text-xs w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SOURCES.map(src => {
                    const st = STATUS_CONFIG[src.status];
                    const tr = TRUST_CONFIG[src.trustLevel];
                    return (
                      <TableRow key={src.id}>
                        <TableCell className="font-medium text-xs">{src.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[9px]">{TYPE_LABELS[src.type]}</Badge></TableCell>
                        <TableCell className="text-xs">{src.carrier}</TableCell>
                        <TableCell><span className={`text-xs font-semibold capitalize ${tr.color}`}>{src.trustLevel}</span></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] ${st.color}`}>●</span>
                            <span className="text-xs">{st.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{src.lastSync}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{src.ratesIngested.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs font-mono text-violet-400">{src.promoDetected}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={src.coverage} className="h-1.5 w-16" />
                            <span className="text-[10px] text-muted-foreground">{src.coverage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => toast.success(`Syncing ${src.name}...`)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Feed */}
        <TabsContent value="feed" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent Rate Ingestions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Lane</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Rate</TableHead>
                    <TableHead className="text-xs text-right">Prev</TableHead>
                    <TableHead className="text-xs text-right">Change</TableHead>
                    <TableHead className="text-xs">Promo</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECENT_INGESTIONS.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.source}</TableCell>
                      <TableCell className="text-xs font-medium">{r.lane}</TableCell>
                      <TableCell className="text-xs">{r.type}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{r.rate > 0 ? `$${r.rate.toLocaleString()}` : "—"}</TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">${r.prev.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {r.change !== 0 ? (
                          <span className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${r.change < 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {r.change < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                            {Math.abs(r.change).toFixed(1)}%
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{r.promo && <Badge className="text-[8px] h-4 bg-violet-500/20 text-violet-400 border-violet-500/30">Promo</Badge>}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "valid" ? "default" : "destructive"} className="text-[9px]">
                          {r.status === "valid" ? <Check className="h-2.5 w-2.5 mr-0.5" /> : <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation */}
        <TabsContent value="validation" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Validation Issues ({VALIDATION_ISSUES.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {VALIDATION_ISSUES.map(issue => (
                <div key={issue.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  issue.severity === "critical" ? "border-red-500/20 bg-red-500/5" :
                  issue.severity === "warning" ? "border-amber-500/20 bg-amber-500/5" :
                  "border-border bg-muted/30"
                }`}>
                  <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                    issue.severity === "critical" ? "text-red-400" :
                    issue.severity === "warning" ? "text-amber-400" : "text-muted-foreground"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{issue.issue}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted-foreground">Source: {issue.source}</span>
                      <span className="text-[10px] text-muted-foreground">Lane: {issue.lane}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${
                    issue.severity === "critical" ? "text-red-400 border-red-400/30" :
                    issue.severity === "warning" ? "text-amber-400 border-amber-400/30" : ""
                  }`}>{issue.severity}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminMarketIngestion;
