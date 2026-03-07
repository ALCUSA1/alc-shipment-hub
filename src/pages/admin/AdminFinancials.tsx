import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
      const payments = paymentsRes.data || [];

      const totalRevenue = financials.filter(f => f.entry_type === "revenue").reduce((s, f) => s + f.amount, 0);
      const totalCosts = financials.filter(f => f.entry_type === "cost").reduce((s, f) => s + f.amount, 0);

      const quoteRevenue = quotes.reduce((s, q) => s + (q.customer_price || 0), 0);
      const quoteCost = quotes.reduce((s, q) => s + (q.carrier_cost || 0), 0);
      const quoteMargin = quoteRevenue - quoteCost;

      const paymentTotal = payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0);

      // Category breakdown
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
        quoteRevenue,
        quoteCost,
        quoteMargin,
        paymentTotal,
        categoryBreakdown: Object.entries(categoryMap).map(([category, vals]) => ({
          category: category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          revenue: vals.revenue,
          cost: vals.cost,
        })),
      };
    },
  });

  const metrics = [
    { label: "Total Revenue", value: data?.totalRevenue, icon: TrendingUp, color: "text-green-600" },
    { label: "Total Costs", value: data?.totalCosts, icon: TrendingDown, color: "text-destructive" },
    { label: "Net Profit", value: data?.netProfit, icon: DollarSign, color: (data?.netProfit || 0) >= 0 ? "text-green-600" : "text-destructive" },
    { label: "Quote Margin", value: data?.quoteMargin, icon: ArrowRight, color: "text-accent" },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-bold text-foreground">Financial Overview</h1>
        </div>
        <p className="text-sm text-muted-foreground">Platform-wide revenue, costs, and margins across all shipments</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{m.label}</CardTitle>
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className={`text-2xl font-bold ${m.color}`}>
                  ${(m.value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue vs Costs by Category</CardTitle>
          <CardDescription>Breakdown across all shipment financial entries</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[280px] w-full" /> : (
            (data?.categoryBreakdown || []).length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                No financial data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.categoryBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="category" tick={{ fontSize: 12, fill: "hsl(215, 14%, 45%)" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(215, 14%, 45%)" }} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="Costs" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminFinancials;
