import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { SpendingSummary } from "@/components/dashboard/SpendingSummary";
import { GlassDonut, GlassAreaChart, AnimatedProgressBar, CHART_COLORS, PALETTE } from "@/components/charts/ModernCharts";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_pricing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  quote_ready: "bg-accent/10 text-accent",
  awaiting_approval: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  booked: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_transit: "bg-accent/10 text-accent",
  arrived: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabel: Record<string, string> = {
  draft: "Draft", pending_pricing: "Pending Pricing", quote_ready: "Quote Ready",
  awaiting_approval: "Awaiting Approval", booked: "Booked", in_transit: "In Transit",
  arrived: "Arrived", delivered: "Delivered", closed: "Closed", cancelled: "Cancelled",
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
  { key: "inTransit", label: "In Transit", fill: CHART_COLORS.emerald },
  { key: "delivered", label: "Delivered", fill: "hsl(152, 69%, 31%)" },
] as const;

const Dashboard = () => {
  const { user } = useAuth();
  const { role: companyRole } = useCompanyRole();
  const canCreateShipment = hasCapability(companyRole, "create_shipment");
  const showFinancials = canSeeDashboardSection(companyRole, "financials");
  const showPipeline = canSeeDashboardSection(companyRole, "pipeline");
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
        supabase.from("shipments").select("id", { count: "exact" }).in("status", ["booked", "in_transit", "arrived"]),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "pending_pricing"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "quote_ready"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "awaiting_approval"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "booked"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "in_transit"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "delivered"),
        supabase.from("shipments").select("id, shipment_ref, origin_port, destination_port, status, mode, created_at, updated_at, etd, eta, companies!shipments_company_id_fkey(company_name)").order("updated_at", { ascending: false }).limit(6),
        supabase.from("documents").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("shipments").select("created_at").gte("created_at", thirtyDaysAgo),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const { count: delayed } = await supabase.from("shipments").select("id", { count: "exact" }).lt("eta", today).in("status", ["in_transit", "arrived"]);

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
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      buckets[d] = 0;
    }
    for (const s of allShipments) {
      const d = format(new Date(s.created_at), "MMM d");
      if (d in buckets) buckets[d]++;
    }
    return Object.entries(buckets).map(([date, count]) => ({ date, count }));
  }, [allShipments]);

  const hasAlerts = counts.delayed > 0 || counts.missingDocs > 0 || counts.pendingPricing > 0 || counts.awaitingApproval > 0;

  const alertItems = [
    counts.delayed > 0 && { href: "/dashboard/shipments?status=delayed", icon: AlertTriangle, label: `${counts.delayed} delayed`, sub: "Requires attention", color: "destructive" as const },
    counts.pendingPricing > 0 && { href: "/dashboard/quotes", icon: DollarSign, label: `${counts.pendingPricing} pricing needed`, sub: "Review quotes", color: "yellow" as const },
    counts.awaitingApproval > 0 && { href: "/dashboard/shipments?status=awaiting_approval", icon: Clock, label: `${counts.awaitingApproval} approval pending`, sub: "Needs decision", color: "orange" as const },
    counts.missingDocs > 0 && { href: "/dashboard/shipments", icon: FileText, label: `${counts.missingDocs} missing docs`, sub: "Upload required", color: "orange" as const },
  ].filter(Boolean) as { href: string; icon: any; label: string; sub: string; color: "destructive" | "yellow" | "orange" }[];

  const alertColorMap = {
    destructive: { border: "border-destructive/20", bg: "bg-destructive/5 hover:bg-destructive/10", iconBg: "bg-destructive/10", iconColor: "text-destructive", textColor: "text-destructive" },
    yellow: { border: "border-yellow-200 dark:border-yellow-800", bg: "bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20", iconBg: "bg-yellow-500/10", iconColor: "text-yellow-600", textColor: "text-yellow-700 dark:text-yellow-300" },
    orange: { border: "border-orange-200 dark:border-orange-800", bg: "bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20", iconBg: "bg-orange-500/10", iconColor: "text-orange-500", textColor: "text-orange-700 dark:text-orange-300" },
  };

  const onTimeRate = counts.delivered > 0
    ? Math.round((counts.delivered / Math.max(counts.delivered + counts.delayed, 1)) * 100)
    : null;

  const topLanes = useMemo(() => {
    const laneCounts: Record<string, number> = {};
    recentShipments.forEach(s => {
      const lane = `${s.origin_port || "?"} → ${s.destination_port || "?"}`;
      laneCounts[lane] = (laneCounts[lane] || 0) + 1;
    });
    return Object.entries(laneCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [recentShipments]);

  return (
    <DashboardLayout>
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Shipment lifecycle overview</p>
        </div>
        {showCta && (
          <Button variant="electric" asChild>
            <Link to="/dashboard/shipments/new">
              <Plus className="mr-2 h-4 w-4" />Start a Shipment
            </Link>
          </Button>
        )}
      </div>

      {/* ═══ ONBOARDING (empty state) ═══ */}
      {isEmpty && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="mb-6 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Welcome to ALC Shipper Portal</h3>
                  <p className="text-sm text-muted-foreground mb-4">Your logistics command center. Start with one action:</p>
                  <Button variant="electric" asChild>
                    <Link to="/dashboard/shipments/new"><Plus className="mr-2 h-4 w-4" />Create Your First Shipment</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ═══ SECTION 1: KPIs + Alerts (compact row) ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Active", value: counts.active, icon: Package, accent: "text-accent", bg: "bg-accent/10" },
          { label: "Pending Pricing", value: counts.pendingPricing, icon: DollarSign, accent: "text-yellow-500", bg: "bg-yellow-500/10" },
          { label: "Awaiting Approval", value: counts.awaitingApproval, icon: Clock, accent: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "In Transit", value: counts.inTransit, icon: Truck, accent: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Delivered", value: counts.delivered, icon: CheckCircle2, accent: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Delayed", value: counts.delayed, icon: AlertTriangle, accent: "text-destructive", bg: "bg-destructive/10" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="h-full border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-4 w-4 ${s.accent}`} />
                </div>
                <div className="min-w-0">
                  {loading ? <Skeleton className="h-6 w-10" /> : (
                    <p className={`text-xl font-bold tabular-nums ${s.value > 0 && s.label === "Delayed" ? "text-destructive" : "text-foreground"}`}>{s.value}</p>
                  )}
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ═══ SECTION 2: Main content — 3-column grid ═══ */}
      {!loading && (
        <div className="grid lg:grid-cols-12 gap-5 mb-6">

          {/* ── LEFT: Pipeline Donut + Performance ── */}
          <div className="lg:col-span-4 space-y-5">
            {/* Pipeline */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-accent" />
                  </div>
                  Shipment Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <GlassDonut
                  data={pipelineData}
                  height={160}
                  innerRadius={46}
                  outerRadius={72}
                  centerValue={counts.active + counts.delivered}
                  centerLabel="total"
                />
                <div className="space-y-2 mt-3">
                  {pipelineData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.fill }} />
                        <span className="text-[11px] text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                    <p className="text-xl font-bold text-foreground tabular-nums">{counts.active + counts.delivered}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <p className="text-xl font-bold text-emerald-600 tabular-nums">{onTimeRate !== null ? `${onTimeRate}%` : "—"}</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">On-Time</p>
                  </div>
                </div>
                {topLanes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Lanes</p>
                    <div className="space-y-1.5">
                      {topLanes.map(([lane, count], i) => (
                        <AnimatedProgressBar key={lane} label={lane} value={count} max={topLanes[0][1]} color={PALETTE[i % PALETTE.length]} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── CENTER: Trend Chart + Alerts ── */}
          <div className="lg:col-span-5 space-y-5">
            {/* Shipments Over Time */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Package className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  Shipments Over Time
                </CardTitle>
                <CardDescription className="text-[11px]">Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <GlassAreaChart
                  data={trendData}
                  dataKey="count"
                  xKey="date"
                  color="hsl(var(--accent))"
                  height={200}
                  tooltipFormatter={(v) => [`${v}`, "Shipments"]}
                />
              </CardContent>
            </Card>

            {/* Alerts */}
            {hasAlerts && showAlerts && (
              <Card className="border-yellow-200/50 dark:border-yellow-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                    </div>
                    Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alertItems.map((item) => {
                      const c = alertColorMap[item.color];
                      return (
                        <Link key={item.href} to={item.href} className={`flex items-center gap-3 p-3 rounded-xl border ${c.border} ${c.bg} transition-colors`}>
                          <div className={`h-8 w-8 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0`}>
                            <item.icon className={`h-4 w-4 ${c.iconColor}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold tabular-nums ${c.textColor}`}>{item.label}</p>
                            <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── RIGHT: Recent Activity ── */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {recentShipments.slice(0, 6).map((s, i) => (
                    <Link
                      key={s.id}
                      to={`/dashboard/shipments/${s.id}`}
                      className="flex items-start gap-2.5 py-2.5 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors group relative"
                    >
                      {i < Math.min(recentShipments.length, 6) - 1 && (
                        <div className="absolute left-[15px] top-9 bottom-0 w-px bg-border" />
                      )}
                      <div className="h-6 w-6 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 z-10 mt-0.5">
                        {s.mode === "air" ? <Plane className="h-3 w-3 text-muted-foreground" /> : <Ship className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground truncate">{s.shipment_ref}</span>
                          <Badge variant="secondary" className={`text-[8px] px-1 py-0 h-3.5 ${statusColor[s.status] || "bg-secondary text-muted-foreground"}`}>
                            {statusLabel[s.status] || s.status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{s.origin_port || "—"} → {s.destination_port || "—"}</p>
                        <p className="text-[9px] text-muted-foreground/50">
                          {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {recentShipments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">No recent activity</p>
                  )}
                </div>
                {recentShipments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Button variant="ghost" size="sm" className="w-full text-accent text-xs" asChild>
                      <Link to="/dashboard/shipments">View All Shipments <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══ SECTION 3: Financial Summary (full width, compact) ═══ */}
      {!loading && !isEmpty && showFinancials && <SpendingSummary />}
    </DashboardLayout>
  );
};

export default Dashboard;
