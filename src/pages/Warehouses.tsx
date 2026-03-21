import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Warehouse, Package, Calendar, MapPin, ArrowDownToLine, ArrowUpFromLine, Clock, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

const statusStyle: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-accent/10 text-accent border-accent/20",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  received: "bg-blue-100 text-blue-700 border-blue-200",
  stored: "bg-indigo-100 text-indigo-700 border-indigo-200",
  released: "bg-green-100 text-green-700 border-green-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const formatStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const Warehouses = () => {
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["warehouse-orders-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_orders")
        .select("*, shipments(shipment_ref, origin_port, destination_port), warehouses(warehouse_name, city, state)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const inboundOrders = orders.filter((o: any) => o.order_type === "inbound");
  const outboundOrders = orders.filter((o: any) => o.order_type === "release" || o.order_type === "outbound");
  const activeOrders = orders.filter((o: any) => !["completed", "cancelled"].includes(o.status));

  const stats = {
    total: orders.length,
    active: activeOrders.length,
    inbound: inboundOrders.length,
    outbound: outboundOrders.length,
  };

  const OrderCard = ({ order }: { order: any }) => (
    <Link
      to={`/dashboard/shipments/${order.shipment_id}`}
      className="block p-4 rounded-lg border hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-foreground">
            {(order.shipments as any)?.shipment_ref || "—"}
          </span>
          {(order.warehouses as any)?.warehouse_name && (
            <span className="text-xs text-muted-foreground ml-2">
              • {(order.warehouses as any).warehouse_name}
              {(order.warehouses as any).city && `, ${(order.warehouses as any).city}`}
            </span>
          )}
        </div>
        <Badge className={statusStyle[order.status] || "bg-secondary text-muted-foreground"} variant="outline">
          {formatStatus(order.status)}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 capitalize">
          {order.order_type === "inbound" ? (
            <ArrowDownToLine className="h-3 w-3" />
          ) : (
            <ArrowUpFromLine className="h-3 w-3" />
          )}
          {order.order_type}
        </span>
        {order.expected_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(order.expected_date), "MMM d, yyyy")}
          </span>
        )}
        {order.cargo_description && (
          <span className="truncate max-w-[200px]">{order.cargo_description}</span>
        )}
        {order.num_packages && (
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {order.num_packages} pkgs
          </span>
        )}
        {order.weight && <span>{order.weight} kg</span>}
        {order.handling_fee && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            ${order.handling_fee}
          </span>
        )}
        {order.storage_zone && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Zone {order.storage_zone}
          </span>
        )}
      </div>
    </Link>
  );

  const EmptyState = ({ message, sub }: { message: string; sub: string }) => (
    <div className="text-center py-12">
      <Warehouse className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>
          <p className="text-sm text-muted-foreground">Manage cargo handling, storage, and release operations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Orders", value: stats.total, icon: Warehouse },
          { label: "Active", value: stats.active, icon: Clock },
          { label: "Inbound", value: stats.inbound, icon: ArrowDownToLine },
          { label: "Outbound", value: stats.outbound, icon: ArrowUpFromLine },
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

      {/* Tabbed content */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="inbound">Inbound ({inboundOrders.length})</TabsTrigger>
          <TabsTrigger value="outbound">Outbound ({outboundOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Warehouse Orders</CardTitle>
              <CardDescription>Inbound receiving, storage, and release operations</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                </div>
              ) : orders.length === 0 ? (
                <EmptyState message="No warehouse orders yet." sub="Warehouse orders are created from the shipment detail page." />
              ) : (
                <div className="space-y-3">
                  {orders.map((o: any) => <OrderCard key={o.id} order={o} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbound">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inbound Orders</CardTitle>
              <CardDescription>Cargo receiving and storage</CardDescription>
            </CardHeader>
            <CardContent>
              {inboundOrders.length === 0 ? (
                <EmptyState message="No inbound orders." sub="Inbound orders track cargo arriving at the warehouse." />
              ) : (
                <div className="space-y-3">
                  {inboundOrders.map((o: any) => <OrderCard key={o.id} order={o} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outbound">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outbound / Release Orders</CardTitle>
              <CardDescription>Cargo release and delivery coordination</CardDescription>
            </CardHeader>
            <CardContent>
              {outboundOrders.length === 0 ? (
                <EmptyState message="No outbound orders." sub="Release orders authorize cargo pickup from the warehouse." />
              ) : (
                <div className="space-y-3">
                  {outboundOrders.map((o: any) => <OrderCard key={o.id} order={o} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Warehouses;
