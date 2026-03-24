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

  const kpiCards = [
    { label: "Active Shipments", value: counts.active, icon: Package, accent: "text-accent", bg: "bg-accent/10", ring: "ring-accent/20" },
    { label: "Pending Pricing", value: counts.pendingPricing, icon: DollarSign, accent: "text-yellow-500", bg: "bg-yellow-500/10", ring: "ring-yellow-500/20" },
    { label: "Awaiting Approval", value: counts.awaitingApproval, icon: Clock, accent: "text-orange-500", bg: "bg-orange-500/10", ring: "ring-orange-500/20" },
    { label: "In Transit", value: counts.inTransit, icon: Truck, accent: "text-blue-500", bg: "bg-blue-500/10", ring: "ring-blue-500/20" },
    { label: "Delayed", value: counts.delayed, icon: AlertTriangle, accent: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/20" },
  ];

  const hasAlerts = counts.delayed > 0 || counts.missingDocs > 0 || counts.pendingPricing > 0 || counts.awaitingApproval > 0;

  return (
    <DashboardLayout>
      {/* Header with CTA */}
      <div className="flex items-center justify-between mb-8">
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

      {/* Getting Started */}
      {isEmpty && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="mb-8 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {kpiCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`transition-all hover:shadow-md ring-1 ${s.ring} h-full`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</CardTitle>
                <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-4 w-4 ${s.accent}`} />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-14" /> : (
                  <div className={`text-2xl font-bold tabular-nums ${s.value > 0 && s.label === "Delayed" ? "text-destructive" : "text-foreground"}`}>{s.value}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tasks & Alerts */}
      {!loading && hasAlerts && showAlerts && (
        <Card className="mb-6 border-yellow-200 dark:border-yellow-800/40 bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </div>
              Tasks & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {counts.delayed > 0 && (
                <Link to="/dashboard/shipments?status=delayed" className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-destructive tabular-nums">{counts.delayed} delayed</p>
                    <p className="text-[10px] text-muted-foreground">Requires attention</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </Link>
              )}
              {counts.pendingPricing > 0 && (
                <Link to="/dashboard/quotes" className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 tabular-nums">{counts.pendingPricing} pricing needed</p>
                    <p className="text-[10px] text-muted-foreground">Review quotes</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </Link>
              )}
              {counts.awaitingApproval > 0 && (
                <Link to="/dashboard/shipments?status=awaiting_approval" className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 tabular-nums">{counts.awaitingApproval} approval pending</p>
                    <p className="text-[10px] text-muted-foreground">Needs decision</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </Link>
              )}
              {counts.missingDocs > 0 && (
                <Link to="/dashboard/shipments" className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 tabular-nums">{counts.missingDocs} missing docs</p>
                    <p className="text-[10px] text-muted-foreground">Upload required</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row: Pipeline Donut + Trend Area */}
      {!loading && (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Pipeline Donut */}
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-accent" />
                </div>
                Shipment Pipeline
              </CardTitle>
              <CardDescription>Live status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-[180px] shrink-0">
                  <GlassDonut
                    data={pipelineData}
                    height={180}
                    innerRadius={52}
                    outerRadius={80}
                    centerValue={counts.active + counts.delivered}
                    centerLabel="total"
                  />
                </div>
                <div className="flex-1 space-y-2.5">
                  {pipelineData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ background: item.fill, boxShadow: `0 0 8px ${item.fill}40` }} />
                        <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipments Over Time */}
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Package className="h-4 w-4 text-blue-500" />
                </div>
                Shipments Over Time
              </CardTitle>
              <CardDescription>New shipments — last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <GlassAreaChart
                data={trendData}
                dataKey="count"
                xKey="date"
                color="hsl(var(--accent))"
                height={220}
                tooltipFormatter={(v) => [`${v}`, "Shipments"]}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Spending Summary */}
      {!loading && !isEmpty && showFinancials && <SpendingSummary />}

      {/* Performance Snapshot + Activity Timeline */}
      {!loading && !isEmpty && (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Performance Snapshot */}
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                Performance Snapshot
              </CardTitle>
              <CardDescription>Key metrics at a glance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{counts.active + counts.delivered}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Shipments</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                    {counts.delivered > 0
                      ? `${Math.round((counts.delivered / Math.max(counts.delivered + counts.delayed, 1)) * 100)}%`
                      : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">On-Time Rate</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Lanes</p>
                <div className="space-y-1.5">
                  {(() => {
                    const laneCounts: Record<string, number> = {};
                    recentShipments.forEach(s => {
                      const lane = `${s.origin_port || "?"} → ${s.destination_port || "?"}`;
                      laneCounts[lane] = (laneCounts[lane] || 0) + 1;
                    });
                    const topLanes = Object.entries(laneCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
                    if (topLanes.length === 0) return <p className="text-xs text-muted-foreground">No data yet</p>;
                    const maxCount = topLanes[0][1];
                    return topLanes.map(([lane, count], i) => (
                      <AnimatedProgressBar
                        key={lane}
                        label={lane}
                        value={count}
                        max={maxCount}
                        color={PALETTE[i % PALETTE.length]}
                        index={i}
                      />
                    ));
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  Activity Timeline
                </CardTitle>
                <CardDescription>Recent account activity</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {recentShipments.slice(0, 5).map((s, i) => (
                  <Link
                    key={s.id}
                    to={`/dashboard/shipments/${s.id}`}
                    className="flex items-start gap-3 py-2.5 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors group relative"
                  >
                    {i < Math.min(recentShipments.length, 5) - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
                    )}
                    <div className="h-7 w-7 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 z-10 mt-0.5">
                      {s.mode === "air" ? <Plane className="h-3 w-3 text-muted-foreground" /> : <Ship className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{s.shipment_ref}</span>
                        <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-4 ${statusColor[s.status] || "bg-secondary text-muted-foreground"}`}>
                          {statusLabel[s.status] || s.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.origin_port || "—"} → {s.destination_port || "—"}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1.5" />
                  </Link>
                ))}
                {recentShipments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
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
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
