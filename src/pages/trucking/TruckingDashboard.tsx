import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package, FileText, DollarSign, Clock, Truck, Ship, ArrowRight, MapPin, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const TruckingDashboard = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["trucking-stats", user?.id],
    queryFn: async () => {
      const [shipmentsRes, quotesRes] = await Promise.all([
        supabase.from("shipments").select("id", { count: "exact", head: true }).in("status", ["draft", "booked", "booking_confirmed", "in_transit"]),
        supabase.from("trucking_quotes").select("*").eq("trucker_user_id", user!.id),
      ]);
      const quotes = quotesRes.data || [];
      return {
        availableOrders: shipmentsRes.count || 0,
        submittedQuotes: quotes.filter((q) => q.status === "submitted").length,
        acceptedQuotes: quotes.filter((q) => q.status === "accepted").length,
        totalValue: quotes.filter((q) => q.status === "accepted").reduce((sum, q) => sum + Number(q.price), 0),
      };
    },
    enabled: !!user,
  });

  // Recent shipments needing trucking
  const { data: recentShipments } = useQuery({
    queryKey: ["trucking-recent-shipments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select("id, shipment_ref, origin_port, destination_port, pickup_location, delivery_location, etd, status, mode")
        .in("status", ["booked", "booking_confirmed", "in_transit"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const statCards = [
    { title: "Active Shipments", value: stats?.acceptedQuotes ?? 0, icon: Truck, color: "text-accent", bgColor: "bg-accent/10" },
    { title: "Available Orders", value: stats?.availableOrders ?? 0, icon: Package, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { title: "Pending Quotes", value: stats?.submittedQuotes ?? 0, icon: Clock, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
    { title: "Total Earnings", value: `$${(stats?.totalValue ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-green-500", bgColor: "bg-green-500/10" },
  ];

  const statusColor: Record<string, string> = {
    booked: "bg-blue-100 text-blue-700",
    booking_confirmed: "bg-accent/10 text-accent",
    in_transit: "bg-yellow-100 text-yellow-700",
  };

  return (
    <TruckingLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground">Shipment-linked trucking operations at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Shipments Needing Trucking */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ship className="h-4 w-4 text-muted-foreground" />
              Recent Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(recentShipments?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active shipments.</p>
            ) : (
              <div className="space-y-3">
                {recentShipments!.map((s: any) => (
                  <Link key={s.id} to={`/trucking/orders/${s.id}`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <Ship className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.shipment_ref}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {s.pickup_location || s.origin_port || "—"} → {s.delivery_location || s.destination_port || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.etd && <span className="text-[10px] text-muted-foreground">{format(new Date(s.etd), "MMM d")}</span>}
                        <Badge className={statusColor[s.status] || "bg-secondary"} variant="secondary">
                          {s.status?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/trucking/orders" className="block">
              <Button variant="electric" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" /> Browse Available Orders
              </Button>
            </Link>
            <Link to="/trucking/schedule" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" /> View Schedule
              </Button>
            </Link>
            <Link to="/trucking/documents" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" /> Upload Documents
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </TruckingLayout>
  );
};

export default TruckingDashboard;
