import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Users, MapPin, Truck } from "lucide-react";

const statusColors: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-700",
  en_route: "bg-amber-100 text-amber-700",
  arrived: "bg-purple-100 text-purple-700",
  loaded: "bg-indigo-100 text-indigo-700",
  in_transit: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
};

const statusLabel: Record<string, string> = {
  assigned: "Assigned",
  en_route: "En Route",
  arrived: "Arrived",
  loaded: "Loaded",
  in_transit: "In Transit",
  delivered: "Delivered",
};

const TruckingAssignments = () => {
  const { user } = useAuth();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["trucking-assignments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_assignments")
        .select("*")
        .eq("assigned_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <TruckingLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Driver Assignments</h1>
        <p className="text-sm text-muted-foreground">Track drivers assigned to your accepted jobs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            All Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : assignments?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No driver assignments yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Assign drivers from your accepted quotes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments?.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {a.driver_name || "Unassigned"}
                      </span>
                      <Badge className={statusColors[a.status] || "bg-secondary"} variant="secondary">
                        {statusLabel[a.status] || a.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {a.truck_plate && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" /> {a.truck_plate}
                        </span>
                      )}
                      {a.pickup_address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {a.pickup_address.slice(0, 30)}…
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {format(new Date(a.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TruckingLayout>
  );
};

export default TruckingAssignments;
