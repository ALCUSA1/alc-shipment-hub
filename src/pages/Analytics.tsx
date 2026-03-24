import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Ship, Clock, DollarSign, CheckCircle2, Plane, Activity, Anchor } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Area, AreaChart, RadialBarChart, RadialBar, Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

/* ── Shared tooltip style ─────────────────────── */
const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 12px 40px -12px hsl(var(--accent) / 0.18)",
  padding: "10px 14px",
};

/* ── KPI Card ─────────────────────────────────── */
function KPICard({ icon: Icon, label, value, sub, gradient }: {
  icon: any; label: string; value: string | number; sub: string; gradient: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="overflow-hidden relative group hover:shadow-lg transition-shadow duration-300">
        <div className={`absolute inset-0 opacity-[0.06] ${gradient} pointer-events-none`} />
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center shadow-sm`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
              <p className="text-[11px] text-muted-foreground">{sub}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

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

  // ── KPIs ──
  const totalShipments = shipments.length;
  const activeShipments = shipments.filter(s => !["delivered", "completed", "cancelled"].includes(s.status)).length;
  const deliveredShipments = shipments.filter(s => s.status === "delivered" || s.status === "completed").length;
  const onTimeRate = deliveredShipments > 0 ? Math.round((deliveredShipments / Math.max(totalShipments, 1)) * 100) : 0;
  const totalRevenue = quotes.filter(q => q.status === "accepted").reduce((sum, q) => sum + (q.customer_price || q.amount || 0), 0);
  const totalCost = quotes.filter(q => q.status === "accepted").reduce((sum, q) => sum + (q.carrier_cost || 0), 0);
  const totalMargin = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : "0";

  // ── Monthly Volume ──
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
  const maxVolume = Math.max(...last6Months.map(d => d.shipments), 1);

  // ── Mode Distribution ──
  const oceanCount = shipments.filter(s => s.mode !== "air").length;
  const airCount = shipments.filter(s => s.mode === "air").length;
  const modeData = [
    { name: "Ocean", value: oceanCount, fill: "hsl(215, 100%, 55%)" },
    { name: "Air", value: airCount, fill: "hsl(280, 65%, 55%)" },
  ].filter(d => d.value > 0);

  // ── Status ──
  const statusOrder = ["pending", "draft", "booked", "in_transit", "arrived", "delivered"];
  const statusColors: Record<string, string> = {
    pending: "hsl(45, 93%, 47%)", draft: "hsl(var(--muted-foreground))", booked: "hsl(215, 100%, 55%)",
    in_transit: "hsl(152, 69%, 40%)", arrived: "hsl(190, 70%, 50%)", delivered: "hsl(152, 69%, 31%)",
  };
  const statusCounts: Record<string, number> = {};
  shipments.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts)
    .sort((a, b) => (statusOrder.indexOf(a[0]) ?? 99) - (statusOrder.indexOf(b[0]) ?? 99))
    .map(([name, value]) => ({
      name: name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value,
      fill: statusColors[name] || "hsl(var(--muted-foreground))",
    }));

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

  // ── Carrier Performance ──
  const carrierCounts: Record<string, number> = {};
  quotes.filter(q => q.carrier && q.status === "accepted").forEach(q => {
    carrierCounts[q.carrier!] = (carrierCounts[q.carrier!] || 0) + 1;
  });
  const carrierData = Object.entries(carrierCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, bookings], i) => ({
      name: name.length > 14 ? name.slice(0, 12) + "…" : name,
      bookings,
      fill: ["hsl(215,100%,55%)", "hsl(152,69%,40%)", "hsl(25,95%,53%)", "hsl(280,65%,55%)", "hsl(45,93%,47%)"][i],
    }));

  // ── Top Routes ──
  const routeCounts: Record<string, number> = {};
  shipments.forEach(s => {
    if (s.origin_port && s.destination_port) {
      const key = `${s.origin_port} → ${s.destination_port}`;
      routeCounts[key] = (routeCounts[key] || 0) + 1;
    }
  });
  const topRoutes = Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, shipments: value }));

  // ── On-time gauge ──
  const gaugeData = [{ name: "On-Time", value: onTimeRate, fill: "hsl(152, 69%, 40%)" }];

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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <BarChart3 className="h-4.5 w-4.5 text-white" />
              </div>
              Analytics & Reporting
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Business intelligence across your shipment operations</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard icon={Ship} label="Total Shipments" value={totalShipments} sub={`${activeShipments} active`} gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
        <KPICard icon={CheckCircle2} label="On-Time Rate" value={`${onTimeRate}%`} sub={`${deliveredShipments} delivered`} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <KPICard icon={DollarSign} label="Total Revenue" value={`$${(totalRevenue / 1000).toFixed(1)}k`} sub={`${marginPct}% margin`} gradient="bg-gradient-to-br from-violet-500 to-violet-600" />
        <KPICard icon={TrendingUp} label="Net Margin" value={`$${(totalMargin / 1000).toFixed(1)}k`} sub={`${quotes.filter(q => q.status === "accepted").length} bookings`} gradient="bg-gradient-to-br from-amber-500 to-orange-500" />
      </div>

      {/* Row 1: Volume + Revenue */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Shipment Volume — Gradient Bars */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                Shipment Volume
              </CardTitle>
              <CardDescription>Monthly shipments over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={last6Months} margin={{ left: -10, right: 8, top: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(215, 100%, 55%)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(215, 100%, 72%)" stopOpacity={0.6} />
                    </linearGradient>
                    <filter id="volGlow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Shipments"]} cursor={{ fill: "hsl(var(--accent) / 0.06)", radius: 6 }} />
                  <Bar dataKey="shipments" fill="url(#volGrad)" radius={[8, 8, 3, 3]} maxBarSize={48}>
                    {last6Months.map((entry, i) => (
                      <Cell key={i} fillOpacity={0.5 + (entry.shipments / maxVolume) * 0.5} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue & Margin — Stacked Area */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                Revenue & Margin
              </CardTitle>
              <CardDescription>Financial performance trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueTrend} margin={{ left: -10, right: 8, top: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(215, 100%, 55%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(215, 100%, 55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mrgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(152, 69%, 40%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(152, 69%, 40%)" stopOpacity={0} />
                    </linearGradient>
                    <filter id="dotGlow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(215, 100%, 55%)" fill="url(#revGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "hsl(215,100%,55%)", stroke: "hsl(var(--background))", strokeWidth: 2, filter: "url(#dotGlow)" }} />
                  <Area type="monotone" dataKey="margin" name="Margin" stroke="hsl(152, 69%, 40%)" fill="url(#mrgGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "hsl(152,69%,40%)", stroke: "hsl(var(--background))", strokeWidth: 2, filter: "url(#dotGlow)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 2: Mode + Status + On-Time Gauge */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Mode Split — Donut */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Anchor className="h-4 w-4 text-violet-500" />
                </div>
                Mode Split
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {modeData.length > 0 ? (
                <div className="flex items-center gap-6 w-full">
                  <div className="w-[140px] h-[140px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          {modeData.map((entry, i) => (
                            <linearGradient key={`mg-${i}`} id={`modeGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                              <stop offset="100%" stopColor={entry.fill} stopOpacity={0.6} />
                            </linearGradient>
                          ))}
                        </defs>
                        <Pie data={modeData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none" animationDuration={800}>
                          {modeData.map((_, i) => <Cell key={i} fill={`url(#modeGrad-${i})`} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {modeData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-3 w-3 rounded-full" style={{ background: d.fill, boxShadow: `0 0 8px ${d.fill}50` }} />
                          <span className="text-sm text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="text-lg font-bold text-foreground tabular-nums">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-10">No data</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Breakdown — Horizontal Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <div className="space-y-3">
                  {statusData.map((item, i) => {
                    const maxVal = Math.max(...statusData.map(d => d.value), 1);
                    const pct = (item.value / maxVal) * 100;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">{item.name}</span>
                          <span className="text-xs font-bold text-foreground tabular-nums">{item.value}</span>
                        </div>
                        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${item.fill}, ${item.fill}90)`, boxShadow: `0 0 8px ${item.fill}30` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 * i, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">No data</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* On-Time Gauge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                On-Time Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="w-[160px] h-[160px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={gaugeData} barSize={14}>
                    <defs>
                      <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(152, 69%, 40%)" />
                        <stop offset="100%" stopColor="hsl(152, 69%, 55%)" />
                      </linearGradient>
                    </defs>
                    <RadialBar
                      dataKey="value"
                      cornerRadius={10}
                      fill="url(#gaugeGrad)"
                      background={{ fill: "hsl(var(--secondary))" }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">{onTimeRate}%</span>
                  <span className="text-[10px] text-muted-foreground">on-time</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {deliveredShipments} of {totalShipments} shipments delivered
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 3: Carriers + Trade Lanes */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Carriers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Ship className="h-4 w-4 text-blue-500" />
                </div>
                Top Carriers
              </CardTitle>
              <CardDescription>By accepted bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {carrierData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={carrierData} layout="vertical" margin={{ left: 0, right: 12 }}>
                    <defs>
                      {carrierData.map((c, i) => (
                        <linearGradient key={`cg-${i}`} id={`carrGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={c.fill} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={c.fill} stopOpacity={0.5} />
                        </linearGradient>
                      ))}
                    </defs>
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Bookings"]} cursor={{ fill: "hsl(var(--accent) / 0.04)" }} />
                    <Bar dataKey="bookings" radius={[0, 8, 8, 0]} maxBarSize={32}>
                      {carrierData.map((_, i) => <Cell key={i} fill={`url(#carrGrad-${i})`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">No carrier data</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Trade Lanes */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Plane className="h-4 w-4 text-emerald-500" />
                </div>
                Top Trade Lanes
              </CardTitle>
              <CardDescription>Most active routes</CardDescription>
            </CardHeader>
            <CardContent>
              {topRoutes.length > 0 ? (
                <div className="space-y-3">
                  {topRoutes.map((route, i) => {
                    const maxR = Math.max(...topRoutes.map(r => r.shipments), 1);
                    const pct = (route.shipments / maxR) * 100;
                    const color = ["hsl(152,69%,40%)", "hsl(215,100%,55%)", "hsl(25,95%,53%)", "hsl(280,65%,55%)", "hsl(45,93%,47%)", "hsl(190,70%,50%)"][i % 6];
                    return (
                      <div key={route.name} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground truncate max-w-[75%]">{route.name}</span>
                          <Badge variant="secondary" className="text-[10px] font-bold">{route.shipments}</Badge>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${color}, ${color}80)`, boxShadow: `0 0 6px ${color}25` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: 0.08 * i, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">No route data yet</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
