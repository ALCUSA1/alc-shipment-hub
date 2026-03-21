import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Truck, MapPin, Calendar, Package, DollarSign, User, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const statusStyle: Record<string, string> = {
  available: "bg-accent/10 text-accent border-accent/20",
  accepted_by_carrier: "bg-blue-100 text-blue-700 border-blue-200",
  submitted: "bg-yellow-100 text-yellow-700 border-yellow-200",
  accepted: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const formatStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const Trucking = () => {
  const { user } = useAuth();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["trucking-quotes-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trucking_quotes")
        .select("*, shipments(shipment_ref, origin_port, destination_port)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["driver-assignments-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_assignments")
        .select("*, shipments(shipment_ref)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const activeQuotes = quotes.filter((q: any) => !["completed", "rejected"].includes(q.status));
  const completedQuotes = quotes.filter((q: any) => ["completed", "rejected"].includes(q.status));

  const stats = {
    total: quotes.length,
    active: activeQuotes.length,
    accepted: quotes.filter((q: any) => q.status === "accepted").length,
    pending: quotes.filter((q: any) => ["available", "submitted", "accepted_by_carrier"].includes(q.status)).length,
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trucking</h1>
          <p className="text-sm text-muted-foreground">Manage truck pickup, delivery, and driver assignments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Quotes", value: stats.total, icon: Truck },
          { label: "Active", value: stats.active, icon: Clock },
          { label: "Accepted", value: stats.accepted, icon: Package },
          { label: "Pending", value: stats.pending, icon: DollarSign },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</span>
                <s.icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Trucking Quotes */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trucking Quotes</CardTitle>
              <CardDescription>Active pickup and delivery requests</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                </div>
              ) : activeQuotes.length === 0 ? (
                <div className="text-center py-12">
                  <Truck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No active trucking quotes.</p>
                  <p className="text-xs text-muted-foreground mt-1">Trucking requests are created from the shipment detail page.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeQuotes.map((q: any) => (
                    <Link
                      key={q.id}
                      to={`/dashboard/shipments/${q.shipment_id}`}
                      className="block p-4 rounded-lg border hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium text-foreground">
                            {(q.shipments as any)?.shipment_ref || "—"}
                          </span>
                          {q.company_name && (
                            <span className="text-xs text-muted-foreground ml-2">• {q.company_name}</span>
                          )}
                        </div>
                        <Badge className={statusStyle[q.status] || "bg-secondary text-muted-foreground"} variant="outline">
                          {formatStatus(q.status)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {q.pickup_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(q.pickup_date), "MMM d, yyyy")}
                            {q.pickup_time && ` at ${q.pickup_time}`}
                          </span>
                        )}
                        {q.equipment_type && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {q.equipment_type}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {q.price} {q.currency}
                        </span>
                        {q.driver_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {q.driver_name}
                          </span>
                        )}
                        {(q.shipments as any)?.origin_port && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {(q.shipments as any).origin_port} → {(q.shipments as any).destination_port}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Driver Assignments sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Assignments</CardTitle>
              <CardDescription>Driver dispatch status</CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No driver assignments yet.</p>
              ) : (
                <div className="space-y-3">
                  {assignments.map((a: any) => (
                    <Link
                      key={a.id}
                      to={`/dashboard/shipments/${a.shipment_id}`}
                      className="block p-3 rounded-lg border hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{a.driver_name || "Unassigned"}</span>
                        <Badge variant="outline" className="text-[10px]">{formatStatus(a.status)}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>{(a.shipments as any)?.shipment_ref || "—"}</p>
                        {a.pickup_address && <p className="truncate">From: {a.pickup_address}</p>}
                        {a.delivery_address && <p className="truncate">To: {a.delivery_address}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed section */}
          {completedQuotes.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Completed</CardTitle>
                <CardDescription>{completedQuotes.length} finished or rejected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {completedQuotes.slice(0, 5).map((q: any) => (
                    <Link
                      key={q.id}
                      to={`/dashboard/shipments/${q.shipment_id}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-secondary/50 transition-colors"
                    >
                      <span className="text-sm text-muted-foreground">{(q.shipments as any)?.shipment_ref || "—"}</span>
                      <Badge className={statusStyle[q.status] || "bg-secondary"} variant="outline">
                        {formatStatus(q.status)}
                      </Badge>
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

export default Trucking;
