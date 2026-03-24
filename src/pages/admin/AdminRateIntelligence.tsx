import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, TrendingUp, TrendingDown, Target, BarChart3,
  Ship, ArrowUp, ArrowDown, Sparkles, ShieldCheck, Users,
  Truck, Plane, Package, AlertTriangle,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const COLORS = ["hsl(142,71%,45%)", "hsl(217,91%,60%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(280,68%,60%)"];

// ── Simulated data ──
const LANE_DATA = [
  { lane: "Asia → US West Coast", code: "ASIA-USWC", winRate: 42, avgMargin: 7.2, quoteVol: 145, avgBuy: 2400, competition: "high", promoUsage: 38 },
  { lane: "Asia → Europe", code: "ASIA-EUR", winRate: 55, avgMargin: 9.8, quoteVol: 98, avgBuy: 1800, competition: "moderate", promoUsage: 25 },
  { lane: "Europe → US East Coast", code: "EUR-USEC", winRate: 61, avgMargin: 11.2, quoteVol: 67, avgBuy: 1500, competition: "moderate", promoUsage: 18 },
  { lane: "US → Latin America", code: "US-LATAM", winRate: 68, avgMargin: 13.5, quoteVol: 43, avgBuy: 1200, competition: "low", promoUsage: 12 },
  { lane: "Intra-Asia", code: "INTRA-ASIA", winRate: 51, avgMargin: 8.1, quoteVol: 112, avgBuy: 800, competition: "high", promoUsage: 45 },
];

const CARRIER_DATA = [
  { carrier: "Maersk", shipments: 87, avgBuy: 2200, avgMargin: 8.5, winRate: 52, promoRate: 22 },
  { carrier: "MSC", shipments: 65, avgBuy: 2050, avgMargin: 9.2, winRate: 48, promoRate: 30 },
  { carrier: "CMA CGM", shipments: 54, avgBuy: 2150, avgMargin: 7.8, winRate: 55, promoRate: 18 },
  { carrier: "Hapag-Lloyd", shipments: 38, avgBuy: 2350, avgMargin: 10.1, winRate: 44, promoRate: 15 },
  { carrier: "Evergreen", shipments: 29, avgBuy: 1980, avgMargin: 11.5, winRate: 58, promoRate: 35 },
];

const TREND_DATA = Array.from({ length: 12 }, (_, i) => {
  const m = new Date(2025, i);
  return {
    month: m.toLocaleDateString("en-US", { month: "short" }),
    avgBuy: 1800 + Math.round(Math.random() * 600 - 200),
    avgSell: 2200 + Math.round(Math.random() * 500 - 100),
    winRate: 45 + Math.round(Math.random() * 20),
    promoCapture: 60 + Math.round(Math.random() * 25),
  };
});

const PROMO_DATA = [
  { label: "Retained as Profit", value: 62 },
  { label: "Passed to Customer", value: 28 },
  { label: "Used for Win Rate", value: 10 },
];

const WIN_LOSS_DATA = [
  { margin: "3-5%", won: 85, lost: 15 },
  { margin: "5-8%", won: 72, lost: 28 },
  { margin: "8-10%", won: 58, lost: 42 },
  { margin: "10-13%", won: 41, lost: 59 },
  { margin: "13-15%", won: 28, lost: 72 },
  { margin: "15%+", won: 15, lost: 85 },
];

