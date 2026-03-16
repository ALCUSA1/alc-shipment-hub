import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Warehouse, Package, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface WarehouseRow {
  id: string;
  warehouse_name: string | null;
  warehouse_location: string | null;
  operation_type: string;
  cargo_description: string | null;
  num_packages: number | null;
  weight: number | null;
  volume: number | null;
  storage_instructions: string | null;
  status: string;
  shipment_id: string;
  created_at: string;
}

const statusStyle: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  received: "bg-accent/10 text-accent",
  stored: "bg-blue-100 text-blue-700",
  released: "bg-green-100 text-green-700",
};

const Warehouses = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<WarehouseRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("warehouse_operations")
        .select("*")
        .order("created_at", { ascending: false });
      setOperations((data as WarehouseRow[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>
          <p className="text-sm text-muted-foreground">Manage warehouse cargo handling operations</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Warehouse Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : operations.length === 0 ? (
            <div className="text-center py-12">
              <Warehouse className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No warehouse operations yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Warehouse operations are created from the shipment detail page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {operations.map((op) => (
                <Link
                  key={op.id}
                  to={`/dashboard/shipments/${op.shipment_id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                      <span className="text-sm font-medium text-foreground">{op.warehouse_name || "Unnamed warehouse"}</span>
                      {op.warehouse_location && (
                        <span className="text-sm text-muted-foreground">— {op.warehouse_location}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="capitalize">{op.operation_type}</span>
                      {op.cargo_description && <span>{op.cargo_description}</span>}
                      {op.num_packages && (
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {op.num_packages} pkgs
                        </span>
                      )}
                      {op.weight && <span>{op.weight} kg</span>}
                    </div>
                  </div>
                  <Badge className={statusStyle[op.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                    {op.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Warehouses;
