import { AdminLayout } from "@/components/admin/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const AdminFinancials = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-financials"],
    queryFn: async () => {
      const [financialsRes, quotesRes, paymentsRes] = await Promise.all([
        supabase.from("shipment_financials").select("*"),
        supabase.from("quotes").select("customer_price, carrier_cost, status").in("status", ["accepted", "converted"]),
        supabase.from("payments").select("amount, status"),
      ]);

      const financials = financialsRes.data || [];
      const quotes = quotesRes.data || [];

      const totalRevenue = financials.filter(f => f.entry_type === "revenue").reduce((s, f) => s + f.amount, 0);
      const totalCosts = financials.filter(f => f.entry_type === "cost").reduce((s, f) => s + f.amount, 0);

      const quoteRevenue = quotes.reduce((s, q) => s + (q.customer_price || 0), 0);
      const quoteCost = quotes.reduce((s, q) => s + (q.carrier_cost || 0), 0);

      const categoryMap: Record<string, { revenue: number; cost: number }> = {};
      for (const f of financials) {
        if (!categoryMap[f.category]) categoryMap[f.category] = { revenue: 0, cost: 0 };
        if (f.entry_type === "revenue") categoryMap[f.category].revenue += f.amount;
        else categoryMap[f.category].cost += f.amount;
      }

      return {
        totalRevenue,
        totalCosts,
        netProfit: totalRevenue - totalCosts,
        quoteMargin: quoteRevenue - quoteCost,
        categoryBreakdown: Object.entries(categoryMap).map(([category, vals]) => ({
          category: category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          revenue: vals.revenue,
          cost: vals.cost,
        })),
      };
    },
  });

  const metrics = [
    { label: "Total Revenue", value: data?.totalRevenue, icon: TrendingUp, color: "from-emerald-500 to-emerald-600", textColor: "text-emerald-400" },
    { label: "Total Costs", value: data?.totalCosts, icon: TrendingDown, color: "from-red-500 to-red-600", textColor: "text-red-400" },
    { label: "Net Profit", value: data?.netProfit, icon: DollarSign, color: (data?.netProfit || 0) >= 0 ? "from-emerald-500 to-emerald-600" : "from-red-500 to-red-600", textColor: (data?.netProfit || 0) >= 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Quote Margin", value: data?.quoteMargin, icon: ArrowRight, color: "from-blue-500 to-blue-600", textColor: "text-blue-400" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Financial Overview</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Platform-wide revenue, costs, and margins</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[hsl(220,10%,45%)] uppercase tracking-wide">{m.label}</span>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center`}>
                <m.icon className="h-4 w-4 text-white" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 bg-[hsl(220,15%,15%)]" />
            ) : (
              <div className={`text-2xl font-bold ${m.textColor}`}>
                ${(m.value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Revenue vs Costs by Category</h2>
        <p className="text-xs text-[hsl(220,10%,40%)] mb-4">Breakdown across all shipment financial entries</p>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full bg-[hsl(220,15%,15%)]" />
        ) : (data?.categoryBreakdown || []).length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-[hsl(220,10%,35%)]">
            No financial data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.categoryBreakdown || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,15%)" />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: "hsl(220,10%,40%)" }} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220,10%,40%)" }} axisLine={false} />
              <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,18%)", borderRadius: 8, color: "#fff" }} />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="Costs" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFinancials;
