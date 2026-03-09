import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Ship, Clock, DollarSign, CheckCircle2, AlertTriangle, Plane } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Area, AreaChart } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(217,95%,58%)", "hsl(160,60%,45%)", "hsl(45,93%,47%)", "hsl(0,84%,60%)", "hsl(270,60%,55%)", "hsl(190,70%,50%)"];

const Analytics = () => {
  const { user } = useAuth();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["analytics-shipments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, status, mode, origin_port, destination_port, etd, eta, created_at, shipment_ref, vessel, airline")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["analytics-quotes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, status, amount, carrier, carrier_cost, customer_price, created_at")
        .eq("user_id", user!.id)
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["analytics-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, currency, status, created_at")
        .eq("user_id", user!.id)
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // ── KPIs ──
  const totalShipments = shipments.length;
  const activeShipments = shipments.filter(s => !["delivered", "completed", "cancelled"].includes(s.status)).length;
  const deliveredShipments = shipments.filter(s => s.status === "delivered" || s.status === "completed").length;
  const onTimeRate = deliveredShipments > 0 ? Math.round((deliveredShipments / Math.max(totalShipments, 1)) * 100) : 0;
  const totalRevenue = quotes.filter(q => q.status === "accepted").reduce((sum, q) => sum + (q.customer_price || q.amount || 0), 0);
  const totalCost = quotes.filter(q => q.status === "accepted").reduce((sum, q) => sum + (q.carrier_cost || 0), 0);
  const totalMargin = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : "0";

  // ── Monthly Volume Chart ──
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const count = shipments.filter(s => {
      const created = new Date(s.created_at);
      return created >= start && created <= end;
    }).length;
    return { month: format(d, "MMM"), shipments: count };
  });

  // ── Mode Distribution ──
  const oceanCount = shipments.filter(s => s.mode !== "air").length;
  const airCount = shipments.filter(s => s.mode === "air").length;
  const modeData = [
    { name: "Ocean", value: oceanCount },
    { name: "Air", value: airCount },
  ].filter(d => d.value > 0);

  // ── Status Distribution ──
  const statusCounts: Record<string, number> = {};
  shipments.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  // ── Carrier Performance ──
  const carrierCounts: Record<string, number> = {};
  quotes.filter(q => q.carrier && q.status === "accepted").forEach(q => {
    carrierCounts[q.carrier!] = (carrierCounts[q.carrier!] || 0) + 1;
  });
  const carrierData = Object.entries(carrierCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, bookings]) => ({ name, bookings }));

  // ── Revenue Trend ──
  const revenueTrend = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const monthQuotes = quotes.filter(q => {
      const created = new Date(q.created_at);
      return created >= start && created <= end && q.status === "accepted";
    });
    const revenue = monthQuotes.reduce((sum, q) => sum + (q.customer_price || q.amount || 0), 0);
    const cost = monthQuotes.reduce((sum, q) => sum + (q.carrier_cost || 0), 0);
    return { month: format(d, "MMM"), revenue: Math.round(revenue), cost: Math.round(cost), margin: Math.round(revenue - cost) };
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent" />
          Analytics & Reporting
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Business intelligence across your shipment operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard icon={Ship} label="Total Shipments" value={totalShipments} sub={`${activeShipments} active`} color="text-accent" />
        <KPICard icon={CheckCircle2} label="On-Time Rate" value={`${onTimeRate}%`} sub={`${deliveredShipments} delivered`} color="text-emerald-500" />
        <KPICard icon={DollarSign} label="Total Revenue" value={`$${(totalRevenue / 1000).toFixed(1)}k`} sub={`${marginPct}% margin`} color="text-accent" />
        <KPICard icon={TrendingUp} label="Net Margin" value={`$${(totalMargin / 1000).toFixed(1)}k`} sub={`${quotes.filter(q => q.status === "accepted").length} bookings`} color="text-emerald-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Shipment Volume */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Shipment Volume (6 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={last6Months}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="shipments" fill="hsl(217,95%,58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue & Margin Trend */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Revenue & Margin Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Area type="monotone" dataKey="revenue" fill="hsl(217,95%,58%)" fillOpacity={0.15} stroke="hsl(217,95%,58%)" strokeWidth={2} />
                <Area type="monotone" dataKey="margin" fill="hsl(160,60%,45%)" fillOpacity={0.15} stroke="hsl(160,60%,45%)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Mode Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Mode Split</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            {modeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={modeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {modeData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-10">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(217,95%,58%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-10">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Top Carriers */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Top Carriers</CardTitle></CardHeader>
          <CardContent>
            {carrierData.length > 0 ? (
              <div className="space-y-3">
                {carrierData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs font-medium text-foreground truncate max-w-[140px]">{c.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{c.bookings} bookings</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-10">No carrier data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Routes */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Top Trade Lanes</CardTitle></CardHeader>
        <CardContent>
          {(() => {
            const routeCounts: Record<string, number> = {};
            shipments.forEach(s => {
              if (s.origin_port && s.destination_port) {
                const key = `${s.origin_port} → ${s.destination_port}`;
                routeCounts[key] = (routeCounts[key] || 0) + 1;
              }
            });
            const topRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
            return topRoutes.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topRoutes.map(([name, value]) => ({ name, shipments: value }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={180} />
                  <Tooltip />
                  <Bar dataKey="shipments" fill="hsl(160,60%,45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">No route data yet</p>
            );
          })()}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

function KPICard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Analytics;
