import { AdminLayout } from "@/components/admin/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users, Package, BarChart3, ShieldCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const AdminProfitIntelligence = () => {
  const [tab, setTab] = useState("shipments");

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

      const scenarios = scenariosRes.data || [];
      const outputs = outputsRes.data || [];
      const splits = splitsRes.data || [];
      const shipments = shipmentsRes.data || [];
      const rates = ratesRes.data || [];

      // Map outputs by scenario
      const outputByScenario = new Map(outputs.map(o => [o.pricing_scenario_id, o]));
      const splitByScenario = new Map(splits.map(s => [s.pricing_scenario_id, s]));
      const rateByShipment = new Map(rates.map(r => [r.shipment_id, r]));
      const shipmentMap = new Map(shipments.map(s => [s.id, s]));

      // Build per-shipment profit data
      const shipmentProfits: any[] = [];
      let totalRevenue = 0, totalCost = 0, totalGross = 0, totalNet = 0;
      let totalPlatformRetained = 0, totalNetworkPaid = 0;
      let profitableCount = 0, lowMarginCount = 0;

      for (const sc of scenarios) {
        const out = outputByScenario.get(sc.id);
        const split = splitByScenario.get(sc.id);
        const ship = shipmentMap.get(sc.shipment_id);
        const rate = rateByShipment.get(sc.shipment_id);
        if (!out || !ship) continue;

        const sellPrice = Number(out.sell_price) || Number(out.recommended_sell_price) || 0;
        const trueCost = Number(out.true_total_cost) || 0;
        const netProfit = Number(out.net_profit) || (sellPrice - trueCost);
        const grossProfit = Number(out.gross_profit) || 0;
        const netMargin = sellPrice > 0 ? (netProfit / sellPrice) * 100 : 0;
        const platformRetained = Number(out.platform_retained_profit) || Number(split?.retained_platform_profit) || netProfit;
        const networkShare = Number(out.network_share) || Number(split?.network_amount) || 0;
        const carrierBuy = Number(out.carrier_buy_rate) || Number(rate?.total_buy_rate) || Number(rate?.total_freight) || Number(rate?.base_rate) || 0;

        totalRevenue += sellPrice;
        totalCost += trueCost;
        totalGross += grossProfit;
        totalNet += netProfit;
        totalPlatformRetained += platformRetained;
        totalNetworkPaid += networkShare;
        if (netMargin >= 6) profitableCount++; else lowMarginCount++;

        shipmentProfits.push({
          id: ship.id,
          ref: ship.shipment_ref || ship.id.slice(0, 8),
          carrier: rate?.carrier || "—",
          origin: ship.origin_port || "—",
          destination: ship.destination_port || "—",
          type: ship.shipment_type || ship.mode || "—",
          carrierBuy,
          sellPrice,
          trueCost,
          netProfit,
          platformRetained,
          netMargin,
          status: ship.lifecycle_stage || ship.status || "—",
        });
      }

      // Customer aggregation
      const customerMap = new Map<string, { shipments: number; revenue: number; netProfit: number; platformRetained: number }>();
      for (const sp of shipmentProfits) {
        const ship = shipmentMap.get(sp.id);
        const custId = ship?.customer_id || "direct";
        const entry = customerMap.get(custId) || { shipments: 0, revenue: 0, netProfit: 0, platformRetained: 0 };
        entry.shipments++;
        entry.revenue += sp.sellPrice;
        entry.netProfit += sp.netProfit;
        entry.platformRetained += sp.platformRetained;
        customerMap.set(custId, entry);
      }

      // Carrier aggregation
      const carrierMap = new Map<string, { shipments: number; avgBuy: number; totalRevenue: number; platformRetained: number; totalBuy: number }>();
      for (const sp of shipmentProfits) {
        if (sp.carrier === "—") continue;
        const entry = carrierMap.get(sp.carrier) || { shipments: 0, avgBuy: 0, totalRevenue: 0, platformRetained: 0, totalBuy: 0 };
        entry.shipments++;
        entry.totalRevenue += sp.sellPrice;
        entry.platformRetained += sp.platformRetained;
        entry.totalBuy += sp.carrierBuy;
        carrierMap.set(sp.carrier, entry);
      }

      const avgMargin = totalRevenue > 0 ? (totalNet / totalRevenue) * 100 : 0;

      return {
        totalRevenue, totalCost, totalGross, totalNet,
        totalPlatformRetained, totalNetworkPaid,
        avgMargin, profitableCount, lowMarginCount,
        shipmentProfits: shipmentProfits.sort((a, b) => b.netProfit - a.netProfit),
        customers: Array.from(customerMap.entries()).map(([id, v]) => ({
          id, ...v, avgMargin: v.revenue > 0 ? (v.netProfit / v.revenue) * 100 : 0,
        })).sort((a, b) => b.platformRetained - a.platformRetained),
        carriers: Array.from(carrierMap.entries()).map(([carrier, v]) => ({
          carrier, ...v, avgBuy: v.shipments > 0 ? v.totalBuy / v.shipments : 0,
          avgMargin: v.totalRevenue > 0 ? ((v.totalRevenue - v.totalBuy) / v.totalRevenue) * 100 : 0,
        })).sort((a, b) => b.platformRetained - a.platformRetained),
      };
    },
  });

  const metrics = [
    { label: "Total Revenue", value: data?.totalRevenue, icon: TrendingUp, color: "from-blue-500 to-blue-600", textColor: "text-blue-400" },
    { label: "True Total Cost", value: data?.totalCost, icon: TrendingDown, color: "from-slate-500 to-slate-600", textColor: "text-slate-400" },
    { label: "Net Profit", value: data?.totalNet, icon: DollarSign, color: "from-emerald-500 to-emerald-600", textColor: "text-emerald-400" },
    { label: "Platform Retained", value: data?.totalPlatformRetained, icon: ShieldCheck, color: "from-green-500 to-green-600", textColor: "text-green-400" },
    { label: "Network Paid Out", value: data?.totalNetworkPaid, icon: Users, color: "from-amber-500 to-amber-600", textColor: "text-amber-400" },
    { label: "Avg Net Margin", value: data?.avgMargin, icon: BarChart3, color: "from-purple-500 to-purple-600", textColor: "text-purple-400", isPct: true },
    { label: "Profitable", value: data?.profitableCount, icon: Package, color: "from-emerald-500 to-emerald-600", textColor: "text-emerald-400", isCount: true },
    { label: "Low Margin", value: data?.lowMarginCount, icon: AlertTriangle, color: "from-red-500 to-red-600", textColor: "text-red-400", isCount: true },
  ];

  const marginRiskShipments = useMemo(
    () => (data?.shipmentProfits || []).filter(s => s.netMargin < 6),
    [data]
  );

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="h-5 w-5 text-green-400" />
          <h1 className="text-2xl font-bold text-white">Platform Profit Intelligence</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Full profit visibility across shipments, customers, and carriers</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-[hsl(220,10%,45%)] uppercase tracking-wide">{m.label}</span>
              <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${m.color} flex items-center justify-center`}>
                <m.icon className="h-3 w-3 text-white" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-16 bg-[hsl(220,15%,15%)]" />
            ) : (
              <div className={`text-lg font-bold ${m.textColor}`}>
                {(m as any).isPct ? fmtPct(m.value || 0) : (m as any).isCount ? (m.value || 0) : fmt(m.value || 0)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,16%)]">
          <TabsTrigger value="shipments" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)]">Shipment Profit</TabsTrigger>
          <TabsTrigger value="customers" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)]">Customer Profit</TabsTrigger>
          <TabsTrigger value="carriers" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)]">Carrier Performance</TabsTrigger>
          <TabsTrigger value="risk" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)]">Margin Risk</TabsTrigger>
        </TabsList>

        {/* Shipment Profit Table */}
        <TabsContent value="shipments">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            <div className="p-4 border-b border-[hsl(220,15%,13%)]">
              <h2 className="text-sm font-semibold text-white">Shipment Profit Breakdown</h2>
              <p className="text-xs text-[hsl(220,10%,40%)]">Per-shipment profit with carrier buy rate visibility</p>
            </div>
            {isLoading ? <Skeleton className="h-64 m-4 bg-[hsl(220,15%,15%)]" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[hsl(220,15%,13%)] text-[hsl(220,10%,45%)]">
                      <th className="text-left p-3 font-medium">Shipment</th>
                      <th className="text-left p-3 font-medium">Carrier</th>
                      <th className="text-left p-3 font-medium">Route</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-right p-3 font-medium">Carrier Buy</th>
                      <th className="text-right p-3 font-medium">True Cost</th>
                      <th className="text-right p-3 font-medium">Sell Price</th>
                      <th className="text-right p-3 font-medium">Net Profit</th>
                      <th className="text-right p-3 font-medium">Platform Retained</th>
                      <th className="text-right p-3 font-medium">Margin %</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.shipmentProfits || []).length === 0 ? (
                      <tr><td colSpan={11} className="text-center p-8 text-[hsl(220,10%,35%)]">No pricing data yet</td></tr>
                    ) : (data?.shipmentProfits || []).map((s: any) => (
                      <tr key={s.id} className="border-b border-[hsl(220,15%,11%)] hover:bg-[hsl(220,15%,12%)] transition-colors">
                        <td className="p-3 text-white font-medium">{s.ref}</td>
                        <td className="p-3 text-[hsl(220,10%,60%)]">{s.carrier}</td>
                        <td className="p-3 text-[hsl(220,10%,60%)]">{s.origin} → {s.destination}</td>
                        <td className="p-3"><Badge variant="outline" className="text-[10px] border-[hsl(220,15%,20%)] text-[hsl(220,10%,50%)]">{s.type}</Badge></td>
                        <td className="p-3 text-right text-[hsl(220,10%,60%)]">{fmt(s.carrierBuy)}</td>
                        <td className="p-3 text-right text-[hsl(220,10%,60%)]">{fmt(s.trueCost)}</td>
                        <td className="p-3 text-right text-white font-medium">{fmt(s.sellPrice)}</td>
                        <td className={`p-3 text-right font-semibold ${s.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(s.netProfit)}</td>
                        <td className="p-3 text-right text-green-400 font-semibold">{fmt(s.platformRetained)}</td>
                        <td className={`p-3 text-right font-medium ${s.netMargin >= 10 ? 'text-emerald-400' : s.netMargin >= 6 ? 'text-amber-400' : 'text-red-400'}`}>{fmtPct(s.netMargin)}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-[10px] ${s.status === 'closed' || s.status === 'delivered' ? 'border-emerald-500/30 text-emerald-400' : 'border-[hsl(220,15%,20%)] text-[hsl(220,10%,50%)]'}`}>
                            {s.status}
                          </Badge>
                        </td>
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
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            <div className="p-4 border-b border-[hsl(220,15%,13%)]">
              <h2 className="text-sm font-semibold text-white">Customer Profitability</h2>
            </div>
            {isLoading ? <Skeleton className="h-64 m-4 bg-[hsl(220,15%,15%)]" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[hsl(220,15%,13%)] text-[hsl(220,10%,45%)]">
                      <th className="text-left p-3 font-medium">Customer</th>
                      <th className="text-right p-3 font-medium">Shipments</th>
                      <th className="text-right p-3 font-medium">Revenue</th>
                      <th className="text-right p-3 font-medium">Net Profit</th>
                      <th className="text-right p-3 font-medium">Platform Retained</th>
                      <th className="text-right p-3 font-medium">Avg Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.customers || []).length === 0 ? (
                      <tr><td colSpan={6} className="text-center p-8 text-[hsl(220,10%,35%)]">No data</td></tr>
                    ) : (data?.customers || []).map((c: any) => (
                      <tr key={c.id} className="border-b border-[hsl(220,15%,11%)] hover:bg-[hsl(220,15%,12%)] transition-colors">
                        <td className="p-3 text-white font-medium">{c.id === "direct" ? "Direct / Unlinked" : c.id.slice(0, 8)}</td>
                        <td className="p-3 text-right text-[hsl(220,10%,60%)]">{c.shipments}</td>
                        <td className="p-3 text-right text-white">{fmt(c.revenue)}</td>
                        <td className={`p-3 text-right font-semibold ${c.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(c.netProfit)}</td>
                        <td className="p-3 text-right text-green-400 font-semibold">{fmt(c.platformRetained)}</td>
                        <td className={`p-3 text-right ${c.avgMargin >= 10 ? 'text-emerald-400' : c.avgMargin >= 6 ? 'text-amber-400' : 'text-red-400'}`}>{fmtPct(c.avgMargin)}</td>
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
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            <div className="p-4 border-b border-[hsl(220,15%,13%)]">
              <h2 className="text-sm font-semibold text-white">Carrier Performance & Profit</h2>
            </div>
            {isLoading ? <Skeleton className="h-64 m-4 bg-[hsl(220,15%,15%)]" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[hsl(220,15%,13%)] text-[hsl(220,10%,45%)]">
                      <th className="text-left p-3 font-medium">Carrier</th>
                      <th className="text-right p-3 font-medium">Shipments</th>
                      <th className="text-right p-3 font-medium">Avg Buy Rate</th>
                      <th className="text-right p-3 font-medium">Total Revenue</th>
                      <th className="text-right p-3 font-medium">Platform Retained</th>
                      <th className="text-right p-3 font-medium">Avg Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.carriers || []).length === 0 ? (
                      <tr><td colSpan={6} className="text-center p-8 text-[hsl(220,10%,35%)]">No carrier data</td></tr>
                    ) : (data?.carriers || []).map((c: any) => (
                      <tr key={c.carrier} className="border-b border-[hsl(220,15%,11%)] hover:bg-[hsl(220,15%,12%)] transition-colors">
                        <td className="p-3 text-white font-medium">{c.carrier}</td>
                        <td className="p-3 text-right text-[hsl(220,10%,60%)]">{c.shipments}</td>
                        <td className="p-3 text-right text-[hsl(220,10%,60%)]">{fmt(c.avgBuy)}</td>
                        <td className="p-3 text-right text-white">{fmt(c.totalRevenue)}</td>
                        <td className="p-3 text-right text-green-400 font-semibold">{fmt(c.platformRetained)}</td>
                        <td className={`p-3 text-right ${c.avgMargin >= 10 ? 'text-emerald-400' : c.avgMargin >= 6 ? 'text-amber-400' : 'text-red-400'}`}>{fmtPct(c.avgMargin)}</td>
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
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            <div className="p-4 border-b border-[hsl(220,15%,13%)]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <h2 className="text-sm font-semibold text-white">Margin Risk Shipments</h2>
              </div>
              <p className="text-xs text-[hsl(220,10%,40%)]">Shipments below 6% net margin threshold</p>
            </div>
            {isLoading ? <Skeleton className="h-64 m-4 bg-[hsl(220,15%,15%)]" /> : marginRiskShipments.length === 0 ? (
              <div className="p-8 text-center text-sm text-emerald-400">✓ All shipments above minimum margin threshold</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[hsl(220,15%,13%)] text-[hsl(220,10%,45%)]">
                      <th className="text-left p-3 font-medium">Shipment</th>
                      <th className="text-left p-3 font-medium">Carrier</th>
                      <th className="text-right p-3 font-medium">Carrier Buy</th>
                      <th className="text-right p-3 font-medium">Sell Price</th>
                      <th className="text-right p-3 font-medium">Net Profit</th>
                      <th className="text-right p-3 font-medium">Margin %</th>
                      <th className="text-left p-3 font-medium">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marginRiskShipments.map((s: any) => (
                      <tr key={s.id} className="border-b border-[hsl(220,15%,11%)] hover:bg-red-500/5 transition-colors">
                        <td className="p-3 text-white font-medium">{s.ref}</td>
                        <td className="p-3 text-[hsl(220,10%,60%)]">{s.carrier}</td>
                        <td className="p-3 text-right text-[hsl(220,10%,60%)]">{fmt(s.carrierBuy)}</td>
                        <td className="p-3 text-right text-white">{fmt(s.sellPrice)}</td>
                        <td className={`p-3 text-right font-semibold ${s.netProfit >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{fmt(s.netProfit)}</td>
                        <td className="p-3 text-right text-red-400 font-semibold">{fmtPct(s.netMargin)}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400">
                            {s.netProfit < 0 ? 'LOSS' : s.netMargin < 3 ? 'Critical' : 'Low Margin'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminProfitIntelligence;
