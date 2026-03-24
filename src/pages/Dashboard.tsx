import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import {
  Package, DollarSign, Clock, ArrowRight, Plus, Ship, Plane,
  CheckCircle2, AlertTriangle, FileText, Inbox, Truck, Zap, Activity,
} from "lucide-react";
import { motion } from "framer-motion";

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

/* ── Pipeline Stage Chip ── */
function PipelineStage({ label, count, color, active }: { label: string; count: number; color: string; active?: boolean }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all ${active ? "border-accent/30 bg-accent/5" : "border-transparent"}`}>
      <span className={`text-lg font-bold tabular-nums ${color}`}>{count}</span>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{label}</span>
    </div>
  );
}

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ active: 0, pendingPricing: 0, quoteReady: 0, awaitingApproval: 0, booked: 0, inTransit: 0, delivered: 0, delayed: 0, missingDocs: 0 });
  const [recentShipments, setRecentShipments] = useState<ShipmentRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [activeRes, pendingRes, quoteRes, approvalRes, bookedRes, transitRes, deliveredRes, recentRes, docsRes] = await Promise.all([
        supabase.from("shipments").select("id", { count: "exact" }).in("status", ["booked", "in_transit", "arrived"]),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "pending_pricing"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "quote_ready"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "awaiting_approval"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "booked"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "in_transit"),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "delivered"),
        supabase.from("shipments").select("id, shipment_ref, origin_port, destination_port, status, mode, created_at, updated_at, etd, eta, companies!shipments_company_id_fkey(company_name)").order("updated_at", { ascending: false }).limit(8),
        supabase.from("documents").select("id", { count: "exact" }).eq("status", "pending"),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const { count: delayed } = await supabase.from("shipments").select("id", { count: "exact" }).lt("eta", today).in("status", ["in_transit", "arrived"]);

      setCounts({
        active: activeRes.count ?? 0, pendingPricing: pendingRes.count ?? 0, quoteReady: quoteRes.count ?? 0,
        awaitingApproval: approvalRes.count ?? 0, booked: bookedRes.count ?? 0, inTransit: transitRes.count ?? 0,
        delivered: deliveredRes.count ?? 0, delayed: delayed ?? 0, missingDocs: docsRes.count ?? 0,
      });
      setRecentShipments((recentRes.data as ShipmentRow[]) ?? []);
      setLoading(false);
    };
    void fetchData();
  }, [user]);

  const isEmpty = !loading && recentShipments.length === 0 && counts.active === 0;

  const kpiCards = [
    { label: "Active Shipments", value: counts.active, icon: Package, color: "text-accent" },
    { label: "Pending Pricing", value: counts.pendingPricing, icon: DollarSign, color: "text-yellow-500" },
    { label: "Awaiting Approval", value: counts.awaitingApproval, icon: Clock, color: "text-orange-500" },
    { label: "In Transit", value: counts.inTransit, icon: Truck, color: "text-blue-500" },
    { label: "Delayed", value: counts.delayed, icon: AlertTriangle, color: "text-destructive" },
  ];

  const pipelineStages = [
    { label: "Pending Pricing", count: counts.pendingPricing, color: "text-yellow-600" },
    { label: "Quote Ready", count: counts.quoteReady, color: "text-accent" },
    { label: "Awaiting Approval", count: counts.awaitingApproval, color: "text-orange-500" },
    { label: "Booked", count: counts.booked, color: "text-blue-500" },
    { label: "In Transit", count: counts.inTransit, color: "text-accent" },
    { label: "Delivered", count: counts.delivered, color: "text-emerald-600" },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Shipment lifecycle overview</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {kpiCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="transition-all hover:shadow-md hover:border-accent/20 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</CardTitle>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-14" /> : (
                  <div className="text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Shipment Pipeline Status */}
      {!loading && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Shipment Pipeline</CardTitle>
            <CardDescription>Status distribution across the shipment lifecycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-1 overflow-x-auto">
              {pipelineStages.map((stage, i) => (
                <div key={stage.label} className="flex items-center">
                  <PipelineStage label={stage.label} count={stage.count} color={stage.color} active={stage.count > 0} />
                  {i < pipelineStages.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-border mx-1 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tasks & Alerts */}
        <div className="lg:col-span-1 space-y-4">
          {!loading && (counts.delayed > 0 || counts.missingDocs > 0 || counts.pendingPricing > 0 || counts.awaitingApproval > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Tasks & Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {counts.pendingPricing > 0 && (
                  <Link to="/dashboard/quotes" className="flex items-center justify-between p-2.5 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-yellow-600" />
                      <span className="text-xs font-medium">{counts.pendingPricing} pricing needed</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </Link>
                )}
                {counts.awaitingApproval > 0 && (
                  <Link to="/dashboard/shipments?status=awaiting_approval" className="flex items-center justify-between p-2.5 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-xs font-medium">{counts.awaitingApproval} approval pending</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </Link>
                )}
                {counts.delayed > 0 && (
                  <Link to="/dashboard/shipments?status=delayed" className="flex items-center justify-between p-2.5 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs font-medium">{counts.delayed} delayed shipment{counts.delayed > 1 ? "s" : ""}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </Link>
                )}
                {counts.missingDocs > 0 && (
                  <Link to="/dashboard/shipments" className="flex items-center justify-between p-2.5 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-xs font-medium">{counts.missingDocs} missing document{counts.missingDocs > 1 ? "s" : ""}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Shipments + Activity */}
        <div className="lg:col-span-2">
          {!loading && recentShipments.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>Latest shipment updates</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/shipments" className="text-accent">
                    View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {recentShipments.map((s) => (
                    <Link
                      key={s.id}
                      to={`/dashboard/shipments/${s.id}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          {s.mode === "air" ? <Plane className="h-3.5 w-3.5 text-muted-foreground" /> : <Ship className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{s.shipment_ref}</span>
                            {(s as any).companies?.company_name && (
                              <span className="text-[10px] text-muted-foreground truncate">• {(s as any).companies.company_name}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.origin_port || "—"} → {s.destination_port || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-muted-foreground hidden sm:block">
                          {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                        </span>
                        <Badge variant="secondary" className={`text-[10px] ${statusColor[s.status] || "bg-secondary text-muted-foreground"}`}>
                          {statusLabel[s.status] || s.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
