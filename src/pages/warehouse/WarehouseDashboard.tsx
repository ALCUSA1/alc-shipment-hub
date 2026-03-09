import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PackageOpen, Boxes, PackageCheck, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const WarehouseDashboard = () => {
  const { user } = useAuth();

  const { data: orders = [] } = useQuery({
    queryKey: ["warehouse-orders-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_orders")
        .select("*")
        .eq("warehouse_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const pendingInbound = orders.filter((o) => o.order_type === "receiving" && o.status === "pending").length;
  const inStorage = orders.filter((o) => o.order_type === "storage" && (o.status === "in_progress" || o.status === "confirmed")).length;
  const pendingRelease = orders.filter((o) => o.order_type === "release" && o.status === "pending").length;
  const unbilledTotal = orders
    .filter((o) => o.billing_status === "unbilled")
    .reduce((sum, o) => sum + (Number(o.handling_fee) || 0) + (Number(o.total_storage_charges) || 0), 0);

  const recentOrders = orders.slice(0, 5);

  const stats = [
    { label: "Pending Receiving", value: pendingInbound, icon: PackageOpen, color: "text-yellow-600" },
    { label: "Items in Storage", value: inStorage, icon: Boxes, color: "text-accent" },
    { label: "Pending Releases", value: pendingRelease, icon: PackageCheck, color: "text-orange-600" },
    { label: "Unbilled Revenue", value: `$${unbilledTotal.toLocaleString()}`, icon: DollarSign, color: "text-green-600" },
  ];

  const statusStyle: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-accent/10 text-accent",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <WarehouseLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Warehouse Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your warehouse operations</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
                <s.icon className={cn("h-8 w-8", s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground capitalize">{order.order_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.cargo_description || "No description"} · {order.num_packages || 0} pkgs
                    </p>
                  </div>
                  <Badge className={statusStyle[order.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </WarehouseLayout>
  );
};

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export default WarehouseDashboard;
