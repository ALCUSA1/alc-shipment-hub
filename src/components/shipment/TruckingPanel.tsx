import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Calendar, Package, User, Phone } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface TruckingPanelProps {
  shipmentId: string;
}

const statusStyle: Record<string, string> = {
  scheduled: "bg-accent/10 text-accent",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-destructive/10 text-destructive",
};

export function TruckingPanel({ shipmentId }: TruckingPanelProps) {
  const { data: pickups, isLoading } = useQuery({
    queryKey: ["truck_pickups", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("truck_pickups")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shipmentId,
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!pickups || pickups.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4 text-accent" />
          Truck Pickups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pickups.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-medium text-foreground">
                  {p.pickup_location || "No pickup location"}
                </span>
                {p.delivery_location && (
                  <span className="text-sm text-muted-foreground">
                    → {p.delivery_location}
                  </span>
                )}
              </div>
              <Badge
                className={statusStyle[p.status] || "bg-secondary text-muted-foreground"}
                variant="secondary"
              >
                {p.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
              {p.pickup_date && (
                <Row
                  icon={<Calendar className="h-3 w-3" />}
                  label="Pickup Date"
                  value={`${format(new Date(p.pickup_date), "MMM d, yyyy")}${p.pickup_time ? ` at ${p.pickup_time}` : ""}`}
                />
              )}
              {p.container_type && (
                <Row
                  icon={<Package className="h-3 w-3" />}
                  label="Container"
                  value={p.container_type}
                />
              )}
              {p.driver_name && (
                <Row
                  icon={<User className="h-3 w-3" />}
                  label="Driver"
                  value={p.driver_name}
                />
              )}
              {p.driver_phone && (
                <Row
                  icon={<Phone className="h-3 w-3" />}
                  label="Driver Phone"
                  value={p.driver_phone}
                />
              )}
              {p.truck_plate && (
                <Row
                  icon={<Truck className="h-3 w-3" />}
                  label="Truck Plate"
                  value={p.truck_plate}
                />
              )}
              {p.cargo_description && (
                <Row
                  icon={<Package className="h-3 w-3" />}
                  label="Cargo"
                  value={p.cargo_description}
                />
              )}
            </div>

            {p.notes && (
              <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                {p.notes}
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
