import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Target, Zap,
  BarChart3, Users, ShieldCheck, ArrowUpRight, ArrowDownRight, Activity,
  Lightbulb, ChevronRight, Ship, Percent, FileText
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from "recharts";

/* ── seed data ── */
const kpis = [
  { label: "Total Revenue", value: "$2,845,000", delta: "+8.2%", up: true, icon: DollarSign },
  { label: "Total True Cost", value: "$2,190,000", delta: "+5.1%", up: true, icon: BarChart3, neutral: true },
  { label: "Net Profit", value: "$655,000", delta: "+14.6%", up: true, icon: TrendingUp },
  { label: "Platform Retained", value: "$418,200", delta: "+11.3%", up: true, icon: ShieldCheck, highlight: true },
  { label: "Avg Net Margin", value: "23.0%", delta: "+1.2pp", up: true, icon: Percent },
  { label: "Network Payout", value: "$236,800", delta: "-2.4%", up: false, icon: Users },
  { label: "Auto-Quote Win Rate", value: "82%", delta: "+4pp", up: true, icon: Zap },
  { label: "Promo Profit Captured", value: "$94,500", delta: "+22%", up: true, icon: Target },
  { label: "Low Margin Shipments", value: "14", delta: "+3", up: false, icon: AlertTriangle, risk: true },
  { label: "Approval Exceptions", value: "7", delta: "-2", up: true, icon: FileText },
];

const insights = [
  { text: "Promo rates on Asia → USA FCL generated 18% more platform profit this week.", type: "opportunity" },
  { text: "Lane Dubai → New York shows high win rate but below-target margin.", type: "warning" },
  { text: "Customer GlobalTech has high revenue but low retained profit — review pricing profile.", type: "risk" },
  { text: "Auto-quote on LCL Europe lanes outperforming manual quoting by 6pp margin.", type: "success" },
  { text: "Sales rep James has strong win rate but excessive discount pass-through.", type: "warning" },
  { text: "3 lanes show rising margin leakage due to network payout pressure.", type: "risk" },
];

const profitTrend = [
  { month: "Jan", revenue: 380000, cost: 295000, profit: 85000, retained: 54000 },
  { month: "Feb", revenue: 410000, cost: 310000, profit: 100000, retained: 64000 },
  { month: "Mar", revenue: 395000, cost: 300000, profit: 95000, retained: 61000 },
  { month: "Apr", revenue: 450000, cost: 340000, profit: 110000, retained: 70000 },
  { month: "May", revenue: 480000, cost: 365000, profit: 115000, retained: 74000 },
  { month: "Jun", revenue: 520000, cost: 390000, profit: 130000, retained: 82000 },
];

const pricingDecisions = [
  { id: "SHP-2026-041", customer: "GlobalTech", lane: "Shanghai → LA", mode: "Balanced", sell: 2450, profit: 380, retained: 245, promo: true, approval: false, source: "AI" },
  { id: "SHP-2026-042", customer: "Meridian Co", lane: "Dubai → NY", mode: "Max Profit", sell: 3100, profit: 520, retained: 340, promo: false, approval: false, source: "Manual" },
  { id: "SHP-2026-043", customer: "Atlas Freight", lane: "Hamburg → Santos", mode: "Win Rate", sell: 1800, profit: 180, retained: 108, promo: true, approval: true, source: "Autonomous" },
  { id: "SHP-2026-044", customer: "Pacific Rim", lane: "Busan → Seattle", mode: "Strategic", sell: 2900, profit: 440, retained: 280, promo: false, approval: false, source: "AI" },
  { id: "SHP-2026-045", customer: "NovaCargo", lane: "Rotterdam → Jebel Ali", mode: "Balanced", sell: 2200, profit: 290, retained: 185, promo: true, approval: false, source: "Autonomous" },
];

