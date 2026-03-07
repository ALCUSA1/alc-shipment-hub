import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, DollarSign, FileText, Activity, TrendingUp } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const PIE_COLORS = ["hsl(217, 95%, 58%)", "hsl(45, 93%, 55%)", "hsl(160, 60%, 45%)", "hsl(200, 70%, 55%)", "hsl(0, 84%, 60%)", "hsl(215, 14%, 70%)"];

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

      // Status breakdown
      const statusMap: Record<string, number> = {};
      for (const s of allShipments) statusMap[s.status] = (statusMap[s.status] || 0) + 1;

      // Monthly trend
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

      // Total revenue
      const totalRevenue = allQuotes
        .filter((q: any) => q.status === "accepted" || q.status === "converted")
        .reduce((sum: number, q: any) => sum + (q.customer_price || 0), 0);

      return {
        userCount: profiles.count || 0,
        shipmentCount: shipments.count || 0,
        quoteCount: quotes.count || 0,
        documentCount: documents.count || 0,
        companyCount: companies.count || 0,
        totalRevenue,
        statusBreakdown: Object.entries(statusMap).map(([name, value]) => ({
          name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          value,
        })),
        monthlyTrend: months,
      };
    },
  });

  const metrics = [
    { label: "Total Users", value: stats?.userCount, icon: Users },
    { label: "Total Shipments", value: stats?.shipmentCount, icon: Package },
    { label: "Total Quotes", value: stats?.quoteCount, icon: FileText },
    { label: "Companies", value: stats?.companyCount, icon: Activity },
    { label: "Total Revenue", value: stats?.totalRevenue ? `$${stats.totalRevenue.toLocaleString()}` : "$0", icon: DollarSign },
    { label: "Documents", value: stats?.documentCount, icon: FileText },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">Monitor all platform activity and performance</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{m.label}</CardTitle>
              <m.icon className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-foreground">{m.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <CardTitle className="text-base">Platform Activity</CardTitle>
            </div>
            <CardDescription>Shipments and quotes across all users — last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px] w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats?.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 14%, 45%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(215, 14%, 45%)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="shipments" name="Shipments" stroke="hsl(217, 95%, 58%)" fill="hsl(217, 95%, 58%)" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="quotes" name="Quotes" stroke="hsl(45, 93%, 55%)" fill="hsl(45, 93%, 55%)" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipment Status</CardTitle>
            <CardDescription>Distribution across all users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[220px] w-full" /> : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={stats?.statusBreakdown || []} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {(stats?.statusBreakdown || []).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                  {(stats?.statusBreakdown || []).map((s, i) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="font-medium text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
