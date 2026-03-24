import { AdminLayout } from "@/components/admin/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users,
  Package, BarChart3, ShieldCheck, CalendarIcon, PieChart,
  Lightbulb, ArrowUpRight, ArrowDownRight, Filter,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart as RePieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { useState, useMemo } from "react";
import { format, subDays, subMonths, isAfter, parseISO, startOfMonth } from "date-fns";

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const CHART_COLORS = {
  revenue: "hsl(217, 95%, 58%)",
  cost: "hsl(215, 14%, 45%)",
  profit: "hsl(142, 71%, 45%)",
  platform: "hsl(142, 76%, 36%)",
  referral: "hsl(38, 92%, 50%)",
  collab: "hsl(217, 95%, 58%)",
  other: "hsl(215, 20%, 65%)",
};

const PIE_COLORS = ["hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(217, 95%, 58%)", "hsl(215, 20%, 65%)"];

const AdminProfitIntelligence = () => {
  const [tab, setTab] = useState("shipments");
  const [dateRange, setDateRange] = useState("90d");
  const [typeFilter, setTypeFilter] = useState("all");
  const [carrierFilter, setCarrierFilter] = useState("all");

  const startDate = useMemo(() => {
    if (dateRange === "30d") return subDays(new Date(), 30);
    if (dateRange === "90d") return subDays(new Date(), 90);
    if (dateRange === "6m") return subMonths(new Date(), 6);
    if (dateRange === "1y") return subMonths(new Date(), 12);
    return subMonths(new Date(), 12);
  }, [dateRange]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-profit-intelligence"],
    queryFn: async () => {
      const [scenariosRes, outputsRes, splitsRes, shipmentsRes, ratesRes] = await Promise.all([
        supabase.from("pricing_scenarios").select("id, shipment_id, company_id, pricing_status, created_at"),
        supabase.from("pricing_outputs").select("*"),
        supabase.from("revenue_splits").select("*"),
        supabase.from("shipments").select("id, shipment_ref, shipment_type, mode, origin_port, destination_port, customer_id, user_id, status, lifecycle_stage, created_at"),
        supabase.from("shipment_rates").select("shipment_id, carrier, base_rate, total_buy_rate, total_freight"),
      ]);

      return {
        scenarios: scenariosRes.data || [],
        outputs: outputsRes.data || [],
        splits: splitsRes.data || [],
        shipments: shipmentsRes.data || [],
        rates: ratesRes.data || [],
      };
    },
  });

  const processed = useMemo(() => {
    if (!data) return null;
    const { scenarios, outputs, splits, shipments, rates } = data;

    const outputByScenario = new Map(outputs.map(o => [o.pricing_scenario_id, o]));
    const splitByScenario = new Map(splits.map(s => [s.pricing_scenario_id, s]));
    const rateByShipment = new Map(rates.map(r => [r.shipment_id, r]));
    const shipmentMap = new Map(shipments.map(s => [s.id, s]));

    const shipmentProfits: any[] = [];
    let totalRevenue = 0, totalCost = 0, totalNet = 0;
    let totalPlatformRetained = 0, totalNetworkPaid = 0;
    let totalReferralPaid = 0, totalCollabPaid = 0;
    let profitableCount = 0, lowMarginCount = 0;

    for (const sc of scenarios) {
      const out = outputByScenario.get(sc.id);
      const split = splitByScenario.get(sc.id);
      const ship = shipmentMap.get(sc.shipment_id);
      const rate = rateByShipment.get(sc.shipment_id);
      if (!out || !ship) continue;

      const createdAt = ship.created_at;
      if (isAfter(startDate, parseISO(createdAt))) continue;

      const shipType = (ship.shipment_type || ship.mode || "").toLowerCase();
      if (typeFilter !== "all" && shipType !== typeFilter) continue;

      const carrier = rate?.carrier || "—";
      if (carrierFilter !== "all" && carrier !== carrierFilter) continue;

      const sellPrice = Number(out.sell_price) || Number(out.recommended_sell_price) || 0;
      const trueCost = Number(out.true_total_cost) || 0;
      const netProfit = Number(out.net_profit) || (sellPrice - trueCost);
      const grossProfit = Number(out.gross_profit) || 0;
      const netMargin = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;
      const platformRetained = Number(out.platform_retained_profit) || Number(split?.retained_platform_profit) || netProfit;
      const networkShare = Number(out.network_share) || Number(split?.network_amount) || 0;
      const referralAmt = Number(split?.referral_amount) || 0;
      const collabAmt = Number(split?.collaboration_amount) || 0;
      const carrierBuy = Number(out.carrier_buy_rate) || Number(rate?.total_buy_rate) || Number(rate?.total_freight) || Number(rate?.base_rate) || 0;

      totalRevenue += sellPrice;
      totalCost += trueCost;
      totalNet += netProfit;
      totalPlatformRetained += platformRetained;
      totalNetworkPaid += networkShare;
      totalReferralPaid += referralAmt;
      totalCollabPaid += collabAmt;
      if (netMargin >= 6) profitableCount++; else lowMarginCount++;

      shipmentProfits.push({
        id: ship.id,
        ref: ship.shipment_ref || ship.id.slice(0, 8),
        carrier,
        origin: ship.origin_port || "—",
        destination: ship.destination_port || "—",
        type: ship.shipment_type || ship.mode || "—",
        carrierBuy, sellPrice, trueCost, netProfit, grossProfit,
        platformRetained, netMargin,
        status: ship.lifecycle_stage || ship.status || "—",
        createdAt,
      });
    }

    // Customer aggregation
    const customerMap = new Map<string, { shipments: number; revenue: number; netProfit: number; platformRetained: number }>();
    for (const sp of shipmentProfits) {
      const ship = shipmentMap.get(sp.id);
      const custId = ship?.customer_id || "direct";
      const e = customerMap.get(custId) || { shipments: 0, revenue: 0, netProfit: 0, platformRetained: 0 };
      e.shipments++; e.revenue += sp.sellPrice; e.netProfit += sp.netProfit; e.platformRetained += sp.platformRetained;
      customerMap.set(custId, e);
    }

    // Carrier aggregation
    const carrierAggMap = new Map<string, { shipments: number; totalRevenue: number; platformRetained: number; totalBuy: number }>();
    for (const sp of shipmentProfits) {
      if (sp.carrier === "—") continue;
      const e = carrierAggMap.get(sp.carrier) || { shipments: 0, totalRevenue: 0, platformRetained: 0, totalBuy: 0 };
      e.shipments++; e.totalRevenue += sp.sellPrice; e.platformRetained += sp.platformRetained; e.totalBuy += sp.carrierBuy;
      carrierAggMap.set(sp.carrier, e);
    }

    // Monthly trend
    const monthMap = new Map<string, { revenue: number; cost: number; profit: number; platform: number; margin: number; count: number }>();
    for (const sp of shipmentProfits) {
      const m = format(parseISO(sp.createdAt), "yyyy-MM");
      const e = monthMap.get(m) || { revenue: 0, cost: 0, profit: 0, platform: 0, margin: 0, count: 0 };
      e.revenue += sp.sellPrice; e.cost += sp.trueCost; e.profit += sp.netProfit; e.platform += sp.platformRetained; e.count++;
      monthMap.set(m, e);
    }
    const trendData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month: format(parseISO(month + "-01"), "MMM yy"),
        revenue: v.revenue, cost: v.cost, profit: v.profit, platform: v.platform,
        margin: v.revenue > 0 ? (v.profit / v.revenue) * 100 : 0,
      }));

    // Profit breakdown for pie
    const otherCosts = totalCost - totalPlatformRetained - totalReferralPaid - totalCollabPaid;
    const pieData = [
      { name: "Platform Retained", value: Math.max(0, totalPlatformRetained) },
      { name: "Referral Payout", value: Math.max(0, totalReferralPaid) },
      { name: "Collab Payout", value: Math.max(0, totalCollabPaid) },
      { name: "Other Costs", value: Math.max(0, totalNet - totalPlatformRetained) },
    ].filter(d => d.value > 0);

    const avgMargin = totalRevenue > 0 ? (totalNet / totalRevenue) * 100 : 0;

    // Unique carriers for filter
    const uniqueCarriers = Array.from(new Set(rates.map(r => r.carrier).filter(Boolean)));

    // Insights
    const insights: string[] = [];
    if (lowMarginCount > 0) insights.push(`${lowMarginCount} shipment${lowMarginCount > 1 ? 's' : ''} below 6% margin threshold`);

    const sortedCustomers = Array.from(customerMap.entries()).sort(([, a], [, b]) => b.platformRetained - a.platformRetained);
    if (sortedCustomers.length >= 3) {
      const top3Revenue = sortedCustomers.slice(0, 3).reduce((s, [, v]) => s + v.revenue, 0);
      const pct = totalRevenue > 0 ? (top3Revenue / totalRevenue * 100) : 0;
      if (pct > 50) insights.push(`${fmtPct(pct)} of revenue from top 3 customers`);
    }

    const lowestCarrier = Array.from(carrierAggMap.entries())
      .map(([c, v]) => ({ c, margin: v.totalRevenue > 0 ? ((v.totalRevenue - v.totalBuy) / v.totalRevenue * 100) : 0 }))
      .sort((a, b) => a.margin - b.margin)[0];
    if (lowestCarrier && lowestCarrier.margin < 10) insights.push(`Carrier ${lowestCarrier.c} has lowest margin at ${fmtPct(lowestCarrier.margin)}`);

    if (totalNetworkPaid > totalNet * 0.4 && totalNet > 0) insights.push("Network payouts exceeding 40% of net profit");

    return {
      totalRevenue, totalCost, totalNet, totalPlatformRetained, totalNetworkPaid,
      avgMargin, profitableCount, lowMarginCount,
      shipmentProfits: shipmentProfits.sort((a, b) => b.netProfit - a.netProfit),
      customers: sortedCustomers.map(([id, v]) => ({
        id, ...v, avgMargin: v.revenue > 0 ? (v.netProfit / v.revenue) * 100 : 0,
      })),
      carriers: Array.from(carrierAggMap.entries()).map(([carrier, v]) => ({
        carrier, ...v, avgBuy: v.shipments > 0 ? v.totalBuy / v.shipments : 0,
        avgMargin: v.totalRevenue > 0 ? ((v.totalRevenue - v.totalBuy) / v.totalRevenue) * 100 : 0,
      })).sort((a, b) => b.platformRetained - a.platformRetained),
      trendData, pieData, uniqueCarriers, insights,
    };
  }, [data, startDate, typeFilter, carrierFilter]);

  const marginRisk = useMemo(() => (processed?.shipmentProfits || []).filter(s => s.netMargin < 6), [processed]);

  const KpiCard = ({ label, value, icon: Icon, positive, isPct, isCount }: any) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {isLoading ? <Skeleton className="h-7 w-20" /> : (
        <div className={`text-xl font-black ${positive === false ? 'text-destructive' : positive ? 'text-emerald-500' : 'text-foreground'}`}>
          {isPct ? fmtPct(value || 0) : isCount ? (value || 0) : fmt(value || 0)}
        </div>
      )}
    </div>
  );

  const TableHead = ({ children, className = "" }: any) => (
    <th className={cn("text-left p-3 font-medium text-muted-foreground text-xs", className)}>{children}</th>
  );

  const TableCell = ({ children, className = "" }: any) => (
    <td className={cn("p-3 text-xs", className)}>{children}</td>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-black text-foreground">Platform Profit Intelligence</h1>
            </div>
            <p className="text-sm text-muted-foreground">Full profit visibility across shipments, customers, and carriers</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-8 w-28 text-xs"><CalendarIcon className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30d" className="text-xs">Last 30 days</SelectItem>
                <SelectItem value="90d" className="text-xs">Last 90 days</SelectItem>
                <SelectItem value="6m" className="text-xs">Last 6 months</SelectItem>
                <SelectItem value="1y" className="text-xs">Last year</SelectItem>
                <SelectItem value="all" className="text-xs">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-28 text-xs"><Package className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Types</SelectItem>
                <SelectItem value="fcl" className="text-xs">FCL</SelectItem>
                <SelectItem value="lcl" className="text-xs">LCL</SelectItem>
                <SelectItem value="air" className="text-xs">Air</SelectItem>
                <SelectItem value="trucking" className="text-xs">Trucking</SelectItem>
              </SelectContent>
            </Select>
            <Select value={carrierFilter} onValueChange={setCarrierFilter}>
              <SelectTrigger className="h-8 w-32 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Carriers</SelectItem>
                {(processed?.uniqueCarriers || []).map((c: string) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <KpiCard label="Total Revenue" value={processed?.totalRevenue} icon={TrendingUp} />
          <KpiCard label="Total Cost" value={processed?.totalCost} icon={TrendingDown} />
          <KpiCard label="Net Profit" value={processed?.totalNet} icon={DollarSign} positive={(processed?.totalNet || 0) >= 0} />
          <KpiCard label="Platform Retained" value={processed?.totalPlatformRetained} icon={ShieldCheck} positive />
          <KpiCard label="Network Payout" value={processed?.totalNetworkPaid} icon={Users} />
          <KpiCard label="Avg Margin" value={processed?.avgMargin} icon={BarChart3} isPct positive={(processed?.avgMargin || 0) >= 6} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue vs Cost Trend */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-accent" />
              Revenue vs Cost & Profit Trend
            </h3>
            {isLoading ? <Skeleton className="h-56" /> : (processed?.trendData || []).length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No trend data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={processed?.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(213, 50%, 20%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215, 20%, 65%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(215, 20%, 65%)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(213, 67%, 10%)", border: "1px solid hsl(213, 50%, 20%)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [fmt(v), name]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} fill={CHART_COLORS.revenue} fillOpacity={0.1} name="Revenue" />
                  <Area type="monotone" dataKey="cost" stroke={CHART_COLORS.cost} fill={CHART_COLORS.cost} fillOpacity={0.1} name="Cost" />
                  <Area type="monotone" dataKey="profit" stroke={CHART_COLORS.profit} fill={CHART_COLORS.profit} fillOpacity={0.15} name="Net Profit" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Profit Breakdown Pie */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <PieChart className="h-3.5 w-3.5 text-emerald-500" />
              Profit Distribution
            </h3>
            {isLoading ? <Skeleton className="h-56" /> : (processed?.pieData || []).length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RePieChart>
                  <Pie data={processed?.pieData} cx="50%" cy="45%" outerRadius={70} innerRadius={40} paddingAngle={2} dataKey="value">
                    {(processed?.pieData || []).map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(213, 67%, 10%)", border: "1px solid hsl(213, 50%, 20%)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [fmt(v)]}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Margin trend */}
        {(processed?.trendData || []).length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              Net Margin % Trend
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={processed?.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(213, 50%, 20%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215, 20%, 65%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215, 20%, 65%)" }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "hsl(213, 67%, 10%)", border: "1px solid hsl(213, 50%, 20%)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [fmtPct(v), "Net Margin"]}
                />
                <Line type="monotone" dataKey="margin" stroke={CHART_COLORS.profit} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Insights */}
        {(processed?.insights || []).length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Insights & Alerts
            </h3>
            <div className="space-y-1.5">
              {processed?.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-3">
          <TabsList>
            <TabsTrigger value="shipments">Shipment Profit</TabsTrigger>
            <TabsTrigger value="customers">Customer Profit</TabsTrigger>
            <TabsTrigger value="carriers">Carrier Performance</TabsTrigger>
            <TabsTrigger value="risk">
              Margin Risk
              {(marginRisk.length > 0) && (
                <Badge variant="destructive" className="ml-1.5 h-4 text-[9px] px-1">{marginRisk.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Shipment Profit Table */}
          <TabsContent value="shipments">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Shipment Profit Breakdown</h2>
                <p className="text-[10px] text-muted-foreground">{processed?.shipmentProfits.length || 0} shipments with pricing data</p>
              </div>
              {isLoading ? <Skeleton className="h-64 m-4" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <TableHead>Shipment</TableHead>
                        <TableHead>Carrier</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Buy Rate</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">Sell Price</TableHead>
                        <TableHead className="text-right">Net Profit</TableHead>
                        <TableHead className="text-right">Platform</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead>Status</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {(processed?.shipmentProfits || []).length === 0 ? (
                        <tr><td colSpan={11} className="text-center p-8 text-muted-foreground text-sm">No pricing data yet</td></tr>
                      ) : (processed?.shipmentProfits || []).map((s: any) => (
                        <tr key={s.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                          <TableCell className="text-foreground font-medium">{s.ref}</TableCell>
                          <TableCell className="text-muted-foreground">{s.carrier}</TableCell>
                          <TableCell className="text-muted-foreground">{s.origin} → {s.destination}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{s.type}</Badge></TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmt(s.carrierBuy)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmt(s.trueCost)}</TableCell>
                          <TableCell className="text-right text-foreground font-medium">{fmt(s.sellPrice)}</TableCell>
                          <TableCell className={cn("text-right font-semibold", s.netProfit >= 0 ? "text-emerald-500" : "text-destructive")}>{fmt(s.netProfit)}</TableCell>
                          <TableCell className="text-right text-emerald-500 font-semibold">{fmt(s.platformRetained)}</TableCell>
                          <TableCell className={cn("text-right font-medium", s.netMargin >= 10 ? "text-emerald-500" : s.netMargin >= 6 ? "text-amber-500" : "text-destructive")}>{fmtPct(s.netMargin)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]", (s.status === "closed" || s.status === "delivered") && "border-emerald-500/30 text-emerald-500")}>
                              {s.status}
                            </Badge>
                          </TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Customer Profit */}
          <TabsContent value="customers">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Customer Profitability</h2>
              </div>
              {isLoading ? <Skeleton className="h-64 m-4" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Shipments</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Net Profit</TableHead>
                        <TableHead className="text-right">Platform Retained</TableHead>
                        <TableHead className="text-right">Avg Margin</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {(processed?.customers || []).length === 0 ? (
                        <tr><td colSpan={6} className="text-center p-8 text-muted-foreground text-sm">No data</td></tr>
                      ) : (processed?.customers || []).map((c: any) => (
                        <tr key={c.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                          <TableCell className="text-foreground font-medium">{c.id === "direct" ? "Direct / Unlinked" : c.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{c.shipments}</TableCell>
                          <TableCell className="text-right text-foreground">{fmt(c.revenue)}</TableCell>
                          <TableCell className={cn("text-right font-semibold", c.netProfit >= 0 ? "text-emerald-500" : "text-destructive")}>{fmt(c.netProfit)}</TableCell>
                          <TableCell className="text-right text-emerald-500 font-semibold">{fmt(c.platformRetained)}</TableCell>
                          <TableCell className={cn("text-right", c.avgMargin >= 10 ? "text-emerald-500" : c.avgMargin >= 6 ? "text-amber-500" : "text-destructive")}>{fmtPct(c.avgMargin)}</TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Carrier Performance */}
          <TabsContent value="carriers">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Carrier Performance & Profit</h2>
              </div>
              {isLoading ? <Skeleton className="h-64 m-4" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <TableHead>Carrier</TableHead>
                        <TableHead className="text-right">Shipments</TableHead>
                        <TableHead className="text-right">Avg Buy Rate</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                        <TableHead className="text-right">Platform Retained</TableHead>
                        <TableHead className="text-right">Avg Margin</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {(processed?.carriers || []).length === 0 ? (
                        <tr><td colSpan={6} className="text-center p-8 text-muted-foreground text-sm">No carrier data</td></tr>
                      ) : (processed?.carriers || []).map((c: any) => (
                        <tr key={c.carrier} className="border-b border-border hover:bg-secondary/50 transition-colors">
                          <TableCell className="text-foreground font-medium">{c.carrier}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{c.shipments}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmt(c.avgBuy)}</TableCell>
                          <TableCell className="text-right text-foreground">{fmt(c.totalRevenue)}</TableCell>
                          <TableCell className="text-right text-emerald-500 font-semibold">{fmt(c.platformRetained)}</TableCell>
                          <TableCell className={cn("text-right", c.avgMargin >= 10 ? "text-emerald-500" : c.avgMargin >= 6 ? "text-amber-500" : "text-destructive")}>{fmtPct(c.avgMargin)}</TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Margin Risk */}
          <TabsContent value="risk">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h2 className="text-sm font-semibold text-foreground">Margin Risk Shipments</h2>
                </div>
                <p className="text-[10px] text-muted-foreground">Shipments below 6% net margin threshold</p>
              </div>
              {isLoading ? <Skeleton className="h-64 m-4" /> : marginRisk.length === 0 ? (
                <div className="p-8 text-center text-sm text-emerald-500 flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> All shipments above minimum margin threshold
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <TableHead>Shipment</TableHead>
                        <TableHead>Carrier</TableHead>
                        <TableHead className="text-right">Buy Rate</TableHead>
                        <TableHead className="text-right">Sell Price</TableHead>
                        <TableHead className="text-right">Net Profit</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead>Risk</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {marginRisk.map((s: any) => (
                        <tr key={s.id} className="border-b border-border hover:bg-destructive/5 transition-colors">
                          <TableCell className="text-foreground font-medium">{s.ref}</TableCell>
                          <TableCell className="text-muted-foreground">{s.carrier}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmt(s.carrierBuy)}</TableCell>
                          <TableCell className="text-right text-foreground">{fmt(s.sellPrice)}</TableCell>
                          <TableCell className={cn("text-right font-semibold", s.netProfit >= 0 ? "text-amber-500" : "text-destructive")}>{fmt(s.netProfit)}</TableCell>
                          <TableCell className="text-right text-destructive font-semibold">{fmtPct(s.netMargin)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-[10px]">
                              {s.netProfit < 0 ? "LOSS" : s.netMargin < 3 ? "Critical" : "Low Margin"}
                            </Badge>
                          </TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminProfitIntelligence;
