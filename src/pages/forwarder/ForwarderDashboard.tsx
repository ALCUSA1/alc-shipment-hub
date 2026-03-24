import { ForwarderLayout } from "@/components/forwarder/ForwarderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Ship, Users, FileText, ClipboardList, DollarSign, Plane,
  AlertTriangle, ArrowRight, Plus, Package, CheckCircle2,
} from "lucide-react";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  booked: "bg-yellow-100 text-yellow-800",
  in_transit: "bg-accent/10 text-accent",
  delivered: "bg-emerald-100 text-emerald-700",
};

const ForwarderDashboard = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["forwarder-stats", user?.id],
    queryFn: async () => {
      const [customersRes, shipmentsRes, quotesRes] = await Promise.all([
        supabase
          .from("forwarder_customers")
          .select("id", { count: "exact", head: true })
          .eq("forwarder_user_id", user!.id),
        supabase
          .from("shipments")
          .select("id, status, shipment_ref, origin_port, destination_port, mode, updated_at, companies!shipments_company_id_fkey(company_name)")
          .eq("user_id", user!.id)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("quotes")
          .select("id, status, amount")
          .eq("user_id", user!.id),
      ]);

      const shipments = shipmentsRes.data || [];
      const activeShipments = shipments.filter(
        (s) => !["delivered", "completed", "cancelled"].includes(s.status)
      ).length;
      const quotes = quotesRes.data || [];
      const pendingQuotes = quotes.filter((q) => q.status === "pending").length;
      const revenue = quotes
        .filter((q) => q.status === "accepted")
        .reduce((sum, q) => sum + (q.amount || 0), 0);

      return {
        totalCustomers: customersRes.count || 0,
        activeShipments,
        pendingQuotes,
        totalShipments: shipments.length,
        revenue,
        recentShipments: shipments,
      };
    },
    enabled: !!user,
  });

  const statCards = [
    {
      title: "Customer Accounts",
      value: stats?.totalCustomers ?? 0,
      icon: Users,
      accent: "text-accent",
      bgColor: "bg-accent/10",
      href: "/forwarder/customers",
    },
    {
      title: "Active Shipments",
      value: stats?.activeShipments ?? 0,
      icon: Ship,
      accent: "text-blue-500",
      bgColor: "bg-blue-500/10",
      href: "/forwarder/shipments",
    },
    {
      title: "Pending Quotes",
      value: stats?.pendingQuotes ?? 0,
      icon: ClipboardList,
      accent: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      href: "/forwarder/quotes",
    },
    {
      title: "Revenue",
      value: `$${(stats?.revenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      accent: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <ForwarderLayout>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Forwarder Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage customers, shipment requests, and bookings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/forwarder/customers">
              <Users className="mr-2 h-4 w-4" />
              Invite Customer
            </Link>
          </Button>
          <Button variant="electric" size="sm" asChild>
            <Link to="/forwarder/quotes">
              <Plus className="mr-2 h-4 w-4" />
              Quote Queue
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => {
          const inner = (
            <Card className="hover:shadow-md hover:border-accent/20 transition-all h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.accent}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.title} to={stat.href}>{inner}</Link>
          ) : (
            <div key={stat.title}>{inner}</div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Action Required */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.pendingQuotes ?? 0) > 0 && (
                <Link to="/forwarder/quotes" className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <ClipboardList className="h-4 w-4 text-yellow-500" />
                    </div>
                    <span className="text-sm text-foreground">
                      <span className="font-semibold">{stats?.pendingQuotes}</span> quotes awaiting response
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
              {(stats?.totalCustomers ?? 0) === 0 && (
                <Link to="/forwarder/customers" className="flex items-center justify-between p-3 rounded-lg border hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-accent" />
                    </div>
                    <span className="text-sm text-foreground">Invite your first customer</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
              {(stats?.pendingQuotes ?? 0) === 0 && (stats?.totalCustomers ?? 0) > 0 && (
                <div className="flex items-center gap-3 p-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  All caught up — no pending actions
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Shipments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Shipments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/forwarder/shipments" className="text-accent text-xs font-medium">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(stats?.recentShipments ?? []).length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No shipments yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(stats?.recentShipments ?? []).map((s: any) => {
                  const ModeIcon = s.mode === "air" ? Plane : Ship;
                  const companyName = s.companies?.company_name;
                  return (
                    <Link
                      key={s.id}
                      to={`/dashboard/shipments/${s.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/40 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <ModeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-accent font-mono">{s.shipment_ref}</span>
                          {companyName && <span className="text-xs text-muted-foreground truncate">· {companyName}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.origin_port || "—"} → {s.destination_port || "—"}
                        </p>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] shrink-0 ${statusColor[s.status] || ""}`}>
                        {s.status?.replace(/_/g, " ")}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ForwarderLayout>
  );
};

export default ForwarderDashboard;
