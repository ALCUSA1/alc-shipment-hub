import { AdminLayout } from "@/components/admin/AdminLayout";
import { FraudSignalsWidget } from "@/components/admin/FraudSignalsWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, DollarSign, FileText, Activity, TrendingUp } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { GlassAreaChart, GlassDonut, PALETTE, CHART_COLORS } from "@/components/charts/ModernCharts";


const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profiles, shipments, quotes, documents, companies] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("shipments").select("id, status, created_at", { count: "exact" }),
        supabase.from("quotes").select("id, status, customer_price, created_at", { count: "exact" }),
        supabase.from("documents").select("id", { count: "exact" }),
        supabase.from("companies").select("id", { count: "exact" }),
      ]);

      const allShipments = shipments.data || [];
      const allQuotes = quotes.data || [];

      const statusMap: Record<string, number> = {};
      for (const s of allShipments) statusMap[s.status] = (statusMap[s.status] || 0) + 1;

      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const start = startOfMonth(d).toISOString();
        const end = endOfMonth(d).toISOString();
        months.push({
          month: format(d, "MMM"),
          shipments: allShipments.filter(s => s.created_at >= start && s.created_at <= end).length,
          quotes: allQuotes.filter(q => q.created_at >= start && q.created_at <= end).length,
        });
      }

      const totalRevenue = allQuotes
        .filter((q: UnsafeAny) => q.status === "accepted" || q.status === "converted")
        .reduce((sum: number, q: UnsafeAny) => sum + (q.customer_price || 0), 0);

      return {
        userCount: profiles.count || 0,
        shipmentCount: shipments.count || 0,
        quoteCount: quotes.count || 0,
        documentCount: documents.count || 0,
        companyCount: companies.count || 0,
        totalRevenue,
        statusBreakdown: Object.entries(statusMap).map(([name, value], i) => ({
          name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          value,
          fill: PALETTE[i % PALETTE.length],
        })),
        monthlyTrend: months,
      };
    },
  });

  const metrics = [
    { label: "Total Users", value: stats?.userCount, icon: Users, color: "from-blue-500 to-blue-600" },
    { label: "Shipments", value: stats?.shipmentCount, icon: Package, color: "from-emerald-500 to-emerald-600" },
    { label: "Quotes", value: stats?.quoteCount, icon: FileText, color: "from-amber-500 to-amber-600" },
    { label: "Companies", value: stats?.companyCount, icon: Activity, color: "from-purple-500 to-purple-600" },
    { label: "Revenue", value: stats?.totalRevenue ? `$${stats.totalRevenue.toLocaleString()}` : "$0", icon: DollarSign, color: "from-green-500 to-green-600" },
    { label: "Documents", value: stats?.documentCount, icon: FileText, color: "from-indigo-500 to-indigo-600" },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor all platform activity, accounts, and risk signals.</p>
      </div>

      <div className="mb-6">
        <FraudSignalsWidget />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{m.label}</span>
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                <m.icon className="h-4 w-4 text-foreground" />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold text-foreground">{m.value}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Platform Activity</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Shipments and quotes — last 6 months</p>
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <GlassAreaChart
              data={stats?.monthlyTrend || []}
              dataKey="shipments"
              secondaryDataKey="quotes"
              color={CHART_COLORS.blue}
              secondaryColor={CHART_COLORS.amber}
              height={220}
            />
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">Shipment Status</h2>
          <p className="text-xs text-muted-foreground mb-4">Distribution across all users</p>
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <div className="flex flex-col items-center">
              <GlassDonut
                data={stats?.statusBreakdown || []}
                height={160}
                innerRadius={40}
                outerRadius={65}
              />
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                {(stats?.statusBreakdown || []).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="font-medium text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
