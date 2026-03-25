import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackageOpen, Package, Weight, Box, Check, X, Lock, Ship, MapPin, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WarehouseInbound = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["warehouse-inbound", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_orders")
        .select("*, shipments!warehouse_orders_shipment_id_fkey(shipment_ref, origin_port, destination_port)")
        .eq("warehouse_user_id", user!.id)
        .eq("order_type", "receiving")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "confirmed") updates.actual_date = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("warehouse_orders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-inbound"] });
      toast({ title: "Status updated" });
    },
  });

  const statusStyle: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-accent/10 text-accent",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    rejected: "bg-destructive/10 text-destructive",
    cancelled: "bg-destructive/10 text-destructive",
  };

  // Statuses where no further actions are allowed
  const isFinalStatus = (status: string) => ["completed", "rejected", "cancelled"].includes(status);

  return (
    <WarehouseLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Inbound Orders</h1>
        <p className="text-sm text-muted-foreground">Receiving orders — confirm arrival and log cargo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PackageOpen className="h-4 w-4 text-accent" />
            Receiving Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <PackageOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No inbound orders.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {order.cargo_description || "Incoming cargo"}
                        </p>
                        {(order as any).shipments?.shipment_ref && (
                          <Badge variant="outline" className="text-[10px]">
                            <Ship className="h-3 w-3 mr-1" /> {(order as any).shipments.shipment_ref}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {order.num_packages && (
                          <span className="flex items-center gap-1"><Package className="h-3 w-3" />{order.num_packages} pkgs</span>
                        )}
                        {order.weight && (
                          <span className="flex items-center gap-1"><Weight className="h-3 w-3" />{order.weight} kg</span>
                        )}
                        {order.volume && (
                          <span className="flex items-center gap-1"><Box className="h-3 w-3" />{order.volume} CBM</span>
                        )}
                        {order.expected_date && <span>Expected: {order.expected_date}</span>}
                      </div>
                    </div>
                    <Badge className={statusStyle[order.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  {order.handling_instructions && (
                    <p className="text-xs text-muted-foreground border-t pt-2">{order.handling_instructions}</p>
                  )}

                  {/* Action buttons — only for actionable states */}
                  {order.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: order.id, status: "confirmed" })}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Accept & Confirm Receipt
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: order.id, status: "rejected" })}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                  {order.status === "confirmed" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: order.id, status: "completed" })}
                      >
                        Mark Completed
                      </Button>
                    </div>
                  )}
                  {isFinalStatus(order.status) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1 border-t">
                      <Lock className="h-3 w-3" /> No further actions — order is {order.status}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </WarehouseLayout>
  );
};

export default WarehouseInbound;
