import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Ship, Plane, Truck } from "lucide-react";
import { startOfMonth, startOfYear, subMonths, format } from "date-fns";
import { motion } from "framer-motion";
import { GlassAreaChart, CHART_COLORS } from "@/components/charts/ModernCharts";

export function SpendingSummary() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["customer-spending", user?.id],
    queryFn: async () => {
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
      <Card className="rounded-xl border-border/60">
        <CardContent className="p-6">
          <Skeleton className="h-52 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const inlineKpis = [
    { label: "This Month", value: thisMonth, icon: DollarSign, color: "text-accent", bg: "bg-accent/10" },
    { label: "Year to Date", value: ytd, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    ...byType.slice(0, 2).map((t, i) => ({
      label: t.name,
      value: t.value,
      icon: typeIcons[t.name] || DollarSign,
      color: i === 0 ? "text-blue-500" : "text-violet-500",
      bg: i === 0 ? "bg-blue-500/10" : "bg-violet-500/10",
    })),
  ];

  return (
    <Card className="overflow-hidden border-border/60 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] via-transparent to-emerald-500/[0.02] pointer-events-none" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
            <DollarSign className="h-4.5 w-4.5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Financial Overview</CardTitle>
            <CardDescription>Spending breakdown & 6-month trend</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Inline KPIs — compact row inside the card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {inlineKpis.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50"
            >
              <div className={`h-8 w-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold tabular-nums text-foreground leading-tight">${item.value.toLocaleString()}</p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">{item.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Spend Trend Chart */}
        <GlassBarChart
          data={trendData}
          dataKey="spend"
          xKey="month"
          color="hsl(var(--accent))"
          height={180}
          yFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          tooltipFormatter={(v) => [`$${v.toLocaleString()}`, "Spend"]}
          barSize={36}
        />
      </CardContent>
    </Card>
  );
}
