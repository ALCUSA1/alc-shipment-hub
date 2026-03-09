import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackageCheck, Phone, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WarehouseReleases = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["warehouse-releases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_orders")
        .select("*")
        .eq("warehouse_user_id", user!.id)
        .eq("order_type", "release")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "completed") {
        updates.actual_date = new Date().toISOString().split("T")[0];
        updates.storage_end_date = new Date().toISOString().split("T")[0];
      }
      const { error } = await supabase.from("warehouse_orders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-releases"] });
      toast({ title: "Release status updated" });
    },
  });

  const statusStyle: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-accent/10 text-accent",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
  };

  return (
    <WarehouseLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Release Orders</h1>
        <p className="text-sm text-muted-foreground">Process release instructions and dispatch cargo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-accent" />
            Release Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <PackageCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No release orders.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {order.cargo_description || "Release order"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {order.release_to_name && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{order.release_to_name}</span>
                        )}
                        {order.release_to_phone && (
                          <a href={`tel:${order.release_to_phone}`} className="flex items-center gap-1 text-accent hover:underline">
                            <Phone className="h-3 w-3" />{order.release_to_phone}
                          </a>
                        )}
                        {order.container_numbers?.length > 0 && (
                          <span>Containers: {order.container_numbers.join(", ")}</span>
                        )}
                      </div>
                    </div>
                    <Badge className={statusStyle[order.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                      {order.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  {order.release_authorization && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      <strong>Authorization:</strong> {order.release_authorization}
                    </p>
                  )}

                  {order.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => updateStatus.mutate({ id: order.id, status: "in_progress" })}>
                        Start Processing
                      </Button>
                    </div>
                  )}
                  {order.status === "in_progress" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => updateStatus.mutate({ id: order.id, status: "completed" })}>
                        Mark Released
                      </Button>
                    </div>
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

export default WarehouseReleases;
