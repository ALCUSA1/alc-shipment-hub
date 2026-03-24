import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Ship, Plane, Truck } from "lucide-react";
import { startOfMonth, startOfYear, subMonths, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { motion } from "framer-motion";

const GRADIENT_COLORS = [
  { start: "hsl(215, 100%, 55%)", end: "hsl(215, 100%, 72%)" },
  { start: "hsl(152, 69%, 40%)", end: "hsl(152, 69%, 58%)" },
  { start: "hsl(25, 95%, 53%)", end: "hsl(25, 95%, 70%)" },
  { start: "hsl(280, 70%, 55%)", end: "hsl(280, 70%, 72%)" },
  { start: "hsl(45, 93%, 47%)", end: "hsl(45, 93%, 65%)" },
  { start: "hsl(340, 75%, 55%)", end: "hsl(340, 75%, 72%)" },
];

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
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  const kpiItems = [
    { label: "This Month", value: thisMonth, icon: DollarSign, gradient: "from-accent/10 to-accent/5", ring: "ring-accent/20", iconBg: "bg-accent/10", iconColor: "text-accent" },
    { label: "Year to Date", value: ytd, icon: TrendingUp, gradient: "from-emerald-500/10 to-emerald-500/5", ring: "ring-emerald-500/20", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    ...byType.slice(0, 2).map((t, i) => ({
      label: `${t.name} Spend`, value: t.value,
      icon: typeIcons[t.name] || DollarSign,
      gradient: i === 0 ? "from-blue-500/10 to-blue-500/5" : "from-purple-500/10 to-purple-500/5",
      ring: i === 0 ? "ring-blue-500/20" : "ring-purple-500/20",
      iconBg: i === 0 ? "bg-blue-500/10" : "bg-purple-500/10",
      iconColor: i === 0 ? "text-blue-500" : "text-purple-500",
    })),
  ];

  const maxSpend = Math.max(...trendData.map(d => d.spend), 1);

  return (
    <div className="space-y-6 mb-6">
      {/* KPI Row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className={`ring-1 ${item.ring} bg-gradient-to-br ${item.gradient} h-full overflow-hidden relative group hover:shadow-md transition-shadow`}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br from-white/5 to-transparent -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{item.label}</CardTitle>
                <div className={`h-8 w-8 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums text-foreground">${item.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Spend Trend — Premium gradient bars */}
      <Card className="overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] via-transparent to-emerald-500/[0.02] pointer-events-none" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
            Spend Trend
          </CardTitle>
          <CardDescription>Monthly spending — last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData} margin={{ left: -10, right: 8, top: 8, bottom: 4 }}>
              <defs>
                {trendData.map((_, i) => (
                  <linearGradient key={`spendGrad-${i}`} id={`spendGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                  </linearGradient>
                ))}
                <filter id="barGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 30px -12px hsl(var(--accent) / 0.2)" }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 2 }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Spend"]}
                cursor={{ fill: "hsl(var(--accent) / 0.06)", radius: 6 }}
              />
              <Bar dataKey="spend" radius={[6, 6, 0, 0]} barSize={36} animationDuration={800}>
                {trendData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={`url(#spendGrad-${i})`}
                    opacity={0.4 + (entry.spend / maxSpend) * 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
