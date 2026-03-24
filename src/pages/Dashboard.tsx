import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { canAccessRoute } from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import {
  Package, DollarSign, Clock, ArrowRight, TrendingUp,
  Plus, Ship, Plane, CheckCircle2, AlertTriangle, FileText,
  Inbox, Truck, Zap,
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
  id: string;
  shipment_ref: string;
  origin_port: string | null;
  destination_port: string | null;
  status: string;
  mode: string | null;
  created_at: string;
  updated_at: string;
  etd: string | null;
  eta: string | null;
  companies: { company_name: string } | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { roles } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [inTransitCount, setInTransitCount] = useState(0);
  const [delayedCount, setDelayedCount] = useState(0);
  const [missingDocsCount, setMissingDocsCount] = useState(0);
  const [recentShipments, setRecentShipments] = useState<ShipmentRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);

      const [activeRes, pendingRes, transitRes, recentRes, docsRes] = await Promise.all([
        supabase.from("shipments").select("id", { count: "exact" }).in("status", ["booked", "in_transit", "arrived"]),
        supabase.from("shipments").select("id", { count: "exact" }).in("status", ["draft", "pending"]),
        supabase.from("shipments").select("id", { count: "exact" }).eq("status", "in_transit"),
        supabase.from("shipments").select("id, shipment_ref, origin_port, destination_port, status, mode, created_at, updated_at, etd, eta, companies(company_name)").order("updated_at", { ascending: false }).limit(8),
        supabase.from("documents").select("id", { count: "exact" }).eq("status", "pending"),
      ]);

      setActiveCount(activeRes.count ?? 0);
      setPendingRequests(pendingRes.count ?? 0);
      setInTransitCount(transitRes.count ?? 0);
      setRecentShipments((recentRes.data as ShipmentRow[]) ?? []);
      setMissingDocsCount(docsRes.count ?? 0);

      // Check for delayed shipments (ETA passed but not delivered)
      const today = new Date().toISOString().split("T")[0];
      const { count: delayed } = await supabase
        .from("shipments")
        .select("id", { count: "exact" })
        .lt("eta", today)
        .in("status", ["in_transit", "arrived"]);
      setDelayedCount(delayed ?? 0);

      setLoading(false);
    };
    void fetchData();
  }, [user]);

  const isEmpty = !loading && recentShipments.length === 0 && activeCount === 0;

  const actionCards = [
    { label: "Active Shipments", value: activeCount, icon: Package, color: "text-accent", link: "/dashboard/shipments?status=active" },
    { label: "Pending Requests", value: pendingRequests, icon: Inbox, color: "text-yellow-500", link: "/dashboard/quotes" },
    { label: "In Transit", value: inTransitCount, icon: Truck, color: "text-blue-500", link: "/dashboard/shipments?status=in_transit" },
    { label: "Delayed", value: delayedCount, icon: AlertTriangle, color: "text-destructive", link: "/dashboard/shipments?status=delayed" },
    { label: "Missing Documents", value: missingDocsCount, icon: FileText, color: "text-orange-500", link: "/dashboard/shipments" },
  ];

  return (
    <DashboardLayout>
      {/* Header with primary CTA */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Shipment lifecycle overview</p>
        </div>
        <Button variant="electric" size="default" asChild>
          <Link to="/dashboard/shipments/new">
            <Plus className="mr-2 h-4 w-4" />
            New Shipment
          </Link>
        </Button>
      </div>

      {/* Getting Started for empty state */}
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
                  <p className="text-sm text-muted-foreground mb-4">
                    Your logistics command center. Start with one action:
                  </p>
                  <Button variant="electric" asChild>
                    <Link to="/dashboard/shipments/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Shipment
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {actionCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={s.link} className="group block">
              <Card className="transition-all group-hover:shadow-md group-hover:border-accent/20 h-full">
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
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Shipment Pipeline Status */}
      {!loading && recentShipments.length > 0 && (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Shipments</CardTitle>
              <CardDescription>Latest activity across all shipments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/shipments" className="text-accent">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
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

      {/* Tasks Needing Action */}
      {!loading && (delayedCount > 0 || missingDocsCount > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Tasks Needing Action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {delayedCount > 0 && (
              <Link to="/dashboard/shipments" className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{delayedCount} delayed shipment{delayedCount > 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground">ETA has passed without delivery confirmation</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}
            {missingDocsCount > 0 && (
              <Link to="/dashboard/shipments" className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{missingDocsCount} missing document{missingDocsCount > 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground">Pending documents across active shipments</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
