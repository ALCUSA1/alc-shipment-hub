import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const Accounting = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [marginFilter, setMarginFilter] = useState("all");

  // Fetch all shipments with quotes and financials
  const { data: shipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ["accounting-shipments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, status, origin_port, destination_port, created_at, companies!shipments_company_id_fkey(company_name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allQuotes } = useQuery({
    queryKey: ["accounting-quotes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("shipment_id, amount, status")
        .eq("user_id", user!.id)
        .eq("status", "accepted");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: allFinancials } = useQuery({
    queryKey: ["accounting-financials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_financials")
        .select("shipment_id, entry_type, amount, category")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const pnlData = useMemo(() => {
    if (!shipments) return [];

    const quoteMap = new Map<string, number>();
    (allQuotes || []).forEach((q) => {
      quoteMap.set(q.shipment_id, (quoteMap.get(q.shipment_id) || 0) + (q.amount || 0));
    });

    const financialMap = new Map<string, { revenue: number; cost: number; expense: number; ddCost: number }>();
    (allFinancials || []).forEach((f) => {
      const existing = financialMap.get(f.shipment_id) || { revenue: 0, cost: 0, expense: 0, ddCost: 0 };
      if (f.entry_type === "revenue") existing.revenue += f.amount;
      else if (f.entry_type === "cost") existing.cost += f.amount;
      else existing.expense += f.amount;
      if (f.category === "demurrage_detention") existing.ddCost += f.amount;
      financialMap.set(f.shipment_id, existing);
    });

    return shipments.map((s) => {
      const quoteRevenue = quoteMap.get(s.id) || 0;
      const fin = financialMap.get(s.id) || { revenue: 0, cost: 0, expense: 0, ddCost: 0 };
      const totalRevenue = quoteRevenue + fin.revenue;
      const grossProfit = totalRevenue - fin.cost;
      const netProfit = grossProfit - fin.expense;
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      return {
        ...s,
        companyName: (s.companies as any)?.company_name || null,
        totalRevenue,
        totalCost: fin.cost,
        totalExpense: fin.expense,
        ddCost: fin.ddCost,
        grossProfit,
        netProfit,
        netMargin,
      };
    });
  }, [shipments, allQuotes, allFinancials]);

  const filtered = useMemo(() => {
    return pnlData.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !(s.shipment_ref || "").toLowerCase().includes(q) &&
          !(s.companyName || "").toLowerCase().includes(q) &&
          !(s.origin_port || "").toLowerCase().includes(q) &&
          !(s.destination_port || "").toLowerCase().includes(q)
        )
          return false;
      }
      if (marginFilter === "profitable" && s.netProfit <= 0) return false;
      if (marginFilter === "loss" && s.netProfit >= 0) return false;
      if (marginFilter === "has_dd" && s.ddCost <= 0) return false;
      return true;
    });
  }, [pnlData, search, marginFilter]);

  // Aggregates
  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, s) => ({
        revenue: acc.revenue + s.totalRevenue,
        cost: acc.cost + s.totalCost,
        expense: acc.expense + s.totalExpense,
        grossProfit: acc.grossProfit + s.grossProfit,
        netProfit: acc.netProfit + s.netProfit,
      }),
      { revenue: 0, cost: 0, expense: 0, grossProfit: 0, netProfit: 0 }
    );
  }, [filtered]);

  const overallMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue) * 100 : 0;

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounting</h1>
          <p className="text-sm text-muted-foreground">Profit & Loss overview across all shipments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard label="Total Revenue" value={fmt(totals.revenue)} icon={<TrendingUp className="h-4 w-4 text-green-600" />} />
        <MetricCard label="Total COGS" value={fmt(totals.cost)} icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
        <MetricCard label="Gross Profit" value={fmt(totals.grossProfit)} positive={totals.grossProfit >= 0} />
        <MetricCard label="Operating Expenses" value={fmt(totals.expense)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
        <MetricCard label="Net Profit" value={fmt(totals.netProfit)} sub={`${overallMargin.toFixed(1)}% margin`} positive={totals.netProfit >= 0} highlight />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search ref, customer, port…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={marginFilter} onValueChange={setMarginFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shipments</SelectItem>
            <SelectItem value="profitable">Profitable</SelectItem>
            <SelectItem value="loss">At a Loss</SelectItem>
            <SelectItem value="has_dd">Has D&D Costs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shipment P&L Table */}
      <Card>
        <CardContent className="p-0">
          {shipmentsLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No shipments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground p-4">Reference</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Customer</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Route</th>
                    <th className="text-right font-medium text-muted-foreground p-4">Revenue</th>
                    <th className="text-right font-medium text-muted-foreground p-4">COGS</th>
                    <th className="text-right font-medium text-muted-foreground p-4">Gross Profit</th>
                    <th className="text-right font-medium text-muted-foreground p-4">Expenses</th>
                    <th className="text-right font-medium text-muted-foreground p-4">Net Profit</th>
                    <th className="text-right font-medium text-muted-foreground p-4">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b last:border-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/shipments/${s.id}`)}
                    >
                      <td className="p-4 font-mono font-medium text-accent">{s.shipment_ref}</td>
                      <td className="p-4 text-foreground">{s.companyName || <span className="text-muted-foreground">—</span>}</td>
                      <td className="p-4 text-muted-foreground">{s.origin_port || "—"} → {s.destination_port || "—"}</td>
                      <td className="p-4 text-right font-mono text-foreground">{fmt(s.totalRevenue)}</td>
                      <td className="p-4 text-right font-mono text-muted-foreground">{fmt(s.totalCost)}</td>
                      <td className={`p-4 text-right font-mono font-medium ${s.grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(s.grossProfit)}</td>
                      <td className="p-4 text-right font-mono text-muted-foreground">{fmt(s.totalExpense)}</td>
                      <td className={`p-4 text-right font-mono font-bold ${s.netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(s.netProfit)}</td>
                      <td className={`p-4 text-right font-mono text-xs ${s.netMargin >= 0 ? "text-green-600" : "text-red-500"}`}>{s.netMargin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-secondary/30 font-semibold">
                    <td className="p-4" colSpan={3}>Totals</td>
                    <td className="p-4 text-right font-mono">{fmt(totals.revenue)}</td>
                    <td className="p-4 text-right font-mono">{fmt(totals.cost)}</td>
                    <td className={`p-4 text-right font-mono ${totals.grossProfit >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(totals.grossProfit)}</td>
                    <td className="p-4 text-right font-mono">{fmt(totals.expense)}</td>
                    <td className={`p-4 text-right font-mono ${totals.netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(totals.netProfit)}</td>
                    <td className={`p-4 text-right font-mono text-xs ${overallMargin >= 0 ? "text-green-600" : "text-red-500"}`}>{overallMargin.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

function MetricCard({ label, value, icon, sub, positive, highlight }: { label: string; value: string; icon?: React.ReactNode; sub?: string; positive?: boolean; highlight?: boolean }) {
  return (
    <Card className={highlight ? "ring-2 ring-accent/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-1">
          {icon}
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className={`text-xl font-bold ${positive !== undefined ? (positive ? "text-green-700" : "text-red-600") : "text-foreground"}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default Accounting;