const promoTracker = [
  { carrier: "Maersk", lane: "Asia → USWC", buyRate: 1050, histAvg: 1380, diffPct: -23.9, strength: "Strong", retained: 180, passed: 60, profit: 420, strategy: "Keep Savings" },
  { carrier: "MSC", lane: "Europe → USEC", buyRate: 1200, histAvg: 1420, diffPct: -15.5, strength: "Moderate", retained: 110, passed: 80, profit: 350, strategy: "Partial Share" },
  { carrier: "CMA CGM", lane: "Asia → Med", buyRate: 980, histAvg: 1100, diffPct: -10.9, strength: "Mild", retained: 50, passed: 40, profit: 280, strategy: "Balanced" },
  { carrier: "Hapag-Lloyd", lane: "USEC → N. Europe", buyRate: 1150, histAvg: 1480, diffPct: -22.3, strength: "Strong", retained: 200, passed: 45, profit: 390, strategy: "Keep Savings" },
];

const lanePerformance = [
  { lane: "Shanghai → Los Angeles", count: 48, revenue: 420000, profit: 68000, margin: 16.2, winRate: 78, competition: "High", promoFreq: "Frequent", autoSuit: 85, action: "Expand automation" },
  { lane: "Rotterdam → New York", count: 35, revenue: 310000, profit: 52000, margin: 16.8, winRate: 72, competition: "Moderate", promoFreq: "Occasional", autoSuit: 70, action: "Protect margin" },
  { lane: "Dubai → Mumbai", count: 22, revenue: 180000, profit: 38000, margin: 21.1, winRate: 85, competition: "Low", promoFreq: "Rare", autoSuit: 90, action: "Aggressive growth" },
  { lane: "Hamburg → Santos", count: 18, revenue: 145000, profit: 18000, margin: 12.4, winRate: 60, competition: "High", promoFreq: "Frequent", autoSuit: 45, action: "Review profitability" },
  { lane: "Busan → Seattle", count: 28, revenue: 250000, profit: 45000, margin: 18.0, winRate: 75, competition: "Moderate", promoFreq: "Moderate", autoSuit: 75, action: "Keep current rules" },
];

const autoQuoteLanes = [
  { lane: "Shanghai → LA", type: "FCL", enabled: true, volume: 32, winRate: 85, profit: 245, exceptions: 2, fallbacks: 3, rec: "Expand" },
  { lane: "Dubai → Mumbai", type: "FCL", enabled: true, volume: 18, winRate: 88, profit: 210, exceptions: 1, fallbacks: 1, rec: "Expand" },
  { lane: "Hamburg → Santos", type: "LCL", enabled: true, volume: 8, winRate: 55, profit: 95, exceptions: 5, fallbacks: 4, rec: "Tighten thresholds" },
  { lane: "Rotterdam → NY", type: "FCL", enabled: false, volume: 0, winRate: 0, profit: 0, exceptions: 0, fallbacks: 0, rec: "Enable pilot" },
];

const leakageWatchlist = [
  { entity: "Customer: GlobalTech", cause: "Over-discounting", lost: 4200, current: 8.5, target: 12, retained: 110, fix: "Tighten customer pricing profile" },
  { entity: "Lane: Hamburg → Santos", cause: "High network payout", lost: 3800, current: 12.4, target: 16, retained: 85, fix: "Review network split" },
  { entity: "Rep: James K.", cause: "Excessive pass-through", lost: 2900, current: 10.2, target: 14, retained: 130, fix: "Coach on margin discipline" },
  { entity: "Lane: Asia → Med LCL", cause: "Outdated rate inputs", lost: 2100, current: 9.8, target: 13, retained: 95, fix: "Update carrier source" },
];

