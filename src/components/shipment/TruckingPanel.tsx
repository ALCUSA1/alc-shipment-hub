import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, MapPin, Calendar, Package, User, Phone, Plus, Loader2, Check, X, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { CarrierSelectDialog } from "./CarrierSelectDialog";

interface TruckingPanelProps {
  shipmentId: string;
}

const statusStyle: Record<string, string> = {
  scheduled: "bg-accent/10 text-accent",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-destructive/10 text-destructive",
  available: "bg-blue-100 text-blue-700",
  assigned: "bg-accent/10 text-accent",
  en_route: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
};

export function TruckingPanel({ shipmentId }: TruckingPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [requesting, setRequesting] = useState(false);
  const [carrierDialogOpen, setCarrierDialogOpen] = useState(false);

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

  const { data: driverAssignments } = useQuery({
    queryKey: ["driver_assignments_panel", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_assignments")
        .select("id, status, driver_name, driver_phone, truck_plate, pickup_address, delivery_address, status_updated_at")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!shipmentId,
  });

  const { data: truckingQuotes } = useQuery({
    queryKey: ["trucking_quotes_panel", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trucking_quotes")
        .select("id, status, price, company_name, driver_name, equipment_type, pickup_date, pickup_time, notes, currency, created_at")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!shipmentId,
  });

  const updateQuoteStatus = useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: string }) => {
      const { error } = await supabase
        .from("trucking_quotes")
        .update({ status })
        .eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["trucking_quotes_panel", shipmentId] });
      toast({ title: status === "accepted" ? "Quote accepted" : "Quote rejected" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  const handleSendToCarrier = async (carrier: { user_id: string; full_name: string | null; company_name: string | null }, instructions: string) => {
    if (!user) return;
    // Get shipment details for pre-filling
    const { data: shipment } = await supabase
      .from("shipments")
      .select("origin_port, pickup_location, destination_port, delivery_location")
      .eq("id", shipmentId)
      .single();

    const notes = [
      `Pickup: ${shipment?.pickup_location || shipment?.origin_port || "TBD"} → Delivery: ${shipment?.delivery_location || shipment?.destination_port || "TBD"}`,
      instructions ? `Instructions: ${instructions}` : "",
    ].filter(Boolean).join("\n");

    const { error } = await supabase.from("trucking_quotes").insert({
      shipment_id: shipmentId,
      trucker_user_id: carrier.user_id,
      company_name: carrier.company_name || carrier.full_name || null,
      price: 0,
      status: "available",
      notes,
    });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["trucking_quotes_panel", shipmentId] });
    toast({ title: "Order sent to carrier", description: `Trucking order sent to ${carrier.company_name || carrier.full_name || "carrier"}.` });
  };

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const hasPickups = pickups && pickups.length > 0;
  const hasDrivers = driverAssignments && driverAssignments.length > 0;
  const hasQuotes = truckingQuotes && truckingQuotes.length > 0;
  const hasAny = hasPickups || hasDrivers || hasQuotes;

  if (!hasAny) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4 text-accent" />
            Trucking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">No trucking arranged for this shipment.</p>
            <Button variant="outline" onClick={() => setCarrierDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Send to Carrier
            </Button>
          </div>
          <CarrierSelectDialog open={carrierDialogOpen} onOpenChange={setCarrierDialogOpen} onSelect={handleSendToCarrier} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4 text-accent" />
            Trucking
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setCarrierDialogOpen(true)} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Send to Carrier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Driver Assignments */}
        {hasDrivers && driverAssignments!.map((da) => (
          <div key={da.id} className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-medium text-foreground">{da.driver_name || "Assigned Driver"}</span>
              </div>
              <Badge className={statusStyle[da.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                {da.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
              {da.pickup_address && <Row icon={<MapPin className="h-3 w-3" />} label="Pickup" value={da.pickup_address} />}
              {da.delivery_address && <Row icon={<MapPin className="h-3 w-3" />} label="Delivery" value={da.delivery_address} />}
              {da.driver_phone && <Row icon={<Phone className="h-3 w-3" />} label="Phone" value={da.driver_phone} />}
              {da.truck_plate && <Row icon={<Truck className="h-3 w-3" />} label="Plate" value={da.truck_plate} />}
            </div>
          </div>
        ))}

        {/* Trucking Quotes */}
        {hasQuotes && !hasDrivers && truckingQuotes!.map((tq) => (
          <div key={tq.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-medium text-foreground">
                  {tq.company_name || "Carrier Quote"}
                </span>
              </div>
              <Badge className={statusStyle[tq.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                {tq.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
              {tq.price > 0 && (
                <Row icon={<DollarSign className="h-3 w-3" />} label="Price" value={`$${Number(tq.price).toLocaleString()} ${tq.currency || "USD"}`} />
              )}
              {tq.driver_name && <Row icon={<User className="h-3 w-3" />} label="Driver" value={tq.driver_name} />}
              {tq.equipment_type && <Row icon={<Truck className="h-3 w-3" />} label="Equipment" value={tq.equipment_type} />}
              {tq.pickup_date && (
                <Row icon={<Calendar className="h-3 w-3" />} label="Pickup" value={`${format(new Date(tq.pickup_date), "MMM d, yyyy")}${tq.pickup_time ? ` at ${tq.pickup_time}` : ""}`} />
              )}
            </div>

            {tq.notes && <p className="text-xs text-muted-foreground border-t pt-2">{tq.notes}</p>}

            {tq.status === "submitted" && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="electric"
                  className="text-xs"
                  disabled={updateQuoteStatus.isPending}
                  onClick={() => updateQuoteStatus.mutate({ quoteId: tq.id, status: "accepted" })}
                >
                  <Check className="h-3 w-3 mr-1" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  disabled={updateQuoteStatus.isPending}
                  onClick={() => updateQuoteStatus.mutate({ quoteId: tq.id, status: "rejected" })}
                >
                  <X className="h-3 w-3 mr-1" /> Reject
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Legacy Truck Pickups */}
        {hasPickups && !hasDrivers && !hasQuotes && pickups!.map((p) => (
          <div key={p.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-medium text-foreground">{p.pickup_location || "No pickup location"}</span>
                {p.delivery_location && <span className="text-sm text-muted-foreground">→ {p.delivery_location}</span>}
              </div>
              <Badge className={statusStyle[p.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                {p.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
              {p.pickup_date && (
                <Row icon={<Calendar className="h-3 w-3" />} label="Pickup Date"
                  value={`${format(new Date(p.pickup_date), "MMM d, yyyy")}${p.pickup_time ? ` at ${p.pickup_time}` : ""}`} />
              )}
              {p.container_type && <Row icon={<Package className="h-3 w-3" />} label="Container" value={p.container_type} />}
              {p.driver_name && <Row icon={<User className="h-3 w-3" />} label="Driver" value={p.driver_name} />}
              {p.driver_phone && <Row icon={<Phone className="h-3 w-3" />} label="Phone" value={p.driver_phone} />}
              {p.truck_plate && <Row icon={<Truck className="h-3 w-3" />} label="Plate" value={p.truck_plate} />}
            </div>
            {p.notes && <p className="text-xs text-muted-foreground border-t pt-2 mt-2">{p.notes}</p>}
          </div>
        ))}
        <CarrierSelectDialog open={carrierDialogOpen} onOpenChange={setCarrierDialogOpen} onSelect={handleSendToCarrier} />
      </CardContent>
    </Card>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
