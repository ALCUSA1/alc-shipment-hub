import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyRole } from "@/hooks/useCompanyRole";
import { canSeeDashboardSection, hasCapability } from "@/lib/company-permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, subDays, format } from "date-fns";
import {
  Package, DollarSign, Clock, ArrowRight, Plus, Ship, Plane,
  CheckCircle2, AlertTriangle, FileText, Zap, Truck, Activity,
  TrendingUp, ArrowUpRight, BarChart3, Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SpendingSummary } from "@/components/dashboard/SpendingSummary";
import { GlassDonut, GlassAreaChart, GlassBarChart, CHART_COLORS, PALETTE } from "@/components/charts/ModernCharts";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_pricing: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  quote_ready: "bg-accent/10 text-accent",
  awaiting_approval: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  booked: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  in_transit: "bg-accent/10 text-accent",
  delivered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabel: Record<string, string> = {
  draft: "Draft", pending_pricing: "Pricing", quote_ready: "Quote Ready",
  awaiting_approval: "Approval", booked: "Booked", in_transit: "In Transit",
  delivered: "Delivered", closed: "Closed", cancelled: "Cancelled",
};

interface ShipmentRow {
  id: string; shipment_ref: string; origin_port: string | null; destination_port: string | null;
  status: string; mode: string | null; created_at: string; updated_at: string;
  etd: string | null; eta: string | null; companies: { company_name: string } | null;
}

const PIPELINE_STAGES = [
  { key: "pendingPricing", label: "Pending Pricing", fill: CHART_COLORS.amber },
  { key: "quoteReady", label: "Quote Ready", fill: CHART_COLORS.blue },
  { key: "awaitingApproval", label: "Awaiting Approval", fill: CHART_COLORS.orange },
  { key: "booked", label: "Booked", fill: CHART_COLORS.indigo },
  { key: "inTransit", label: "In Transit", fill: CHART_COLORS.cyan },
  { key: "delivered", label: "Delivered", fill: CHART_COLORS.emerald },
] as const;

