import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from "recharts";
import {
  BarChart3, TrendingUp, DollarSign, Target, Users, Percent,
  Trophy, AlertTriangle, Sparkles, ShieldCheck,
} from "lucide-react";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];
const fmt = (v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const AdminSalesAnalytics = () => {
  const [dateRange, setDateRange] = useState("90d");
  const [shipmentTypeFilter, setShipmentTypeFilter] = useState("all");

  // Fetch pricing scenarios + outputs for profitability data
  const { data: scenarios } = useQuery({
    queryKey: ["sales-prof-scenarios"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pricing_scenarios")
        .select("id, shipment_id, status, carrier_buy_rate, sell_price, is_selected, created_at, created_by_user_id");
      return data || [];
    },
  });

  const { data: outputs } = useQuery({
    queryKey: ["sales-prof-outputs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pricing_outputs")
        .select("scenario_id, total_cost, sell_price, net_profit, net_margin_pct, platform_retained_profit, network_payout_total");
      return data || [];
    },
  });

  const { data: shipments } = useQuery({
    queryKey: ["sales-prof-shipments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select("id, shipment_ref, shipment_type, mode, origin_port, destination_port, lifecycle_stage, customer_id, user_id, created_at");
      return data || [];
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["sales-prof-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, company_name");
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["sales-prof-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
  });

  const isLoading = !scenarios || !outputs || !shipments;

  // Build enriched dataset
  const enriched = useMemo(() => {
    if (!scenarios || !outputs || !shipments) return [];
    const outputMap = new Map(outputs.map((o: any) => [o.scenario_id, o]));
    const shipMap = new Map(shipments.map((s: any) => [s.id, s]));
    const compMap = new Map((companies || []).map((c: any) => [c.id, c.company_name]));
    const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

    return scenarios
      .filter((s: any) => s.is_selected)
      .map((sc: any) => {
        const out = outputMap.get(sc.id);
        const ship = shipMap.get(sc.shipment_id);
        if (!ship) return null;
        const buyRate = Number(sc.carrier_buy_rate) || 0;
        const sellPrice = Number(out?.sell_price || sc.sell_price) || 0;
        const totalCost = Number(out?.total_cost) || buyRate;
        const netProfit = Number(out?.net_profit) || (sellPrice - totalCost);
        const netMargin = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;
        const platformRetained = Number(out?.platform_retained_profit) || netProfit * 0.7;
        const networkPayout = Number(out?.network_payout_total) || 0;
        return {
          shipmentId: sc.shipment_id,
          shipmentRef: ship.shipment_ref,
          shipmentType: ship.shipment_type || ship.mode || "fcl",
          lane: `${ship.origin_port || "?"} → ${ship.destination_port || "?"}`,
          customerId: ship.customer_id,
          customerName: compMap.get(ship.customer_id) || "—",
          repId: ship.user_id,
          repName: profMap.get(ship.user_id) || profMap.get(sc.created_by_user_id) || "—",
          buyRate, sellPrice, totalCost, netProfit, netMargin, platformRetained, networkPayout,
          status: sc.status,
          createdAt: sc.created_at,
          isWon: ["approved", "booked"].includes(sc.status),
          isPromo: buyRate > 0 && buyRate < totalCost * 0.7, // rough promo detection
        };
      })
      .filter(Boolean) as any[];
  }, [scenarios, outputs, shipments, companies, profiles]);

  // KPIs
  const kpis = useMemo(() => {
    const filtered = enriched;
    const totalRevenue = filtered.reduce((s, d) => s + d.sellPrice, 0);
    const totalNetProfit = filtered.reduce((s, d) => s + d.netProfit, 0);
    const totalPlatform = filtered.reduce((s, d) => s + d.platformRetained, 0);
    const avgMargin = filtered.length > 0 ? filtered.reduce((s, d) => s + d.netMargin, 0) / filtered.length : 0;
    const won = filtered.filter(d => d.isWon);
    const winRate = filtered.length > 0 ? (won.length / filtered.length) * 100 : 0;
    const profitPerWon = won.length > 0 ? totalNetProfit / won.length : 0;
    const lowMarginCount = filtered.filter(d => d.netMargin < 5).length;
    return { totalRevenue, totalNetProfit, totalPlatform, avgMargin, quotesWon: won.length, quotesLost: filtered.length - won.length, winRate, profitPerWon, lowMarginCount, total: filtered.length };
  }, [enriched]);

  // Rep aggregation
  const repData = useMemo(() => {
    const map = new Map<string, any>();
    enriched.forEach(d => {
      const existing = map.get(d.repName) || { rep: d.repName, sent: 0, won: 0, revenue: 0, netProfit: 0, platform: 0, margins: [], lowMargin: 0 };
      existing.sent++;
      if (d.isWon) existing.won++;
      existing.revenue += d.sellPrice;
      existing.netProfit += d.netProfit;
      existing.platform += d.platformRetained;
      existing.margins.push(d.netMargin);
      if (d.netMargin < 5) existing.lowMargin++;
      map.set(d.repName, existing);
    });
    return Array.from(map.values()).map(r => ({
      ...r,
      winRate: r.sent > 0 ? (r.won / r.sent) * 100 : 0,
      avgMargin: r.margins.length > 0 ? r.margins.reduce((a: number, b: number) => a + b, 0) / r.margins.length : 0,
      avgProfit: r.won > 0 ? r.netProfit / r.won : 0,
    })).sort((a, b) => b.platform - a.platform);
  }, [enriched]);

  // Customer aggregation
  const customerData = useMemo(() => {
    const map = new Map<string, any>();
    enriched.forEach(d => {
      const existing = map.get(d.customerName) || { name: d.customerName, count: 0, revenue: 0, netProfit: 0, platform: 0, margins: [], won: 0, total: 0 };
      existing.count++;
      existing.total++;
      if (d.isWon) existing.won++;
      existing.revenue += d.sellPrice;
      existing.netProfit += d.netProfit;
      existing.platform += d.platformRetained;
      existing.margins.push(d.netMargin);
      map.set(d.customerName, existing);
    });
    return Array.from(map.values()).map(c => ({
      ...c,
      avgMargin: c.margins.length ? c.margins.reduce((a: number, b: number) => a + b, 0) / c.margins.length : 0,
      winRate: c.total > 0 ? (c.won / c.total) * 100 : 0,
    })).sort((a, b) => b.platform - a.platform);
  }, [enriched]);

  // Lane aggregation
  const laneData = useMemo(() => {
    const map = new Map<string, any>();
    enriched.forEach(d => {
      const existing = map.get(d.lane) || { lane: d.lane, count: 0, revenue: 0, netProfit: 0, platform: 0, margins: [], promos: 0, won: 0, total: 0 };
      existing.count++;
      existing.total++;
      if (d.isWon) existing.won++;
      existing.revenue += d.sellPrice;
      existing.netProfit += d.netProfit;
      existing.platform += d.platformRetained;
      existing.margins.push(d.netMargin);
      if (d.isPromo) existing.promos++;
      map.set(d.lane, existing);
    });
    return Array.from(map.values()).map(l => ({
      ...l,
      avgMargin: l.margins.length ? l.margins.reduce((a: number, b: number) => a + b, 0) / l.margins.length : 0,
      winRate: l.total > 0 ? (l.won / l.total) * 100 : 0,
    })).sort((a, b) => b.platform - a.platform);
  }, [enriched]);

  // Insights
  const insights = useMemo(() => {
    const list: { text: string; type: "info" | "warning" | "success" }[] = [];
    if (repData.length > 0) {
      const topRev = repData.reduce((a, b) => a.revenue > b.revenue ? a : b);
      const topProf = repData.reduce((a, b) => a.platform > b.platform ? a : b);
      if (topRev.rep !== topProf.rep) {
        list.push({ text: `${topRev.rep} has highest revenue but ${topProf.rep} drives most platform profit.`, type: "warning" });
      }
      const discounter = repData.find(r => r.avgMargin < 5 && r.sent > 2);
      if (discounter) list.push({ text: `${discounter.rep} wins deals at dangerously low margins — review pricing discipline.`, type: "warning" });
    }
    if (customerData.length > 0 && kpis.totalRevenue > 0) {
      const top3Rev = customerData.slice(0, 3).reduce((s, c) => s + c.revenue, 0);
      if (top3Rev / kpis.totalRevenue > 0.5) list.push({ text: `Over 50% of revenue comes from top 3 customers — diversification needed.`, type: "warning" });
    }
    if (kpis.lowMarginCount > 0) list.push({ text: `${kpis.lowMarginCount} shipments below 5% margin threshold.`, type: "warning" });
    const promoDeals = enriched.filter(d => d.isPromo);
    if (promoDeals.length > 0) list.push({ text: `${promoDeals.length} promo-rate deals detected — avg margin ${fmtPct(promoDeals.reduce((s, d) => s + d.netMargin, 0) / promoDeals.length)}.`, type: "info" });
    if (kpis.winRate > 60) list.push({ text: `Win rate at ${fmtPct(kpis.winRate)} — strong conversion performance.`, type: "success" });
    return list;
  }, [repData, customerData, enriched, kpis]);

  // Chart data for rep profit
  const repChartData = repData.slice(0, 8).map(r => ({ name: r.rep?.split(" ")[0] || "?", revenue: Math.round(r.revenue), platform: Math.round(r.platform) }));

  const card = "rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)]";
  const tooltipStyle = { background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 12, color: "#fff" };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Sales Profitability Intelligence</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Profit-first sales performance across reps, customers, lanes, and promo rates</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-28 h-8 text-xs bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white"><SelectValue /></SelectTrigger>
          <SelectContent>{["30d", "60d", "90d", "180d", "1y"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={shipmentTypeFilter} onValueChange={setShipmentTypeFilter}>
          <SelectTrigger className="w-28 h-8 text-xs bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white"><SelectValue /></SelectTrigger>
          <SelectContent>{["all", "fcl", "lcl", "air", "trucking"].map(v => <SelectItem key={v} value={v} className="text-xs">{v === "all" ? "All Types" : v.toUpperCase()}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-96 w-full bg-[hsl(220,15%,15%)]" /> : (
        <>
          {/* KPIs */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Revenue", value: fmt(kpis.totalRevenue), icon: DollarSign, color: "text-emerald-400" },
              { label: "Net Profit", value: fmt(kpis.totalNetProfit), icon: TrendingUp, color: "text-emerald-400" },
              { label: "Platform Retained", value: fmt(kpis.totalPlatform), icon: ShieldCheck, color: "text-violet-400" },
              { label: "Avg Margin", value: fmtPct(kpis.avgMargin), icon: Percent, color: "text-blue-400" },
            ].map(m => (
              <div key={m.label} className={`${card} p-5`}>
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">{m.label}</p>
                </div>
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Quotes Won", value: kpis.quotesWon, color: "text-emerald-400" },
              { label: "Quotes Lost", value: kpis.quotesLost, color: "text-red-400" },
              { label: "Win Rate", value: fmtPct(kpis.winRate), color: "text-blue-400" },
              { label: "Profit / Won", value: fmt(kpis.profitPerWon), color: "text-amber-400" },
            ].map(m => (
              <div key={m.label} className={`${card} p-4 flex items-center gap-3`}>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-[hsl(220,10%,50%)]">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className={`${card} p-4 mb-6`}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Sales Quality Insights</h3>
              </div>
              <div className="space-y-1.5">
                {insights.map((ins, i) => (
                  <p key={i} className={`text-xs flex items-start gap-2 ${ins.type === "warning" ? "text-amber-400" : ins.type === "success" ? "text-emerald-400" : "text-blue-300"}`}>
                    {ins.type === "warning" ? <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> : ins.type === "success" ? <Trophy className="h-3 w-3 mt-0.5 shrink-0" /> : <Target className="h-3 w-3 mt-0.5 shrink-0" />}
                    {ins.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <div className={`${card} p-5`}>
              <h3 className="text-sm font-semibold text-white mb-4">Revenue vs Platform Profit by Rep</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={repChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220,10%,45%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,45%)" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="platform" fill="#10b981" radius={[4, 4, 0, 0]} name="Platform Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`${card} p-5`}>
              <h3 className="text-sm font-semibold text-white mb-4">Profit Distribution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Platform Retained", value: Math.round(kpis.totalPlatform) },
                      { name: "Network Payout", value: Math.round(enriched.reduce((s, d) => s + d.networkPayout, 0)) },
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabbed Data Views */}
          <Tabs defaultValue="reps" className="mb-6">
            <TabsList className="bg-[hsl(220,18%,10%)] border border-[hsl(220,15%,15%)]">
              <TabsTrigger value="reps" className="text-xs">Sales Reps</TabsTrigger>
              <TabsTrigger value="customers" className="text-xs">Customers</TabsTrigger>
              <TabsTrigger value="lanes" className="text-xs">Lanes</TabsTrigger>
              <TabsTrigger value="promo" className="text-xs">Promo Rates</TabsTrigger>
            </TabsList>

            <TabsContent value="reps">
              <div className={`${card} overflow-x-auto`}>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-[hsl(220,15%,15%)]">
                    {["Sales Rep", "Sent", "Won", "Win Rate", "Revenue", "Net Profit", "Platform", "Avg Margin", "Avg Profit/Ship", "Low Margin"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] font-semibold">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {repData.map((r, i) => (
                      <tr key={i} className="border-b border-[hsl(220,15%,12%)] hover:bg-[hsl(220,18%,12%)]">
                        <td className="px-4 py-3 text-white font-medium">{r.rep}</td>
                        <td className="px-4 py-3 text-[hsl(220,10%,60%)]">{r.sent}</td>
                        <td className="px-4 py-3 text-emerald-400">{r.won}</td>
                        <td className="px-4 py-3 text-blue-400">{fmtPct(r.winRate)}</td>
                        <td className="px-4 py-3 text-white">{fmt(r.revenue)}</td>
                        <td className="px-4 py-3 text-emerald-400">{fmt(r.netProfit)}</td>
                        <td className="px-4 py-3 text-violet-400 font-semibold">{fmt(r.platform)}</td>
                        <td className={`px-4 py-3 ${r.avgMargin >= 6 ? "text-emerald-400" : "text-amber-400"}`}>{fmtPct(r.avgMargin)}</td>
                        <td className="px-4 py-3 text-white">{fmt(r.avgProfit)}</td>
                        <td className="px-4 py-3">{r.lowMargin > 0 ? <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[9px]">{r.lowMargin}</Badge> : <span className="text-[hsl(220,10%,30%)]">0</span>}</td>
                      </tr>
                    ))}
                    {repData.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-[hsl(220,10%,40%)]">No data available</td></tr>}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="customers">
              <div className={`${card} overflow-x-auto`}>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-[hsl(220,15%,15%)]">
                    {["Customer", "Shipments", "Revenue", "Net Profit", "Platform", "Avg Margin", "Win Rate"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] font-semibold">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {customerData.map((c, i) => (
                      <tr key={i} className="border-b border-[hsl(220,15%,12%)] hover:bg-[hsl(220,18%,12%)]">
                        <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-[hsl(220,10%,60%)]">{c.count}</td>
                        <td className="px-4 py-3 text-white">{fmt(c.revenue)}</td>
                        <td className="px-4 py-3 text-emerald-400">{fmt(c.netProfit)}</td>
                        <td className="px-4 py-3 text-violet-400 font-semibold">{fmt(c.platform)}</td>
                        <td className={`px-4 py-3 ${c.avgMargin >= 6 ? "text-emerald-400" : "text-amber-400"}`}>{fmtPct(c.avgMargin)}</td>
                        <td className="px-4 py-3 text-blue-400">{fmtPct(c.winRate)}</td>
                      </tr>
                    ))}
                    {customerData.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-[hsl(220,10%,40%)]">No data available</td></tr>}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="lanes">
              <div className={`${card} overflow-x-auto`}>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-[hsl(220,15%,15%)]">
                    {["Trade Lane", "Shipments", "Revenue", "Net Profit", "Platform", "Avg Margin", "Promos", "Win Rate"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] font-semibold">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {laneData.map((l, i) => (
                      <tr key={i} className="border-b border-[hsl(220,15%,12%)] hover:bg-[hsl(220,18%,12%)]">
                        <td className="px-4 py-3 text-white font-medium">{l.lane}</td>
                        <td className="px-4 py-3 text-[hsl(220,10%,60%)]">{l.count}</td>
                        <td className="px-4 py-3 text-white">{fmt(l.revenue)}</td>
                        <td className="px-4 py-3 text-emerald-400">{fmt(l.netProfit)}</td>
                        <td className="px-4 py-3 text-violet-400 font-semibold">{fmt(l.platform)}</td>
                        <td className={`px-4 py-3 ${l.avgMargin >= 6 ? "text-emerald-400" : "text-amber-400"}`}>{fmtPct(l.avgMargin)}</td>
                        <td className="px-4 py-3">{l.promos > 0 ? <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px]">{l.promos}</Badge> : "—"}</td>
                        <td className="px-4 py-3 text-blue-400">{fmtPct(l.winRate)}</td>
                      </tr>
                    ))}
                    {laneData.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-[hsl(220,10%,40%)]">No data available</td></tr>}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="promo">
              <div className={`${card} p-5`}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Promo Rate Effectiveness</h3>
                </div>
                {(() => {
                  const promos = enriched.filter(d => d.isPromo);
                  const standard = enriched.filter(d => !d.isPromo);
                  const promoAvgMargin = promos.length ? promos.reduce((s, d) => s + d.netMargin, 0) / promos.length : 0;
                  const stdAvgMargin = standard.length ? standard.reduce((s, d) => s + d.netMargin, 0) / standard.length : 0;
                  const promoWin = promos.length ? (promos.filter(d => d.isWon).length / promos.length) * 100 : 0;
                  const stdWin = standard.length ? (standard.filter(d => d.isWon).length / standard.length) * 100 : 0;
                  return (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { label: "Promo Deals", count: promos.length, margin: promoAvgMargin, winRate: promoWin, profit: promos.reduce((s, d) => s + d.platformRetained, 0) },
                        { label: "Standard Deals", count: standard.length, margin: stdAvgMargin, winRate: stdWin, profit: standard.reduce((s, d) => s + d.platformRetained, 0) },
                      ].map(g => (
                        <div key={g.label} className="rounded-lg border border-[hsl(220,15%,15%)] p-4">
                          <p className="text-xs font-semibold text-white mb-3">{g.label} ({g.count})</p>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-[hsl(220,10%,50%)]">Avg Margin</span><span className={g.margin >= 6 ? "text-emerald-400" : "text-amber-400"}>{fmtPct(g.margin)}</span></div>
                            <div className="flex justify-between"><span className="text-[hsl(220,10%,50%)]">Win Rate</span><span className="text-blue-400">{fmtPct(g.winRate)}</span></div>
                            <div className="flex justify-between"><span className="text-[hsl(220,10%,50%)]">Platform Profit</span><span className="text-violet-400 font-semibold">{fmt(g.profit)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminSalesAnalytics;