const customerStrategy = [
  { customer: "Pacific Rim", tier: "Strategic", revenue: 520000, profit: 88000, retained: 56000, margin: 16.9, sensitivity: "Medium", promoShare: 15, winRate: 82, strategy: "Balanced pricing" },
  { customer: "GlobalTech", tier: "High Volume", revenue: 480000, profit: 45000, retained: 28000, margin: 9.4, sensitivity: "High", promoShare: 35, winRate: 90, strategy: "Reduce discount dependency" },
  { customer: "NovaCargo", tier: "Standard", revenue: 180000, profit: 32000, retained: 22000, margin: 17.8, sensitivity: "Low", promoShare: 10, winRate: 70, strategy: "Protect margin" },
  { customer: "Atlas Freight", tier: "New", revenue: 95000, profit: 14000, retained: 9500, margin: 14.7, sensitivity: "Medium", promoShare: 20, winRate: 65, strategy: "Growth pricing" },
];

const salesPerformance = [
  { rep: "Sarah M.", sent: 42, won: 31, revenue: 680000, profit: 48000, margin: 15.8, passThrough: 12, lowMargin: 2, action: "Reward" },
  { rep: "James K.", sent: 38, won: 28, revenue: 620000, profit: 35000, margin: 11.2, passThrough: 28, lowMargin: 6, action: "Coach on margin discipline" },
  { rep: "Priya D.", sent: 30, won: 22, revenue: 410000, profit: 42000, margin: 18.5, passThrough: 8, lowMargin: 1, action: "Expand authority" },
  { rep: "Michael T.", sent: 25, won: 15, revenue: 280000, profit: 28000, margin: 16.0, passThrough: 15, lowMargin: 3, action: "Review customer mix" },
];

const alerts = [
  { severity: "critical", area: "Margin", text: "Platform retained profit below threshold on 3 lanes", impact: "$4,200 weekly loss", action: "Raise margin floor", owner: "Pricing" },
  { severity: "critical", area: "Rates", text: "Carrier rate source stale for MSC Asia routes (>48h)", impact: "Pricing accuracy risk", action: "Refresh rate feed", owner: "Operations" },
  { severity: "warning", area: "Sales", text: "Rep James K. discount pass-through exceeds 25%", impact: "$2,900 leaked profit", action: "Review pricing authority", owner: "Sales Mgr" },
  { severity: "warning", area: "Auto-Quote", text: "Hamburg → Santos auto-quote fallback rate at 50%", impact: "Efficiency loss", action: "Tighten or disable", owner: "Pricing" },
  { severity: "info", area: "Promo", text: "New strong promo detected: Hapag-Lloyd USEC → N.Europe", impact: "+$200/shipment opportunity", action: "Retain savings", owner: "Pricing" },
];

const recommendations = [
  { text: "Increase retained promo savings on Asia FCL lanes by 15%.", impact: "+$12,000/month", priority: "High", owner: "Pricing" },
  { text: "Disable auto-quote on Hamburg → Santos LCL temporarily.", impact: "Reduce fallback overhead", priority: "Medium", owner: "Pricing" },
  { text: "Reclassify GlobalTech from Growth to Margin Protection.", impact: "+$4,200/month retained", priority: "High", owner: "Sales Mgr" },
  { text: "Coach Sales Rep James on excessive discount pass-through.", impact: "+$2,900/month", priority: "High", owner: "Sales Mgr" },
  { text: "Expand autonomous quoting on Dubai → Mumbai FCL.", impact: "+8 auto-quotes/week", priority: "Medium", owner: "Pricing" },
];

const promoTrend = [
  { week: "W1", retained: 18000, passed: 8000 },
  { week: "W2", retained: 22000, passed: 9000 },
  { week: "W3", retained: 19000, passed: 11000 },
  { week: "W4", retained: 28000, passed: 10000 },
];

const marginLeakagePie = [
  { name: "Over-discounting", value: 35 },
  { name: "Network payout", value: 25 },
  { name: "Promo pass-through", value: 20 },
  { name: "Stale rates", value: 12 },
  { name: "Other", value: 8 },
];
const PIE_COLORS = ["hsl(0,72%,51%)", "hsl(25,95%,53%)", "hsl(45,93%,47%)", "hsl(220,14%,46%)", "hsl(220,9%,46%)"];

