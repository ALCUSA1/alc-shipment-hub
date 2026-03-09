import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Navigation, Package, FileText, ChevronLeft, AlertCircle } from "lucide-react";

const STATUS_FLOW = ["assigned", "en_route", "arrived", "loaded", "in_transit", "delivered"] as const;

const statusLabel: Record<string, string> = {
  assigned: "Assigned",
  en_route: "En Route",
  arrived: "Arrived",
  loaded: "Loaded",
  in_transit: "In Transit",
  delivered: "Delivered",
};

const statusColors: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-700",
  en_route: "bg-amber-100 text-amber-700",
  arrived: "bg-purple-100 text-purple-700",
  loaded: "bg-indigo-100 text-indigo-700",
  in_transit: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
};

const nextActionLabel: Record<string, string> = {
  assigned: "Start – En Route",
  en_route: "Mark Arrived",
  arrived: "Mark Loaded",
  loaded: "Start Transit",
  in_transit: "Mark Delivered",
};

function getGoogleMapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

const DriverAssignmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["driver-assignment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_assignments")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("driver_assignments")
        .update({ status: newStatus, status_updated_at: new Date().toISOString() })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-assignment", id] });
      queryClient.invalidateQueries({ queryKey: ["driver-assignments"] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const currentIdx = STATUS_FLOW.indexOf(assignment?.status as any);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  if (isLoading) {
    return (
      <DriverLayout>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </DriverLayout>
    );
  }

  if (!assignment) {
    return (
      <DriverLayout>
        <div className="text-center py-16">
          <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Assignment not found.</p>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <button
        onClick={() => navigate("/driver")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Jobs
      </button>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-foreground">
          {assignment.truck_plate || "Job Details"}
        </h1>
        <Badge className={statusColors[assignment.status] || "bg-secondary"} variant="secondary">
          {statusLabel[assignment.status] || assignment.status}
        </Badge>
      </div>

      {/* Status progress */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STATUS_FLOW.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full min-w-[32px] ${
              i <= currentIdx ? "bg-accent" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Pickup */}
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-500" /> Pickup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-foreground">{assignment.pickup_address || "Address not set"}</p>
          {assignment.pickup_contact_name && (
            <p className="text-xs text-muted-foreground">{assignment.pickup_contact_name}</p>
          )}
          <div className="flex gap-2 pt-1">
            {assignment.pickup_address && (
              <Button size="sm" variant="electric" className="flex-1" asChild>
                <a href={getGoogleMapsUrl(assignment.pickup_address)} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-4 w-4" /> Navigate
                </a>
              </Button>
            )}
            {assignment.pickup_contact_phone && (
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <a href={`tel:${assignment.pickup_contact_phone}`}>
                  <Phone className="h-4 w-4" /> Call
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery */}
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-500" /> Delivery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-foreground">{assignment.delivery_address || "Address not set"}</p>
          {assignment.delivery_contact_name && (
            <p className="text-xs text-muted-foreground">{assignment.delivery_contact_name}</p>
          )}
          <div className="flex gap-2 pt-1">
            {assignment.delivery_address && (
              <Button size="sm" variant="electric" className="flex-1" asChild>
                <a href={getGoogleMapsUrl(assignment.delivery_address)} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-4 w-4" /> Navigate
                </a>
              </Button>
            )}
            {assignment.delivery_contact_phone && (
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <a href={`tel:${assignment.delivery_contact_phone}`}>
                  <Phone className="h-4 w-4" /> Call
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cargo details */}
      {(assignment.container_numbers?.length > 0 || assignment.instructions) && (
        <Card className="mb-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" /> Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignment.container_numbers?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Containers</p>
                <div className="flex flex-wrap gap-1">
                  {assignment.container_numbers.map((c: string) => (
                    <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            {assignment.instructions && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Instructions</p>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50">
                  <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <p className="text-sm text-foreground">{assignment.instructions}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Next action */}
      {nextStatus && (
        <Button
          variant="electric"
          size="lg"
          className="w-full mt-4 h-14 text-base font-semibold"
          onClick={() => updateStatus.mutate(nextStatus)}
          disabled={updateStatus.isPending}
        >
          {updateStatus.isPending ? "Updating..." : nextActionLabel[assignment.status] || "Next"}
        </Button>
      )}

      {assignment.status === "delivered" && (
        <div className="text-center py-4">
          <Badge className="bg-green-100 text-green-700 text-sm px-4 py-1.5" variant="secondary">
            ✓ Delivered
          </Badge>
        </div>
      )}
    </DriverLayout>
  );
};

export default DriverAssignmentDetail;
