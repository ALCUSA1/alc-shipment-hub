import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Warehouse, MapPin, Package, Weight, Box } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface WarehousePanelProps {
  shipmentId: string;
}

const statusStyle: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  active: "bg-accent/10 text-accent",
  in_storage: "bg-blue-100 text-blue-700",
  received: "bg-accent/10 text-accent",
  stored: "bg-blue-100 text-blue-700",
  released: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
};

export function WarehousePanel({ shipmentId }: WarehousePanelProps) {
  const { data: ops, isLoading } = useQuery({
    queryKey: ["warehouse_operations", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_operations")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shipmentId,
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!ops || ops.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-accent" />
          Warehouse Operations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ops.map((op) => (
          <div key={op.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-medium text-foreground">
                  {op.warehouse_name || "Unnamed warehouse"}
                </span>
                {op.warehouse_location && (
                  <span className="text-sm text-muted-foreground">
                    — {op.warehouse_location}
                  </span>
                )}
              </div>
              <Badge
                className={statusStyle[op.status] || "bg-secondary text-muted-foreground"}
                variant="secondary"
              >
                {op.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
              <Row
                icon={<Box className="h-3 w-3" />}
                label="Type"
                value={op.operation_type.charAt(0).toUpperCase() + op.operation_type.slice(1)}
              />
              {op.cargo_description && (
                <Row
                  icon={<Package className="h-3 w-3" />}
                  label="Cargo"
                  value={op.cargo_description}
                />
              )}
              {op.num_packages && (
                <Row
                  icon={<Package className="h-3 w-3" />}
                  label="Packages"
                  value={`${op.num_packages}`}
                />
              )}
              {op.weight && (
                <Row
                  icon={<Weight className="h-3 w-3" />}
                  label="Weight"
                  value={`${op.weight} kg`}
                />
              )}
              {op.volume && (
                <Row
                  icon={<Box className="h-3 w-3" />}
                  label="Volume"
                  value={`${op.volume} CBM`}
                />
              )}
              {op.storage_instructions && (
                <Row
                  icon={<Warehouse className="h-3 w-3" />}
                  label="Storage Instructions"
                  value={op.storage_instructions}
                />
              )}
              {op.release_authorization && (
                <Row
                  icon={<Warehouse className="h-3 w-3" />}
                  label="Release Auth"
                  value={op.release_authorization}
                />
              )}
            </div>

            {op.notes && (
              <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                {op.notes}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