const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

export default function AdminCommercialCommand() {
  const [dateRange, setDateRange] = useState("30d");

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="h-6 w-6 text-red-400" />
              Commercial Command Center
            </h1>
            <p className="text-sm text-[hsl(220,10%,50%)] mt-1">Executive control tower — pricing, margin, opportunity & sales intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="border-[hsl(220,15%,18%)] text-[hsl(220,10%,60%)] text-xs">
              Export
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {kpis.map((k) => (
            <Card key={k.label} className={`bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)] ${k.highlight ? "ring-1 ring-emerald-500/30" : ""} ${k.risk ? "ring-1 ring-red-500/20" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-[hsl(220,10%,40%)]">{k.label}</span>
                  <k.icon className={`h-3.5 w-3.5 ${k.highlight ? "text-emerald-400" : k.risk ? "text-red-400" : "text-[hsl(220,10%,35%)]"}`} />
                </div>
                <p className={`text-lg font-bold tabular-nums ${k.highlight ? "text-emerald-400" : k.risk ? "text-red-400" : "text-white"}`}>{k.value}</p>
                <span className={`text-[11px] flex items-center gap-0.5 ${k.up && !k.neutral ? "text-emerald-400" : k.neutral ? "text-[hsl(220,10%,50%)]" : "text-red-400"}`}>
                  {k.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {k.delta}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Insights Strip */}
        <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Executive Insights</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[hsl(220,15%,12%)] hover:bg-[hsl(220,15%,14%)] cursor-pointer transition-colors group">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${ins.type === "success" ? "bg-emerald-400" : ins.type === "warning" ? "bg-amber-400" : ins.type === "risk" ? "bg-red-400" : "bg-blue-400"}`} />
                  <p className="text-[11px] text-[hsl(220,10%,60%)] leading-relaxed group-hover:text-white transition-colors">{ins.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Sections */}
        <Tabs defaultValue="pricing" className="space-y-4">
          <TabsList className="bg-[hsl(220,15%,10%)] border border-[hsl(220,15%,15%)] p-1 gap-1 flex-wrap h-auto">
            {[
              { val: "pricing", label: "Pricing Control" },
              { val: "promo", label: "Promo Monitor" },
              { val: "lanes", label: "Lane Intelligence" },
              { val: "auto", label: "Auto-Quote" },
              { val: "leakage", label: "Margin Leakage" },
              { val: "customers", label: "Customer Strategy" },
              { val: "sales", label: "Sales Profit" },
              { val: "alerts", label: "Alerts & Actions" },
            ].map((t) => (
              <TabsTrigger key={t.val} value={t.val} className="text-xs data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Pricing Control ── */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Profit Trend</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profitTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                      <XAxis dataKey="month" tick={{ fill: "hsl(220,10%,45%)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(220,10%,45%)", fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}K`} />
                      <Tooltip contentStyle={{ background: "hsl(220,15%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                      <Area dataKey="revenue" stroke="hsl(220,70%,55%)" fill="hsl(220,70%,55%)" fillOpacity={0.1} name="Revenue" />
                      <Area dataKey="profit" stroke="hsl(142,71%,45%)" fill="hsl(142,71%,45%)" fillOpacity={0.15} name="Net Profit" />
                      <Area dataKey="retained" stroke="hsl(142,76%,36%)" fill="hsl(142,76%,36%)" fillOpacity={0.2} name="Platform Retained" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Pricing Mode Distribution</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { mode: "Balanced", count: 38 },
                      { mode: "Max Profit", count: 22 },
                      { mode: "Win Rate", count: 18 },
                      { mode: "Strategic", count: 12 },
                      { mode: "Manual", count: 10 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                      <XAxis dataKey="mode" tick={{ fill: "hsl(220,10%,45%)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "hsl(220,10%,45%)", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(220,15%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                      <Bar dataKey="count" fill="hsl(220,70%,55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Recent Commercial Pricing Decisions</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[hsl(220,15%,15%)]">
                      {["Shipment", "Customer", "Lane", "Mode", "Sell", "Profit", "Retained", "Promo", "Approval", "Source"].map((h) => (
                        <TableHead key={h} className="text-[10px] text-[hsl(220,10%,40%)] uppercase">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingDecisions.map((d) => (
                      <TableRow key={d.id} className="border-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,12%)]">
                        <TableCell className="text-xs text-blue-400 font-mono">{d.id}</TableCell>
                        <TableCell className="text-xs text-white">{d.customer}</TableCell>
                        <TableCell className="text-xs text-[hsl(220,10%,60%)]">{d.lane}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] border-[hsl(220,15%,25%)]">{d.mode}</Badge></TableCell>
                        <TableCell className="text-xs text-white tabular-nums">${d.sell.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-emerald-400 tabular-nums">${d.profit}</TableCell>
                        <TableCell className="text-xs text-emerald-300 tabular-nums font-semibold">${d.retained}</TableCell>
                        <TableCell>{d.promo && <Badge className="bg-amber-500/15 text-amber-400 text-[9px]">Promo</Badge>}</TableCell>
                        <TableCell>{d.approval && <Badge className="bg-red-500/15 text-red-400 text-[9px]">Required</Badge>}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] border-[hsl(220,15%,25%)]">{d.source}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Promo Monitor ── */}
          <TabsContent value="promo" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Retained vs Passed-Through Savings</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={promoTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                      <XAxis dataKey="week" tick={{ fill: "hsl(220,10%,45%)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(220,10%,45%)", fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}K`} />
                      <Tooltip contentStyle={{ background: "hsl(220,15%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                      <Bar dataKey="retained" stackId="a" fill="hsl(142,71%,45%)" name="Retained" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="passed" stackId="a" fill="hsl(220,70%,55%)" name="Passed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Promo KPIs</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { label: "Promos Detected", value: "28", color: "text-blue-400" },
                    { label: "Advantage Value", value: "$142,000", color: "text-amber-400" },
                    { label: "Profit Captured", value: "$94,500", color: "text-emerald-400" },
                    { label: "Savings Passed", value: "$47,500", color: "text-[hsl(220,10%,60%)]" },
                  ].map((m) => (
                    <div key={m.label} className="p-3 rounded-lg bg-[hsl(220,15%,12%)]">
                      <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)]">{m.label}</p>
                      <p className={`text-lg font-bold tabular-nums ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Promo Opportunity Tracker</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[hsl(220,15%,15%)]">
                      {["Carrier", "Lane", "Buy Rate", "Hist Avg", "Diff %", "Strength", "Retained", "Passed", "Profit", "Strategy"].map((h) => (
                        <TableHead key={h} className="text-[10px] text-[hsl(220,10%,40%)] uppercase">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoTracker.map((p, i) => (
                      <TableRow key={i} className="border-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,12%)]">
                        <TableCell className="text-xs text-white">{p.carrier}</TableCell>
                        <TableCell className="text-xs text-[hsl(220,10%,60%)]">{p.lane}</TableCell>
                        <TableCell className="text-xs text-emerald-400 tabular-nums">${p.buyRate}</TableCell>
                        <TableCell className="text-xs text-[hsl(220,10%,50%)] tabular-nums">${p.histAvg}</TableCell>
                        <TableCell className="text-xs text-emerald-400 tabular-nums">{p.diffPct.toFixed(1)}%</TableCell>
                        <TableCell><Badge className={`text-[9px] ${p.strength === "Strong" ? "bg-emerald-500/15 text-emerald-400" : p.strength === "Moderate" ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"}`}>{p.strength}</Badge></TableCell>
                        <TableCell className="text-xs text-emerald-400 tabular-nums">${p.retained}</TableCell>
                        <TableCell className="text-xs text-[hsl(220,10%,50%)] tabular-nums">${p.passed}</TableCell>
                        <TableCell className="text-xs text-white tabular-nums font-semibold">${p.profit}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] border-[hsl(220,15%,25%)]">{p.strategy}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Lane Intelligence ── */}
          <TabsContent value="lanes" className="space-y-4">
            <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Lane Performance Matrix</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[hsl(220,15%,15%)]">
                      {["Lane", "Count", "Revenue", "Profit", "Margin", "Win Rate", "Competition", "Promo Freq", "Auto Suit", "Action"].map((h) => (
                        <TableHead key={h} className="text-[10px] text-[hsl(220,10%,40%)] uppercase">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lanePerformance.map((l, i) => (
                      <TableRow key={i} className="border-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,12%)]">
                        <TableCell className="text-xs text-white font-medium">{l.lane}</TableCell>
                        <TableCell className="text-xs text-[hsl(220,10%,60%)] tabular-nums">{l.count}</TableCell>
                        <TableCell className="text-xs text-white tabular-nums">{fmt(l.revenue)}</TableCell>
                        <TableCell className="text-xs text-emerald-400 tabular-nums">{fmt(l.profit)}</TableCell>
                        <TableCell className={`text-xs tabular-nums font-semibold ${l.margin >= 16 ? "text-emerald-400" : l.margin >= 13 ? "text-amber-400" : "text-red-400"}`}>{l.margin}%</TableCell>
                        <TableCell className="text-xs text-white tabular-nums">{l.winRate}%</TableCell>
                        <TableCell><Badge className={`text-[9px] ${l.competition === "High" ? "bg-red-500/15 text-red-400" : l.competition === "Moderate" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>{l.competition}</Badge></TableCell>
                        <TableCell className="text-xs text-[hsl(220,10%,50%)]">{l.promoFreq}</TableCell>
                        <TableCell className="text-xs text-blue-400 tabular-nums">{l.autoSuit}%</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] border-[hsl(220,15%,25%)] whitespace-nowrap">{l.action}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Auto-Quote ── */}
          <TabsContent value="auto" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Auto-Quoted", value: "58", color: "text-blue-400" },
                { label: "Share of Total", value: "42%", color: "text-white" },
                { label: "Win Rate", value: "82%", color: "text-emerald-400" },
                { label: "Fallback Rate", value: "14%", color: "text-amber-400" },
              ].map((m) => (
                <Card key={m.label} className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
                  <CardContent className="p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)]">{m.label}</p>
                    <p className={`text-xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Auto-Quote Lane Control</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[hsl(220,15%,15%)]">
                      {["Lane", "Type", "Enabled", "Volume", "Win Rate", "Avg Profit", "Exceptions", "Fallbacks", "Recommendation"].map((h) => (
                        <TableHead key={h} className="text-[10px] text-[hsl(220,10%,40%)] uppercase">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {autoQuoteLanes.map((a, i) => (
                      <TableRow key={i} className="border-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,12%)]">
                        <TableCell className="text-xs text-white">{a.lane}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] border-[hsl(220,15%,25%)]">{a.type}</Badge></TableCell>
                        <TableCell>{a.enabled ? <Badge className="bg-emerald-500/15 text-emerald-400 text-[9px]">Active</Badge> : <Badge className="bg-[hsl(220,15%,20%)] text-[hsl(220,10%,45%)] text-[9px]">Off</Badge>}</TableCell>
                        <TableCell className="text-xs text-[hsl(220,10%,60%)] tabular-nums">{a.volume}</TableCell>
                        <TableCell className="text-xs text-emerald-400 tabular-nums">{a.winRate || "—"}%</TableCell>
                        <TableCell className="text-xs text-white tabular-nums">{a.profit ? `$${a.profit}` : "—"}</TableCell>
                        <TableCell className={`text-xs tabular-nums ${a.exceptions > 3 ? "text-red-400" : "text-[hsl(220,10%,50%)]"}`}>{a.exceptions}</TableCell>
                        <TableCell className={`text-xs tabular-nums ${a.fallbacks > 3 ? "text-amber-400" : "text-[hsl(220,10%,50%)]"}`}>{a.fallbacks}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[9px] ${a.rec === "Expand" ? "border-emerald-500/30 text-emerald-400" : a.rec.includes("Tighten") ? "border-amber-500/30 text-amber-400" : "border-[hsl(220,15%,25%)]"}`}>{a.rec}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Margin Leakage ── */}
          <TabsContent value="leakage" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Leakage by Cause</CardTitle></CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={marginLeakagePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} strokeWidth={0}>
                        {marginLeakagePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(220,15%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Leakage Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {marginLeakagePie.map((l, i) => (
                    <div key={l.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm" style={{ background: PIE_COLORS[i] }} />
                        <span className="text-xs text-[hsl(220,10%,60%)]">{l.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-white tabular-nums">{l.value}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Margin Leakage Watchlist</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[hsl(220,15%,15%)]">
                      {["Entity", "Cause", "Est. Lost", "Current Margin", "Target", "Retained", "Fix"].map((h) => (
                        <TableHead key={h} className="text-[10px] text-[hsl(220,10%,40%)] uppercase">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leakageWatchlist.map((l, i) => (
                      <TableRow key={i} className="border-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,12%)]">
                        <TableCell className="text-xs text-white">{l.entity}</TableCell>
                        <TableCell><Badge className="bg-red-500/15 text-red-400 text-[9px]">{l.cause}</Badge></TableCell>
                        <TableCell className="text-xs text-red-400 tabular-nums">${l.lost.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-amber-400 tabular-nums">{l.current}%</TableCell>
                        <TableCell className="text-xs text-[hsl(220,10%,50%)] tabular-nums">{l.target}%</TableCell>
                        <TableCell className="text-xs text-white tabular-nums">${l.retained}</TableCell>
                        <TableCell className="text-xs text-blue-400">{l.fix}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Customer Strategy ── */}
          <TabsContent value="customers" className="space-y-4">
            <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Customer Commercial Strategy</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[hsl(220,15%,15%)]">
                      {["Customer", "Tier", "Revenue", "Profit", "Retained", "Margin", "Sensitivity", "Promo Share", "Win Rate", "Strategy"].map((h) => (
                        <TableHead key={h} className="text-[10px] text-[hsl(220,10%,40%)] uppercase">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerStrategy.map((c, i) => (
                      <TableRow key={i} className="border-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,12%)]">
                        <TableCell className="text-xs text-white font-medium">{c.customer}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] border-[hsl(220,15%,25%)]">{c.tier}</Badge></TableCell>
                        <TableCell className="text-xs text-white tabular-nums">{fmt(c.revenue)}</TableCell>
                        <TableCell className="text-xs text-emerald-400 tabular-nums">{fmt(c.profit)}</TableCell>
                        <TableCell className="text-xs text-emerald-300 tabular-nums font-semibold">{fmt(c.retained)}</TableCell>
                        <TableCell className={`text-xs tabular-nums font-semibold ${c.margin >= 15 ? "text-emerald-400" : c.margin >= 12 ? "text-amber-400" : "text-red-400"}`}>{c.margin}%</TableCell>
                        <TableCell><Badge className={`text-[9px] ${c.sensitivity === "High" ? "bg-red-500/15 text-red-400" : c.sensitivity === "Medium" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>{c.sensitivity}</Badge></TableCell>
                        <TableCell className="text-xs text-[hsl(220,10%,50%)] tabular-nums">{c.promoShare}%</TableCell>
                        <TableCell className="text-xs text-white tabular-nums">{c.winRate}%</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] border-[hsl(220,15%,25%)] whitespace-nowrap">{c.strategy}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Sales Profit ── */}
          <TabsContent value="sales" className="space-y-4">
            <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Sales Commercial Performance</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[hsl(220,15%,15%)]">
                      {["Sales Rep", "Sent", "Won", "Revenue", "Platform Profit", "Avg Margin", "Pass-Through", "Low Margin", "Action"].map((h) => (
                        <TableHead key={h} className="text-[10px] text-[hsl(220,10%,40%)] uppercase">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesPerformance.map((s, i) => (
                      <TableRow key={i} className="border-[hsl(220,15%,15%)] hover:bg-[hsl(220,15%,12%)]">
                        <TableCell className="text-xs text-white font-medium">{s.rep}</TableCell>
                        <TableCell className="text-xs text-[hsl(220,10%,60%)] tabular-nums">{s.sent}</TableCell>
                        <TableCell className="text-xs text-white tabular-nums">{s.won}</TableCell>
                        <TableCell className="text-xs text-white tabular-nums">{fmt(s.revenue)}</TableCell>
                        <TableCell className="text-xs text-emerald-400 tabular-nums">{fmt(s.profit)}</TableCell>
                        <TableCell className={`text-xs tabular-nums font-semibold ${s.margin >= 15 ? "text-emerald-400" : s.margin >= 12 ? "text-amber-400" : "text-red-400"}`}>{s.margin}%</TableCell>
                        <TableCell className={`text-xs tabular-nums ${s.passThrough > 20 ? "text-red-400" : "text-[hsl(220,10%,50%)]"}`}>{s.passThrough}%</TableCell>
                        <TableCell className={`text-xs tabular-nums ${s.lowMargin > 4 ? "text-red-400" : "text-[hsl(220,10%,50%)]"}`}>{s.lowMargin}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[9px] ${s.action === "Reward" ? "border-emerald-500/30 text-emerald-400" : s.action.includes("Coach") ? "border-red-500/30 text-red-400" : "border-[hsl(220,15%,25%)]"}`}>{s.action}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Alerts & Actions ── */}
          <TabsContent value="alerts" className="space-y-4">
            <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Commercial Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${a.severity === "critical" ? "border-red-500/20 bg-red-500/5" : a.severity === "warning" ? "border-amber-500/20 bg-amber-500/5" : "border-blue-500/20 bg-blue-500/5"}`}>
                    <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${a.severity === "critical" ? "text-red-400" : a.severity === "warning" ? "text-amber-400" : "text-blue-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge className={`text-[9px] ${a.severity === "critical" ? "bg-red-500/15 text-red-400" : a.severity === "warning" ? "bg-amber-500/15 text-amber-400" : "bg-blue-500/15 text-blue-400"}`}>{a.severity}</Badge>
                        <span className="text-[10px] text-[hsl(220,10%,40%)] uppercase">{a.area}</span>
                      </div>
                      <p className="text-xs text-white">{a.text}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] text-[hsl(220,10%,45%)]">Impact: {a.impact}</span>
                        <span className="text-[10px] text-blue-400">→ {a.action}</span>
                        <span className="text-[10px] text-[hsl(220,10%,40%)]">Owner: {a.owner}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="bg-[hsl(220,15%,10%)] border-[hsl(220,15%,15%)]">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <CardTitle className="text-sm text-white">Commercial Recommendations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {recommendations.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(220,15%,12%)] hover:bg-[hsl(220,15%,14%)] transition-colors group">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-xs text-white group-hover:text-white/90">{r.text}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-emerald-400">Impact: {r.impact}</span>
                        <Badge className={`text-[9px] ${r.priority === "High" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>{r.priority}</Badge>
                        <span className="text-[10px] text-[hsl(220,10%,40%)]">{r.owner}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-[10px] border-[hsl(220,15%,20%)] text-[hsl(220,10%,60%)]">Review</Button>
                      <Button size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white">Apply</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