const Dashboard = () => {
  const { user } = useAuth();
  const { role: companyRole } = useCompanyRole();
  const canCreateShipment = hasCapability(companyRole, "create_shipment");
  const showFinancials = canSeeDashboardSection(companyRole, "financials");
  const showAlerts = canSeeDashboardSection(companyRole, "alerts");
  const showCta = canSeeDashboardSection(companyRole, "cta");
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ active: 0, pendingPricing: 0, quoteReady: 0, awaitingApproval: 0, booked: 0, inTransit: 0, delivered: 0, delayed: 0, missingDocs: 0 });
  const [recentShipments, setRecentShipments] = useState<ShipmentRow[]>([]);
  const [allShipments, setAllShipments] = useState<{ created_at: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const [activeRes, pendingRes, quoteRes, approvalRes, bookedRes, transitRes, deliveredRes, recentRes, docsRes, trendRes] = await Promise.all([
        supabase.from("shipments").select("id", { count: "exact" }).in("status", ["booked", "in_transit"]),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "pending_pricing"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "quote_ready"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "awaiting_approval"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "booked"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "in_transit"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "delivered"),
        supabase.from("shipments").select("id, shipment_ref, origin_port, destination_port, status, mode, created_at, updated_at, etd, eta, companies!shipments_company_id_fkey(company_name)").order("updated_at", { ascending: false }).limit(8),
        supabase.from("documents").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("shipments").select("created_at").gte("created_at", thirtyDaysAgo),
      ]);
      const today = new Date().toISOString().split("T")[0];
      const { count: delayed } = await supabase.from("shipments").select("id", { count: "exact" }).lt("eta", today).in("status", ["in_transit"]);
      setCounts({
        active: activeRes.count ?? 0, pendingPricing: pendingRes.count ?? 0, quoteReady: quoteRes.count ?? 0,
        awaitingApproval: approvalRes.count ?? 0, booked: bookedRes.count ?? 0, inTransit: transitRes.count ?? 0,
        delivered: deliveredRes.count ?? 0, delayed: delayed ?? 0, missingDocs: docsRes.count ?? 0,
      });
      setRecentShipments((recentRes.data as ShipmentRow[]) ?? []);
      setAllShipments(trendRes.data ?? []);
      setLoading(false);
    };
    void fetchData();
  }, [user]);

  const isEmpty = !loading && recentShipments.length === 0 && counts.active === 0;

  const pipelineData = useMemo(() =>
    PIPELINE_STAGES.map(s => ({
      name: s.label,
      value: counts[s.key as keyof typeof counts] as number,
      fill: s.fill,
    })), [counts]);

  const trendData = useMemo(() => {
    // Group by week (7 buckets) for a cleaner chart
    const weeks: { date: string; count: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekEnd = subDays(new Date(), w * 7);
      const weekStart = subDays(weekEnd, 6);
      const label = `${format(weekStart, "MMM d")} – ${format(weekEnd, "d")}`;
      const count = (allShipments || []).filter(s => {
        const d = new Date(s.created_at);
        return d >= weekStart && d <= weekEnd;
      }).length;
      weeks.push({ date: label, count });
    }
    return weeks;
  }, [allShipments]);

  const onTimeRate = counts.delivered > 0
    ? Math.round((counts.delivered / Math.max(counts.delivered + counts.delayed, 1)) * 100)
    : null;

  const totalShipments = counts.active + counts.delivered + counts.pendingPricing + counts.quoteReady + counts.awaitingApproval;

  const topLanes = useMemo(() => {
    const laneCounts: Record<string, number> = {};
    recentShipments.forEach(s => {
      const lane = `${s.origin_port || "?"} → ${s.destination_port || "?"}`;
      laneCounts[lane] = (laneCounts[lane] || 0) + 1;
    });
    return Object.entries(laneCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [recentShipments]);

  const hasAlerts = counts.delayed > 0 || counts.missingDocs > 0 || counts.pendingPricing > 0 || counts.awaitingApproval > 0;

  const alertItems = [
    counts.delayed > 0 && { href: "/dashboard/shipments?status=delayed", icon: AlertTriangle, label: `${counts.delayed} shipment${counts.delayed > 1 ? "s" : ""} delayed`, color: "destructive" as const },
    counts.pendingPricing > 0 && { href: "/dashboard/quotes", icon: DollarSign, label: `${counts.pendingPricing} need pricing`, color: "amber" as const },
    counts.awaitingApproval > 0 && { href: "/dashboard/shipments?status=awaiting_approval", icon: Clock, label: `${counts.awaitingApproval} awaiting approval`, color: "orange" as const },
    counts.missingDocs > 0 && { href: "/dashboard/shipments", icon: FileText, label: `${counts.missingDocs} missing documents`, color: "orange" as const },
  ].filter(Boolean) as { href: string; icon: any; label: string; color: "destructive" | "amber" | "orange" }[];

  // KPI cards config
  const kpis = [
    { label: "Total Shipments", value: totalShipments, icon: Globe, gradient: "from-accent/20 to-accent/5", iconColor: "text-accent", border: "border-accent/10" },
    { label: "In Transit", value: counts.inTransit, icon: Truck, gradient: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-500", border: "border-blue-500/10" },
    { label: "Delivered", value: counts.delivered, icon: CheckCircle2, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500", border: "border-emerald-500/10" },
    { label: "On-Time Rate", value: onTimeRate !== null ? `${onTimeRate}%` : "—", icon: TrendingUp, gradient: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-500", border: "border-violet-500/10" },
  ];

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  return (
    <DashboardLayout>
      {/* ═══ HERO HEADER ═══ */}
      <motion.div
        className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent/80 p-8 text-primary-foreground"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-y-1/2" />
        <div className="absolute top-4 right-8 w-24 h-24 border border-white/10 rounded-2xl rotate-12" />
        <div className="absolute bottom-4 right-32 w-16 h-16 border border-white/5 rounded-xl -rotate-6" />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <motion.p
              className="text-sm font-medium text-white/60 mb-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </motion.p>
            <motion.h1
              className="text-3xl font-extrabold tracking-tight"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              Command Center
            </motion.h1>
            <motion.p
              className="text-sm text-white/50 mt-1 max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Real-time visibility across your entire logistics operation
            </motion.p>
          </div>
          {showCta && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-xl shadow-black/20 font-semibold gap-2 rounded-xl"
                asChild
              >
                <Link to="/dashboard/shipments/new">
                  <Plus className="h-4 w-4" />New Shipment
                </Link>
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ═══ ONBOARDING (empty state) ═══ */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mb-8"
          >
            <Card className="border-accent/20 bg-gradient-to-br from-accent/5 via-transparent to-accent/3 overflow-hidden relative">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
              <CardContent className="pt-8 pb-8 relative z-10">
                <div className="flex items-start gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20">
                    <Zap className="h-7 w-7 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-2">Welcome to ALC Shipper Portal</h3>
                    <p className="text-sm text-muted-foreground mb-5 max-w-lg">
                      Your logistics command center is ready. Start by creating your first shipment to unlock the full platform experience.
                    </p>
                    <Button variant="electric" size="lg" className="rounded-xl gap-2 font-semibold" asChild>
                      <Link to="/dashboard/shipments/new"><Plus className="h-4 w-4" />Create Your First Shipment</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ KPI CARDS ═══ */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={fadeUp}>
            <Card className={`relative overflow-hidden border ${kpi.border} hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 group`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
              <CardContent className="p-5 relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center border border-border/50`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-accent transition-colors" />
                </div>
                {loading ? <Skeleton className="h-9 w-16 mb-1" /> : (
                  <p className="text-3xl font-extrabold tabular-nums text-foreground tracking-tight">{kpi.value}</p>
                )}
                <p className="text-xs font-medium text-muted-foreground mt-1">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ MAIN GRID ═══ */}
      {!loading && (
        <motion.div
          className="grid lg:grid-cols-12 gap-6 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* ── LEFT: Charts side by side ── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Shipment Volume + Financial Overview — side by side */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Shipment Volume */}
              <Card className="border-border/60">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
                        <BarChart3 className="h-4.5 w-4.5 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">Shipment Volume</CardTitle>
                        <p className="text-[11px] text-muted-foreground">Last 4 weeks</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-semibold bg-accent/10 text-accent border-0">
                      {allShipments.length} total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-2">
                  <GlassAreaChart
                    data={trendData}
                    dataKey="count"
                    xKey="date"
                    color={CHART_COLORS.blue}
                    height={200}
                    tooltipFormatter={(v) => [`${v}`, "Shipments"]}
                  />
                </CardContent>
              </Card>

              {/* Financial Overview — now inline, not at the bottom */}
              {!isEmpty && showFinancials && <SpendingSummary />}
            </div>

            {/* Alerts + Top Lanes Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Alerts */}
              {hasAlerts && showAlerts ? (
                <Card className="border-border/60 overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-destructive" />
                  <CardHeader className="pb-2 pt-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Needs Attention
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alertItems.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/80 border border-transparent hover:border-border transition-all group"
                        >
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            item.color === "destructive" ? "bg-destructive/10" : item.color === "amber" ? "bg-amber-500/10" : "bg-orange-500/10"
                          }`}>
                            <item.icon className={`h-4 w-4 ${
                              item.color === "destructive" ? "text-destructive" : item.color === "amber" ? "text-amber-500" : "text-orange-500"
                            }`} />
                          </div>
                          <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/60 flex items-center justify-center">
                  <CardContent className="text-center py-12">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">All Clear</p>
                    <p className="text-xs text-muted-foreground mt-1">No pending actions</p>
                  </CardContent>
                </Card>
              )}

              {/* Top Lanes */}
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-accent" />
                    Top Trade Lanes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topLanes.length > 0 ? (
                    <div className="space-y-3">
                      {topLanes.map(([lane, count], i) => {
                        const maxCount = topLanes[0][1];
                        const pct = Math.round((count / maxCount) * 100);
                        return (
                          <motion.div
                            key={lane}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-foreground">{lane}</span>
                              <span className="text-xs font-bold tabular-nums text-accent">{count}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[(i + 1) % PALETTE.length]})` }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-8">No lane data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── RIGHT: Pipeline + Activity ── */}
          <div className="lg:col-span-4 space-y-6">
            {/* Pipeline Donut */}
            <Card className="border-border/60 overflow-hidden">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-accent" />
                    Pipeline
                  </CardTitle>
                  <span className="text-2xl font-extrabold tabular-nums text-foreground">{totalShipments}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                <GlassDonut
                  data={pipelineData}
                  height={180}
                  innerRadius={52}
                  outerRadius={80}
                  centerValue={counts.active}
                  centerLabel="active"
                />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4">
                  {pipelineData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: item.fill }} />
                      <span className="text-[10px] text-muted-foreground truncate flex-1">{item.name}</span>
                      <span className="text-[10px] font-bold tabular-nums text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-accent" />
                    Recent Shipments
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-accent h-7 px-2" asChild>
                    <Link to="/dashboard/shipments">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5">
                  {recentShipments.slice(0, 6).map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                    >
                      <Link
                        to={`/dashboard/shipments/${s.id}`}
                        className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-muted/50 transition-all group"
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          s.status === "in_transit" ? "bg-accent/10" :
                          s.status === "delivered" ? "bg-emerald-500/10" :
                          s.status === "booked" ? "bg-blue-500/10" :
                          "bg-muted"
                        }`}>
                          {s.mode === "air"
                            ? <Plane className={`h-3.5 w-3.5 ${s.status === "in_transit" ? "text-accent" : "text-muted-foreground"}`} />
                            : <Ship className={`h-3.5 w-3.5 ${s.status === "in_transit" ? "text-accent" : "text-muted-foreground"}`} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{s.shipment_ref}</span>
                            <Badge variant="secondary" className={`text-[8px] px-1.5 py-0 h-4 font-semibold border-0 ${statusColor[s.status] || "bg-muted text-muted-foreground"}`}>
                              {statusLabel[s.status] || s.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.origin_port || "—"} → {s.destination_port || "—"}</p>
                        </div>
                        <span className="text-[9px] text-muted-foreground/60 shrink-0 hidden sm:block">
                          {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                  {recentShipments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-10">No shipments yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}




      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="grid lg:grid-cols-12 gap-6">
            <Skeleton className="lg:col-span-8 h-80 rounded-xl" />
            <Skeleton className="lg:col-span-4 h-80 rounded-xl" />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
