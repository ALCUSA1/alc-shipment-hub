import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Ship, Plane, Truck } from "lucide-react";
import { startOfMonth, startOfYear, subMonths, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function SpendingSummary() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-spending", user?.id],
    queryFn: async () => {
      // Fetch accepted/converted quotes with amounts
      const { data: quotes, error } = await supabase
        .from("quotes")
        .select("id, amount, currency, shipment_id, created_at, shipments!inner(shipment_type, mode, created_at)")
        .in("status", ["accepted", "converted"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return quotes || [];
    },
    enabled: !!user,
  });

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const yearStart = startOfYear(now).toISOString();

  const thisMonth = useMemo(() =>
    (data || []).filter(q => q.created_at >= monthStart).reduce((s, q) => s + (q.amount || 0), 0),
    [data, monthStart]);

  const ytd = useMemo(() =>
    (data || []).filter(q => q.created_at >= yearStart).reduce((s, q) => s + (q.amount || 0), 0),
    [data, yearStart]);

  // Spend by type
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of data || []) {
      const type = (q as any).shipments?.shipment_type || (q as any).shipments?.mode || "Other";
      const label = type.toUpperCase().includes("FCL") ? "FCL" :
        type.toUpperCase().includes("LCL") ? "LCL" :
        type.toLowerCase() === "air" ? "Air" :
        type.toLowerCase().includes("truck") ? "Trucking" : "Other";
      map[label] = (map[label] || 0) + (q.amount || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Spend trend (last 6 months)
  const trendData = useMemo(() => {
    const months: { month: string; spend: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = startOfMonth(d).toISOString();
      const end = startOfMonth(subMonths(d, -1)).toISOString();
      const spend = (data || [])
        .filter(q => q.created_at >= start && q.created_at < end)
        .reduce((s, q) => s + (q.amount || 0), 0);
      months.push({ month: format(d, "MMM"), spend });
    }
    return months;
  }, [data]);

  const typeIcons: Record<string, React.ElementType> = { FCL: Ship, LCL: Ship, Air: Plane, Trucking: Truck };

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* KPI Row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="ring-1 ring-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">This Month</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-foreground">${thisMonth.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="ring-1 ring-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Year to Date</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-foreground">${ytd.toLocaleString()}</div>
          </CardContent>
        </Card>

        {byType.slice(0, 2).map(t => {
          const Icon = typeIcons[t.name] || DollarSign;
          return (
            <Card key={t.name} className="ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t.name} Spend</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-foreground">${t.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Spend Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" />
            Spend Trend
          </CardTitle>
          <CardDescription>Monthly spending — last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Spend"]}
              />
              <Bar dataKey="spend" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
