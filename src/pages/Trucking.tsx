import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Truck, Plus, MapPin, Calendar, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface PickupRow {
  id: string;
  pickup_location: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  driver_name: string | null;
  container_type: string | null;
  cargo_description: string | null;
  delivery_location: string | null;
  status: string;
  shipment_id: string;
  created_at: string;
}

const statusStyle: Record<string, string> = {
  scheduled: "bg-accent/10 text-accent",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-destructive/10 text-destructive",
};

const Trucking = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pickups, setPickups] = useState<PickupRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("truck_pickups")
        .select("*")
        .order("created_at", { ascending: false });
      setPickups((data as PickupRow[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trucking</h1>
            <p className="text-sm text-muted-foreground">Manage truck pickup and delivery operations</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Truck Pickups</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : pickups.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No truck pickups yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Truck pickups are created from the shipment detail page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pickups.map((p) => (
                <Link
                  key={p.id}
                  to={`/dashboard/shipments/${p.shipment_id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                      <span className="text-sm font-medium text-foreground">{p.pickup_location || "No location"}</span>
                      {p.delivery_location && (
                        <span className="text-sm text-muted-foreground">→ {p.delivery_location}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {p.pickup_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(p.pickup_date), "MMM d, yyyy")}
                          {p.pickup_time && ` at ${p.pickup_time}`}
                        </span>
                      )}
                      {p.container_type && (
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {p.container_type}
                        </span>
                      )}
                      {p.driver_name && <span>Driver: {p.driver_name}</span>}
                    </div>
                  </div>
                  <Badge className={statusStyle[p.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                    {p.status}
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

export default Trucking;
