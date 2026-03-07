import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Package, DollarSign, Truck, Warehouse, Clock, ArrowRight } from "lucide-react";

interface ShipmentRow {
  id: string;
  shipment_ref: string;
  origin_port: string | null;
  destination_port: string | null;
  status: string;
  created_at: string;
  companies: { company_name: string } | null;
}

const statusColor: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  booked: "bg-yellow-100 text-yellow-700",
  in_transit: "bg-accent/10 text-accent",
  arrived: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  booked: "Booked",
  in_transit: "In Transit",
  arrived: "Arrived",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingQuotes, setPendingQuotes] = useState(0);
  const [truckPickups, setTruckPickups] = useState(0);
  const [warehouseArrivals, setWarehouseArrivals] = useState(0);
  const [recentEventsCount, setRecentEventsCount] = useState(0);
  const [recentShipments, setRecentShipments] = useState<ShipmentRow[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const [shipmentsRes, quotesRes, pickupsRes, warehouseRes, recentShipmentsRes] = await Promise.all([
        supabase
          .from("shipments")
          .select("id, status", { count: "exact" })
          .in("status", ["booked", "in_transit", "arrived"]),
        supabase
          .from("quotes")
          .select("id", { count: "exact" })
          .eq("status", "pending"),
        supabase
          .from("truck_pickups")
          .select("id", { count: "exact" })
          .eq("status", "scheduled"),
        supabase
          .from("warehouse_operations")
          .select("id", { count: "exact" })
          .eq("status", "pending"),
        supabase
          .from("shipments")
          .select("id, shipment_ref, origin_port, destination_port, status, created_at, companies(company_name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setActiveCount(shipmentsRes.count ?? 0);
      setPendingQuotes(quotesRes.count ?? 0);
      setTruckPickups(pickupsRes.count ?? 0);
      setWarehouseArrivals(warehouseRes.count ?? 0);
      setRecentShipments((recentShipmentsRes.data as ShipmentRow[]) ?? []);

      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { count: updatedCount } = await supabase
        .from("shipments")
        .select("id", { count: "exact" })
        .gte("updated_at", yesterday);
      setRecentEventsCount(updatedCount ?? 0);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const stats = [
    { label: "Active Shipments", value: activeCount, icon: Package, change: "Booked, in transit & arrived" },
    { label: "Pending Quotes", value: pendingQuotes, icon: DollarSign, change: "Awaiting response" },
    { label: "Truck Pickups", value: truckPickups, icon: Truck, change: "Scheduled pickups" },
    { label: "Warehouse Arrivals", value: warehouseArrivals, icon: Warehouse, change: "Pending cargo" },
    { label: "Recent Updates", value: recentEventsCount, icon: Clock, change: "Last 24 hours" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your shipment coordination overview</p>
        </div>
        <Button variant="electric" asChild>
          <Link to="/dashboard/shipments/new">New Shipment <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{s.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : recentShipments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No shipments yet. Create your first shipment to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {recentShipments.map((s) => (
                <Link
                  key={s.id}
                  to={`/dashboard/shipments/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono font-medium text-foreground">{s.shipment_ref}</span>
                    {(s.companies as any)?.company_name && (
                      <span className="text-sm text-accent font-medium">{(s.companies as any).company_name}</span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {s.origin_port && s.destination_port
                        ? `${s.origin_port} → ${s.destination_port}`
                        : s.origin_port || s.destination_port || "No route set"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[s.status] || "bg-secondary text-muted-foreground"}`}>
                      {statusLabel[s.status] || s.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(s.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Dashboard;
