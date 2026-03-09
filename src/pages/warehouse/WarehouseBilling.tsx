import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WarehouseBilling = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["warehouse-billing", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_orders")
        .select("*")
        .eq("warehouse_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markInvoiced = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("warehouse_orders")
        .update({ billing_status: "invoiced" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-billing"] });
      toast({ title: "Marked as invoiced" });
    },
  });

  const billableOrders = orders.filter((o) => (Number(o.handling_fee) || 0) + (Number(o.total_storage_charges) || 0) > 0);
  const totalUnbilled = billableOrders
    .filter((o) => o.billing_status === "unbilled")
    .reduce((sum, o) => sum + (Number(o.handling_fee) || 0) + (Number(o.total_storage_charges) || 0), 0);

  const billingStyle: Record<string, string> = {
    unbilled: "bg-yellow-100 text-yellow-700",
    invoiced: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
  };

  return (
    <WarehouseLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Handling fees and storage charges</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Unbilled</p>
              <p className="text-2xl font-bold text-foreground">${totalUnbilled.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-accent" />
            Billable Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : billableOrders.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No billable orders yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Order</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Handling Fee</th>
                    <th className="pb-2 pr-4 font-medium">Storage Charges</th>
                    <th className="pb-2 pr-4 font-medium">Total</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {billableOrders.map((order) => {
                    const handling = Number(order.handling_fee) || 0;
                    const storage = Number(order.total_storage_charges) || 0;
                    return (
                      <tr key={order.id} className="text-foreground">
                        <td className="py-3 pr-4 font-medium">{order.cargo_description || "Order"}</td>
                        <td className="py-3 pr-4 capitalize">{order.order_type}</td>
                        <td className="py-3 pr-4">${handling.toFixed(2)}</td>
                        <td className="py-3 pr-4">${storage.toFixed(2)}</td>
                        <td className="py-3 pr-4 font-semibold">${(handling + storage).toFixed(2)}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary" className={billingStyle[order.billing_status] || ""}>
                            {order.billing_status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          {order.billing_status === "unbilled" && (
                            <Button size="sm" variant="outline" onClick={() => markInvoiced.mutate(order.id)}>
                              Mark Invoiced
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </WarehouseLayout>
  );
};

export default WarehouseBilling;