const AdminRateIntelligence = () => {
  const [period, setPeriod] = useState("90d");

  const kpis = useMemo(() => ({
    totalQuotes: 465,
    winRate: 52.3,
    avgMargin: 9.4,
    promoDetections: 142,
    promoProfitCaptured: 48200,
    avgBuyRate: 2085,
    rateVolatility: 8.2,
    lossFromOverpricing: 12800,
  }), []);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            Rate Intelligence Engine
          </h1>
          <p className="text-sm text-muted-foreground">Market-aware pricing brain — analyze rates, lanes, and deal outcomes</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="180d">Last 180 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Win Rate", value: fmtPct(kpis.winRate), icon: Target, color: "text-emerald-500" },
          { label: "Avg Margin", value: fmtPct(kpis.avgMargin), icon: TrendingUp, color: "text-blue-400" },
          { label: "Promo Detections", value: String(kpis.promoDetections), icon: Sparkles, color: "text-amber-400" },
          { label: "Promo Profit Captured", value: fmt(kpis.promoProfitCaptured), icon: ShieldCheck, color: "text-emerald-500" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="lanes">
        <TabsList className="bg-transparent p-0 gap-1 mb-6">
          {[
            { value: "lanes", label: "Lane Performance" },
            { value: "promo", label: "Promo Effectiveness" },
            { value: "winloss", label: "Win/Loss Analysis" },
            { value: "carriers", label: "Carrier Comparison" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg px-4 py-2 text-xs font-medium border border-border">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Lane Performance ── */}
        <TabsContent value="lanes" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Margin by Lane</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={LANE_DATA} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} unit="%" />
                    <YAxis dataKey="code" type="category" tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} width={80} />
                    <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="avgMargin" fill="hsl(142,71%,45%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Win Rate by Lane</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={LANE_DATA} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} unit="%" />
                    <YAxis dataKey="code" type="category" tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} width={80} />
                    <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="winRate" fill="hsl(217,91%,60%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Lane Table */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Lane Details</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Lane</th>
                      <th className="text-right py-2 px-3 font-medium">Win Rate</th>
                      <th className="text-right py-2 px-3 font-medium">Avg Margin</th>
                      <th className="text-right py-2 px-3 font-medium">Avg Buy</th>
                      <th className="text-right py-2 px-3 font-medium">Quotes</th>
                      <th className="text-center py-2 px-3 font-medium">Competition</th>
                      <th className="text-right py-2 px-3 font-medium">Promo Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LANE_DATA.map(l => (
                      <tr key={l.code} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-medium">{l.lane}</td>
                        <td className="py-2.5 px-3 text-right">{fmtPct(l.winRate)}</td>
                        <td className={`py-2.5 px-3 text-right font-semibold ${l.avgMargin >= 10 ? "text-emerald-500" : l.avgMargin >= 7 ? "text-amber-400" : "text-red-400"}`}>{fmtPct(l.avgMargin)}</td>
                        <td className="py-2.5 px-3 text-right">{fmt(l.avgBuy)}</td>
                        <td className="py-2.5 px-3 text-right">{l.quoteVol}</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="outline" className={`text-[9px] ${l.competition === "high" ? "text-red-400 border-red-500/30" : l.competition === "moderate" ? "text-amber-400 border-amber-500/30" : "text-emerald-400 border-emerald-500/30"}`}>
                            {l.competition}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right">{l.promoUsage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Promo Effectiveness ── */}
        <TabsContent value="promo" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Promo Savings Capture Over Time</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} />
                    <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="promoCapture" stroke="hsl(142,71%,45%)" fill="hsl(142,71%,45%)" fillOpacity={0.15} name="Retention %" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Promo Savings Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={PROMO_DATA} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                      {PROMO_DATA.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {PROMO_DATA.map((d, i) => (
                    <div key={d.label} className="flex items-center gap-2 text-[10px]">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="ml-auto font-semibold">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Promo KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Promo Opportunities", value: "142", sub: "detected in period" },
              { label: "Extra Profit Captured", value: fmt(48200), sub: "from promo retention" },
              { label: "Avg Retention Rate", value: "62%", sub: "of savings retained" },
              { label: "Win Rate on Promo Deals", value: "64%", sub: "vs 45% standard" },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                  <p className="text-lg font-bold text-foreground mt-1">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Win/Loss Analysis ── */}
        <TabsContent value="winloss" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Win/Loss by Margin Range</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={WIN_LOSS_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                    <XAxis dataKey="margin" tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} />
                    <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="won" stackId="a" fill="hsl(142,71%,45%)" name="Won %" />
                    <Bar dataKey="lost" stackId="a" fill="hsl(0,84%,60%)" name="Lost %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Rate Trend: Buy vs Sell</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} />
                    <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="avgBuy" stroke="hsl(0,84%,60%)" name="Avg Buy" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="avgSell" stroke="hsl(142,71%,45%)" name="Avg Sell" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /> Pricing Insights</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { text: "Deals above 13% margin are lost 72% of the time — consider margin cap on competitive lanes", type: "warning" },
                  { text: "Win rate peaks at 5–8% margin range — optimal balance of competitiveness and profitability", type: "success" },
                  { text: "Promo-priced deals have 42% higher win rate than standard-priced deals", type: "success" },
                  { text: `Estimated ${fmt(12800)} in lost revenue from overpriced quotes this period`, type: "warning" },
                ].map((insight, i) => (
                  <div key={i} className={`rounded-lg p-3 border text-xs ${insight.type === "warning" ? "bg-amber-500/5 border-amber-500/20 text-amber-300" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"}`}>
                    {insight.text}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Carrier Comparison ── */}
        <TabsContent value="carriers" className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Carrier Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Carrier</th>
                      <th className="text-right py-2 px-3 font-medium">Shipments</th>
                      <th className="text-right py-2 px-3 font-medium">Avg Buy Rate</th>
                      <th className="text-right py-2 px-3 font-medium">Avg Margin</th>
                      <th className="text-right py-2 px-3 font-medium">Win Rate</th>
                      <th className="text-right py-2 px-3 font-medium">Promo Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CARRIER_DATA.map(c => (
                      <tr key={c.carrier} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-medium">{c.carrier}</td>
                        <td className="py-2.5 px-3 text-right">{c.shipments}</td>
                        <td className="py-2.5 px-3 text-right">{fmt(c.avgBuy)}</td>
                        <td className={`py-2.5 px-3 text-right font-semibold ${c.avgMargin >= 10 ? "text-emerald-500" : c.avgMargin >= 8 ? "text-amber-400" : "text-red-400"}`}>{fmtPct(c.avgMargin)}</td>
                        <td className="py-2.5 px-3 text-right">{fmtPct(c.winRate)}</td>
                        <td className="py-2.5 px-3 text-right">{c.promoRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Margin by Carrier</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={CARRIER_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                    <XAxis dataKey="carrier" tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} unit="%" />
                    <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="avgMargin" fill="hsl(280,68%,60%)" radius={[4, 4, 0, 0]} name="Avg Margin %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Promo Rate Frequency by Carrier</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={CARRIER_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,16%)" />
                    <XAxis dataKey="carrier" tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} unit="%" />
                    <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="promoRate" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} name="Promo %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminRateIntelligence;
