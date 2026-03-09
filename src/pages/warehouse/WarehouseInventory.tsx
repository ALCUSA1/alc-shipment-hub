import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Boxes, MapPin, Calendar } from "lucide-react";
import { differenceInDays } from "date-fns";

const WarehouseInventory = () => {
  const { user } = useAuth();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["warehouse-inventory", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_orders")
        .select("*")
        .eq("warehouse_user_id", user!.id)
        .in("status", ["confirmed", "in_progress"])
        .order("storage_start_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <WarehouseLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <p className="text-sm text-muted-foreground">Cargo currently stored in your facility</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Boxes className="h-4 w-4 text-accent" />
            Current Storage ({items.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Boxes className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No cargo in storage.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Cargo</th>
                    <th className="pb-2 pr-4 font-medium">Zone / Bay</th>
                    <th className="pb-2 pr-4 font-medium">Packages</th>
                    <th className="pb-2 pr-4 font-medium">Weight</th>
                    <th className="pb-2 pr-4 font-medium">Days Stored</th>
                    <th className="pb-2 pr-4 font-medium">Rate/Day</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => {
                    const days = item.storage_start_date
                      ? differenceInDays(new Date(), new Date(item.storage_start_date))
                      : 0;
                    return (
                      <tr key={item.id} className="text-foreground">
                        <td className="py-3 pr-4 font-medium">{item.cargo_description || "—"}</td>
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {item.storage_zone || "—"}{item.bay_number ? ` / ${item.bay_number}` : ""}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{item.num_packages ?? "—"}</td>
                        <td className="py-3 pr-4">{item.weight ? `${item.weight} kg` : "—"}</td>
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {days}d
                          </span>
                        </td>
                        <td className="py-3 pr-4">${Number(item.storage_rate_per_day || 0).toFixed(2)}</td>
                        <td className="py-3">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            {item.status.replace(/_/g, " ")}
                          </Badge>
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

export default WarehouseInventory;
