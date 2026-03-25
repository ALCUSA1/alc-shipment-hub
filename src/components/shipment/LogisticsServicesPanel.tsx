import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Warehouse, Package, MapPin, Calendar, Clock, ArrowRight, CheckCircle2, Circle, User, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const statusColor: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-700",
  scheduled: "bg-accent/10 text-accent",
  picked_up: "bg-yellow-100 text-yellow-700",
  in_transit: "bg-yellow-100 text-yellow-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  pod_uploaded: "bg-emerald-100 text-emerald-700",
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-accent/10 text-accent",
  in_progress: "bg-blue-100 text-blue-700",
  received: "bg-blue-100 text-blue-700",
  ready: "bg-accent/10 text-accent",
  released: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-destructive/10 text-destructive",
};

const fmt = (s: string) => s?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—";

/* ── Status Flow Indicators ── */
const TRUCKING_STAGES = ["assigned", "scheduled", "picked_up", "in_transit", "delivered", "pod_uploaded"];
const WAREHOUSE_STAGES = ["assigned", "scheduled", "received", "in_handling", "ready", "released"];

function StatusFlow({ stages, current }: { stages: string[]; current: string }) {
  const currentIdx = stages.indexOf(current);
  return (
    <div className="flex items-center gap-1 mt-2">
      {stages.map((stage, i) => (
        <div key={stage} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${i <= currentIdx ? "bg-accent" : "bg-border"}`} />
          {i < stages.length - 1 && <div className={`w-4 h-px ${i < currentIdx ? "bg-accent" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

interface LogisticsServicesPanelProps {
  shipmentId: string;
  shipmentRef: string;
}

export function LogisticsServicesPanel({ shipmentId, shipmentRef }: LogisticsServicesPanelProps) {
  // Fetch trucking orders linked to this shipment
  const { data: truckPickups } = useQuery({
    queryKey: ["logistics-truck-pickups", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("truck_pickups")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at");
      return data || [];
    },
    enabled: !!shipmentId,
  });

  // Fetch warehouse orders linked to this shipment
  const { data: warehouseOrders } = useQuery({
    queryKey: ["logistics-warehouse-orders", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("warehouse_orders")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at");
      return data || [];
    },
    enabled: !!shipmentId,
  });

  // Fetch trucking quotes linked to this shipment
  const { data: truckingQuotes } = useQuery({
    queryKey: ["logistics-trucking-quotes", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trucking_quotes")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at");
      return data || [];
    },
    enabled: !!shipmentId,
  });

  const hasAnyService = (truckPickups?.length || 0) > 0 || (warehouseOrders?.length || 0) > 0 || (truckingQuotes?.length || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-accent" />
            Logistics Services
          </CardTitle>
          <CardDescription>All linked services for {shipmentRef}</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAnyService ? (
            <div className="text-center py-8">
              <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No logistics services linked to this shipment yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Trucking and warehouse orders will appear here when assigned.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Origin Trucking Summary */}
              <div className={`rounded-xl border p-4 ${(truckPickups?.length || 0) > 0 ? "border-blue-500/20 bg-blue-500/5" : "border-border"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Origin Trucking</span>
                </div>
                {(truckPickups?.length || 0) > 0 ? (
                  <>
                    <Badge className={statusColor[truckPickups![0].status] || "bg-secondary"} variant="secondary">
                      {fmt(truckPickups![0].status)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">{truckPickups![0].pickup_location || "Location TBD"}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Not required</p>
                )}
              </div>

              {/* Warehouse Summary */}
              <div className={`rounded-xl border p-4 ${(warehouseOrders?.length || 0) > 0 ? "border-orange-500/20 bg-orange-500/5" : "border-border"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Warehouse className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Warehouse</span>
                </div>
                {(warehouseOrders?.length || 0) > 0 ? (
                  <>
                    <Badge className={statusColor[warehouseOrders![0].status] || "bg-secondary"} variant="secondary">
                      {fmt(warehouseOrders![0].status)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">{warehouseOrders![0].cargo_description || "Cargo TBD"}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Not required</p>
                )}
              </div>

              {/* Destination Trucking Summary */}
              <div className={`rounded-xl border p-4 ${(truckPickups || []).length > 1 ? "border-green-500/20 bg-green-500/5" : "border-border"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Dest. Trucking</span>
                </div>
                {(truckPickups || []).length > 1 ? (
                  <>
                    <Badge className={statusColor[truckPickups![1].status] || "bg-secondary"} variant="secondary">
                      {fmt(truckPickups![1].status)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">{truckPickups![1].delivery_location || "Location TBD"}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Not required</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trucking Orders Detail */}
      {(truckPickups?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" />
              Trucking Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {truckPickups!.map((pickup, idx) => (
              <div key={pickup.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {idx === 0 ? "Origin Pickup" : "Destination Delivery"}
                    </Badge>
                    <Badge className={statusColor[pickup.status] || "bg-secondary"} variant="secondary">
                      {fmt(pickup.status)}
                    </Badge>
                  </div>
                  {pickup.pickup_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(pickup.pickup_date), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                <StatusFlow stages={TRUCKING_STAGES} current={pickup.status} />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-4">
                  {pickup.pickup_location && <InfoRow label="Pickup Location" value={pickup.pickup_location} />}
                  {pickup.delivery_location && <InfoRow label="Delivery Location" value={pickup.delivery_location} />}
                  {pickup.pickup_time && <InfoRow label="Scheduled Time" value={pickup.pickup_time} />}
                  {pickup.driver_name && <InfoRow label="Assigned Driver" value={pickup.driver_name} />}
                  {pickup.container_type && <InfoRow label="Equipment" value={pickup.container_type} />}
                  {pickup.notes && <InfoRow label="Instructions" value={pickup.notes} />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trucking Quotes */}
      {(truckingQuotes?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              Trucking Quotes ({truckingQuotes!.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {truckingQuotes!.map((quote) => (
                <div key={quote.id} className="rounded-lg border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">${Number(quote.price).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{quote.notes || "No notes"}</p>
                    </div>
                  </div>
                  <Badge className={statusColor[quote.status] || "bg-secondary"} variant="secondary">
                    {fmt(quote.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warehouse Orders Detail */}
      {(warehouseOrders?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-orange-500" />
              Warehouse Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {warehouseOrders!.map((order) => (
              <div key={order.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{order.order_type}</Badge>
                    <Badge className={statusColor[order.status] || "bg-secondary"} variant="secondary">
                      {fmt(order.status)}
                    </Badge>
                  </div>
                  {order.expected_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expected: {order.expected_date}
                    </span>
                  )}
                </div>
                <StatusFlow stages={WAREHOUSE_STAGES} current={order.status} />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-4">
                  {order.cargo_description && <InfoRow label="Cargo" value={order.cargo_description} />}
                  {order.num_packages && <InfoRow label="Packages" value={`${order.num_packages}`} />}
                  {order.weight && <InfoRow label="Weight" value={`${order.weight} kg`} />}
                  {order.volume && <InfoRow label="Volume" value={`${order.volume} CBM`} />}
                  {order.storage_zone && <InfoRow label="Storage Zone" value={order.storage_zone} />}
                  {order.handling_instructions && <InfoRow label="Handling Notes" value={order.handling_instructions} />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
