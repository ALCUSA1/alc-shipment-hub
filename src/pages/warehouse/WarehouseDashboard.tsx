import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { PackageOpen, Boxes, PackageCheck, DollarSign, Clock, FileText, Ship, MapPin, ArrowRight, Truck, Calendar, Info, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const WarehouseDashboard = () => {
  const { user } = useAuth();

  const { data: orders = [] } = useQuery({
    queryKey: ["warehouse-orders-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_orders")
        .select("*, shipments!warehouse_orders_shipment_id_fkey(shipment_ref, origin_port, destination_port, status)")
        .eq("warehouse_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const inboundPending = orders.filter((o) => o.order_type === "receiving" && ["pending", "confirmed"].includes(o.status));
  const outboundPending = orders.filter((o) => o.order_type === "release" && ["pending", "in_progress"].includes(o.status));
  const inStorage = orders.filter((o) => o.status === "in_progress" || o.status === "confirmed");
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = orders.filter((o) => o.expected_date === todayStr);

  const stats = [
    { label: "Inbound Cargo", value: inboundPending.length, icon: PackageOpen, color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
    { label: "Outbound / Release", value: outboundPending.length, icon: PackageCheck, color: "text-orange-600", bgColor: "bg-orange-500/10" },
    { label: "In Storage", value: inStorage.length, icon: Boxes, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "Today's Appointments", value: todayAppointments.length, icon: Calendar, color: "text-blue-600", bgColor: "bg-blue-500/10" },
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
      {/* Role responsibility banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/20 mb-6">
        <Warehouse className="h-5 w-5 text-accent mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">You are responsible for cargo handling and release</p>
          <p className="text-xs text-muted-foreground">Manage inbound receiving, storage operations, and coordinate with trucking companies for cargo pickup.</p>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground">Warehouse operations at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
                <div className={cn("p-3 rounded-lg", s.bgColor)}>
                  <s.icon className={cn("h-5 w-5", s.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inbound Cargo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageOpen className="h-4 w-4 text-yellow-600" />
              Inbound Cargo (Expected Arrivals)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inboundPending.length === 0 ? (
              <div className="text-center py-8">
                <PackageOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pending inbound cargo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inboundPending.slice(0, 5).map((order: any) => {
                  const shipment = order.shipments;
                  return (
                    <Link key={order.id} to="/warehouse/inbound" className="block">
                      <div className="p-3 rounded-lg border hover:border-accent/50 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{order.cargo_description || "Incoming cargo"}</span>
                            {shipment?.shipment_ref && (
                              <Badge variant="outline" className="text-[10px]">
                                <Ship className="h-3 w-3 mr-1" />{shipment.shipment_ref}
                              </Badge>
                            )}
                          </div>
                          <Badge className={cn("text-[10px]", statusStyle[order.status])} variant="secondary">
                            {order.status}
                          </Badge>
                        </div>
                        {order.expected_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Expected: {order.expected_date}
                          </p>
                        )}
                        {order.trucking_company_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Truck className="h-3 w-3" /> Arriving via: {order.trucking_company_name}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outbound / Release */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-orange-600" />
              Outbound Cargo (Ready for Pickup)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outboundPending.length === 0 ? (
              <div className="text-center py-8">
                <PackageCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pending releases.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {outboundPending.slice(0, 5).map((order: any) => {
                  const shipment = order.shipments;
                  return (
                    <Link key={order.id} to="/warehouse/releases" className="block">
                      <div className="p-3 rounded-lg border hover:border-accent/50 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{order.cargo_description || "Release order"}</span>
                            {shipment?.shipment_ref && (
                              <Badge variant="outline" className="text-[10px]">
                                <Ship className="h-3 w-3 mr-1" />{shipment.shipment_ref}
                              </Badge>
                            )}
                          </div>
                          <Badge className={cn("text-[10px]", statusStyle[order.status])} variant="secondary">
                            {order.status?.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        {order.release_to_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Truck className="h-3 w-3" /> Pickup by: {order.release_to_name}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
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
              <Link to="/warehouse/inbound" className="block">
                <div className="p-4 rounded-lg border border-dashed hover:border-accent/50 transition-colors text-center">
                  <PackageOpen className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Process Inbound</p>
                  <p className="text-[10px] text-muted-foreground">Confirm cargo arrivals and log receiving</p>
                </div>
              </Link>
              <Link to="/warehouse/releases" className="block">
                <div className="p-4 rounded-lg border border-dashed hover:border-accent/50 transition-colors text-center">
                  <PackageCheck className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Process Releases</p>
                  <p className="text-[10px] text-muted-foreground">Authorize and confirm cargo release</p>
                </div>
              </Link>
              <Link to="/warehouse/documents" className="block">
                <div className="p-4 rounded-lg border border-dashed hover:border-accent/50 transition-colors text-center">
                  <FileText className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Upload Documents</p>
                  <p className="text-[10px] text-muted-foreground">Submit receiving and release documents</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </WarehouseLayout>
  );
};

export default WarehouseDashboard;
