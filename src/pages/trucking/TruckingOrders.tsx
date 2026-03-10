import { useState } from "react";
import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { MapPin, Calendar, Package, Search, ArrowRight, Weight, DollarSign, Building2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface ShipmentWithDetails {
  id: string;
  shipment_ref: string;
  origin_port: string | null;
  destination_port: string | null;
  pickup_location: string | null;
  delivery_location: string | null;
  etd: string | null;
  eta: string | null;
  status: string;
  shipment_type: string;
  created_at: string;
  pickup_instructions: string | null;
  delivery_instructions: string | null;
  cargo: Array<{
    commodity: string | null;
    gross_weight: number | null;
    volume: number | null;
    dangerous_goods: boolean;
  }>;
  containers: Array<{
    container_type: string;
    quantity: number;
  }>;
  profiles: { company_name: string | null } | null;
}

const TruckingOrders = () => {
  const [regionFilter, setRegionFilter] = useState("");

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["trucking-orders", regionFilter],
    queryFn: async () => {
      let query = supabase
        .from("shipments")
        .select(`
          id, shipment_ref, origin_port, destination_port, pickup_location, delivery_location,
          etd, eta, status, shipment_type, created_at,
          cargo (commodity, gross_weight, volume),
          containers (container_type, quantity)
        `)
        .in("status", ["draft", "booked", "in_transit"])
        .order("created_at", { ascending: false });

      if (regionFilter) {
        query = query.or(`origin_port.ilike.%${regionFilter}%,destination_port.ilike.%${regionFilter}%,pickup_location.ilike.%${regionFilter}%,delivery_location.ilike.%${regionFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ShipmentWithDetails[];
    },
  });

  return (
    <TruckingLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Available Orders</h1>
          <p className="text-sm text-muted-foreground">Browse shipments and submit your quotes</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by region (e.g., Los Angeles, USLAX)"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {shipments?.length ?? 0} orders available
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))
        ) : shipments?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No orders match your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          shipments?.map((shipment) => {
            const totalWeight = shipment.cargo?.reduce((sum, c) => sum + (c.gross_weight || 0), 0) || 0;
            const containerSummary = shipment.containers
              ?.map((c) => `${c.quantity}x ${c.container_type}`)
              .join(", ") || "TBD";
            const commodities = [...new Set(shipment.cargo?.map((c) => c.commodity).filter(Boolean))].join(", ") || "General cargo";

            return (
              <Card key={shipment.id} className="hover:border-accent/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{shipment.shipment_ref}</span>
                        <Badge variant="secondary" className="text-xs">
                          {shipment.shipment_type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            shipment.status === "booked"
                              ? "border-green-500 text-green-500"
                              : shipment.status === "in_transit"
                              ? "border-blue-500 text-blue-500"
                              : "border-muted-foreground text-muted-foreground"
                          }
                        >
                          {shipment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{commodities}</p>
                    </div>
                    <Link to={`/trucking/orders/${shipment.id}`}>
                      <Button variant="electric" size="sm">
                        View & Quote
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Origin
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {shipment.pickup_location || shipment.origin_port || "TBD"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Destination
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {shipment.delivery_location || shipment.destination_port || "TBD"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Pickup
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "TBD"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" /> Equipment
                      </p>
                      <p className="text-sm font-medium text-foreground">{containerSummary}</p>
                    </div>
                  </div>

                  {totalWeight > 0 && (
                    <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Weight className="h-3.5 w-3.5" />
                        {totalWeight.toLocaleString()} kg
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </TruckingLayout>
  );
};

export default TruckingOrders;
