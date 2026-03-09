import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { MapPin, Phone, Truck } from "lucide-react";

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

const DriverDashboard = () => {
  const { user } = useAuth();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["driver-assignments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_assignments")
        .select("*")
        .eq("driver_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const active = assignments?.filter((a) => a.status !== "delivered") || [];
  const completed = assignments?.filter((a) => a.status === "delivered") || [];

  return (
    <DriverLayout>
      <h1 className="text-xl font-bold text-foreground mb-1">My Jobs</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {active.length} active assignment{active.length !== 1 ? "s" : ""}
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : active.length === 0 && completed.length === 0 ? (
        <div className="text-center py-16">
          <Truck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No assignments yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your dispatcher will assign jobs to you here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active</h2>
              {active.map((a) => (
                <AssignmentCard key={a.id} assignment={a} />
              ))}
            </div>
          )}
          {completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Completed</h2>
              {completed.slice(0, 5).map((a) => (
                <AssignmentCard key={a.id} assignment={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </DriverLayout>
  );
};

function AssignmentCard({ assignment }: { assignment: any }) {
  return (
    <Link
      to={`/driver/job/${assignment.id}`}
      className="block p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-semibold text-foreground text-sm">
          {assignment.truck_plate || "Job"}
        </span>
        <Badge className={statusColors[assignment.status] || "bg-secondary"} variant="secondary">
          {statusLabel[assignment.status] || assignment.status}
        </Badge>
      </div>

      {assignment.pickup_address && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground mb-1">
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
          <span className="line-clamp-1">{assignment.pickup_address}</span>
        </div>
      )}
      {assignment.delivery_address && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground mb-1">
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-500" />
          <span className="line-clamp-1">{assignment.delivery_address}</span>
        </div>
      )}

      {assignment.pickup_contact_phone && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <Phone className="h-3 w-3" />
          <span>{assignment.pickup_contact_name || "Contact"}</span>
        </div>
      )}
    </Link>
  );
}

export default DriverDashboard;
