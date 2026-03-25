import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package, FileText, DollarSign, Clock, Truck, ArrowRight, MapPin, Calendar, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const TruckingDashboard = () => {
  const { user } = useAuth();

  const { data: quotes = [] } = useQuery({
    queryKey: ["trucking-my-quotes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trucking_quotes")
        .select("*, shipments!trucking_quotes_shipment_id_fkey(shipment_ref, origin_port, destination_port, pickup_location, delivery_location, etd, eta, status)")
        .eq("trucker_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const activeOrders = quotes.filter((q: any) => ["accepted", "accepted_by_carrier", "available"].includes(q.status));
  const pendingQuotes = quotes.filter((q: any) => q.status === "submitted");
  const completedOrders = quotes.filter((q: any) => ["completed", "delivered"].includes(q.status));
  const totalEarnings = quotes
    .filter((q: any) => q.status === "accepted")
    .reduce((sum: number, q: any) => sum + Number(q.price || 0), 0);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayJobs = quotes.filter((q: any) => q.pickup_date === todayStr && ["accepted", "accepted_by_carrier"].includes(q.status));

  const statCards = [
    { title: "Active Orders", value: activeOrders.length, icon: Truck, color: "text-accent", bgColor: "bg-accent/10" },
    { title: "Pending Quotes", value: pendingQuotes.length, icon: Clock, color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
    { title: "Completed", value: completedOrders.length, icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-500/10" },
    { title: "Total Earnings", value: `$${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-green-600", bgColor: "bg-green-500/10" },
  ];

  const statusColor: Record<string, string> = {
    available: "bg-blue-100 text-blue-700",
    accepted_by_carrier: "bg-accent/10 text-accent",
    accepted: "bg-green-100 text-green-700",
    submitted: "bg-yellow-100 text-yellow-700",
  };

  return (
    <TruckingLayout>
      {/* Role responsibility banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/20 mb-6">
        <Truck className="h-5 w-5 text-accent mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">You are responsible for pickup and delivery</p>
          <p className="text-xs text-muted-foreground">Accept orders, update statuses, and upload proof of delivery for assigned shipments.</p>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your trucking operations at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              Today's Schedule
              {todayJobs.length > 0 && <Badge variant="secondary" className="text-[10px]">{todayJobs.length} jobs</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayJobs.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pickups scheduled for today.</p>
                <Link to="/trucking/orders">
                  <Button variant="link" size="sm" className="mt-2">Browse available orders</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayJobs.map((q: any) => {
                  const s = q.shipments;
                  return (
                    <Link key={q.id} to={`/trucking/orders/${q.shipment_id}`} className="block">
                      <div className="p-3 rounded-lg border hover:border-accent/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{s?.shipment_ref || "—"}</span>
                          <span className="text-xs text-muted-foreground">{q.pickup_time || "TBD"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {s?.pickup_location || s?.origin_port || "—"} → {s?.delivery_location || s?.destination_port || "—"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Orders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" />
              Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active orders.</p>
                <Link to="/trucking/orders">
                  <Button variant="link" size="sm" className="mt-2">Browse orders</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.slice(0, 5).map((q: any) => {
                  const s = q.shipments;
                  return (
                    <Link key={q.id} to={`/trucking/orders/${q.shipment_id}`} className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:border-accent/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">{s?.shipment_ref || "—"}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {s?.pickup_location || s?.origin_port || "—"} → {s?.delivery_location || s?.destination_port || "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {q.pickup_date && <span className="text-[10px] text-muted-foreground">{format(new Date(q.pickup_date), "MMM d")}</span>}
                          <Badge className={cn("text-[10px]", statusColor[q.status] || "bg-secondary")} variant="secondary">
                            {q.status?.replace(/_/g, " ")}
                          </Badge>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {activeOrders.length > 5 && (
                  <Link to="/trucking/orders">
                    <Button variant="ghost" size="sm" className="w-full">View all {activeOrders.length} orders</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* What to do next */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-accent" />
              What to do next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-3">
              <Link to="/trucking/orders" className="block">
                <div className="p-4 rounded-lg border border-dashed hover:border-accent/50 transition-colors text-center">
                  <Package className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Browse Orders</p>
                  <p className="text-[10px] text-muted-foreground">View and quote on available shipments</p>
                </div>
              </Link>
              <Link to="/trucking/documents" className="block">
                <div className="p-4 rounded-lg border border-dashed hover:border-accent/50 transition-colors text-center">
                  <FileText className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Upload POD</p>
                  <p className="text-[10px] text-muted-foreground">Submit proof of delivery documents</p>
                </div>
              </Link>
              <Link to="/trucking/schedule" className="block">
                <div className="p-4 rounded-lg border border-dashed hover:border-accent/50 transition-colors text-center">
                  <Calendar className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">View Schedule</p>
                  <p className="text-[10px] text-muted-foreground">Check upcoming pickups and deliveries</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </TruckingLayout>
  );
};

export default TruckingDashboard;
