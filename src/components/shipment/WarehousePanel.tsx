import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Warehouse, MapPin, Package, Weight, Box, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface WarehousePanelProps {
  shipmentId: string;
}

const statusStyle: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-accent/10 text-accent",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-destructive/10 text-destructive",
};

export function WarehousePanel({ shipmentId }: WarehousePanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["warehouse_orders", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_orders")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!shipmentId,
  });

  // Fallback: also check legacy warehouse_operations
  const { data: legacyOps } = useQuery({
    queryKey: ["warehouse_operations", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_operations")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data;
    },
    enabled: !!shipmentId && (!orders || orders.length === 0),
  });

  const handleRequestReceiving = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("warehouse_orders").insert({
        shipment_id: shipmentId,
        order_type: "receiving",
        status: "pending",
        requester_user_id: user.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["warehouse_orders", shipmentId] });
      toast({ title: "Warehouse receiving requested", description: "Your warehouse partner will be notified." });
    } catch (err: any) {
      toast({ title: "Request failed", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const hasOrders = orders && orders.length > 0;
  const hasLegacy = legacyOps && legacyOps.length > 0 && !hasOrders;

  if (!hasOrders && !hasLegacy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-accent" />
            Warehouse Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">No warehouse orders yet for this shipment.</p>
            <Button variant="outline" onClick={handleRequestReceiving} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Request Warehouse Receiving
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayItems = hasOrders ? (orders || []).map(o => ({
    id: o.id,
    name: "Warehouse Order",
    location: o.storage_zone ? `Zone ${o.storage_zone}${o.bay_number ? ` / Bay ${o.bay_number}` : ""}` : null,
    status: o.status,
    type: o.order_type,
    cargo: o.cargo_description,
    packages: o.num_packages,
    weight: o.weight,
    volume: o.volume,
    notes: o.notes,
    instructions: o.handling_instructions || o.storage_instructions,
  })) : (legacyOps || []).map(o => ({
    id: o.id,
    name: o.warehouse_name || "Unnamed warehouse",
    location: o.warehouse_location,
    status: o.status,
    type: o.operation_type,
    cargo: o.cargo_description,
    packages: o.num_packages,
    weight: o.weight,
    volume: o.volume,
    notes: o.notes,
    instructions: o.storage_instructions,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-accent" />
            Warehouse Operations
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRequestReceiving} disabled={creating} className="text-xs">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            New Order
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayItems.map((op) => (
          <div key={op.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-medium text-foreground">{op.name}</span>
                {op.location && <span className="text-sm text-muted-foreground">— {op.location}</span>}
              </div>
              <Badge className={statusStyle[op.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                {op.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
              <Row icon={<Box className="h-3 w-3" />} label="Type" value={op.type.charAt(0).toUpperCase() + op.type.slice(1)} />
              {op.cargo && <Row icon={<Package className="h-3 w-3" />} label="Cargo" value={op.cargo} />}
              {op.packages && <Row icon={<Package className="h-3 w-3" />} label="Packages" value={`${op.packages}`} />}
              {op.weight && <Row icon={<Weight className="h-3 w-3" />} label="Weight" value={`${op.weight} kg`} />}
              {op.volume && <Row icon={<Box className="h-3 w-3" />} label="Volume" value={`${op.volume} CBM`} />}
              {op.instructions && <Row icon={<Warehouse className="h-3 w-3" />} label="Instructions" value={op.instructions} />}
            </div>
            {op.notes && <p className="text-xs text-muted-foreground border-t pt-2 mt-2">{op.notes}</p>}
          </div>
        ))}
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
