import { useState } from "react";
import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { MapPin, Calendar, Package, Search, ArrowRight, Weight, Building2, AlertTriangle, Truck, Ship, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const statusFilter: Record<string, string[]> = {
  all: [],
  active: ["booked", "booking_confirmed", "in_transit"],
  available: ["draft"],
  completed: ["delivered", "closed"],
};

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  booked: "bg-blue-100 text-blue-700",
  booking_confirmed: "bg-accent/10 text-accent",
  in_transit: "bg-yellow-100 text-yellow-700",
  delivered: "bg-emerald-100 text-emerald-700",
  closed: "bg-muted text-muted-foreground",
};

const TruckingOrders = () => {
  const { user } = useAuth();
  const [regionFilter, setRegionFilter] = useState("");
  const [tab, setTab] = useState("all");

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["trucking-orders", regionFilter, tab],
    queryFn: async () => {
      let query = supabase
        .from("shipments")
        .select(`
          id, shipment_ref, origin_port, destination_port, pickup_location, delivery_location,
          etd, eta, status, shipment_type, mode, created_at, pickup_instructions, delivery_instructions,
          cargo (commodity, gross_weight, volume, dangerous_goods),
          containers (container_type, quantity),
          shipment_parties (company_name, role)
        `)
        .order("created_at", { ascending: false });

      const statuses = statusFilter[tab];
      if (statuses && statuses.length > 0) {
        query = query.in("status", statuses);
      } else if (tab === "all") {
        query = query.in("status", ["draft", "booked", "booking_confirmed", "in_transit", "delivered"]);
      }

      if (regionFilter) {
        query = query.or(`origin_port.ilike.%${regionFilter}%,destination_port.ilike.%${regionFilter}%,pickup_location.ilike.%${regionFilter}%,delivery_location.ilike.%${regionFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <TruckingLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground">Shipment-linked trucking orders — browse and submit quotes</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by port or location…"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground self-center">{shipments?.length ?? 0} orders</span>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)
        ) : shipments?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No orders match your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          shipments?.map((shipment: any) => {
            const totalWeight = shipment.cargo?.reduce((sum: number, c: any) => sum + (c.gross_weight || 0), 0) || 0;
            const containerSummary = shipment.containers?.map((c: any) => `${c.quantity}x ${c.container_type}`).join(", ") || "TBD";
            const commodities = [...new Set(shipment.cargo?.map((c: any) => c.commodity).filter(Boolean))].join(", ") || "General cargo";
            const hasDG = shipment.cargo?.some((c: any) => c.dangerous_goods) || false;
            const isAir = shipment.mode === "air";

            return (
              <Card key={shipment.id} className="hover:border-accent/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{shipment.shipment_ref}</span>
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          {isAir ? <><Ship className="h-3 w-3" /> Air</> : <><Ship className="h-3 w-3" /> Ocean</>}
                        </Badge>
                        <Badge className={`text-[10px] ${statusColor[shipment.status] || "bg-secondary text-muted-foreground"}`}>
                          {shipment.status?.replace(/_/g, " ")}
                        </Badge>
                        {hasDG && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" /> Hazmat</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{commodities} · {containerSummary}</p>
                    </div>
                    <Link to={`/trucking/orders/${shipment.id}`}>
                      <Button variant="electric" size="sm">
                        View & Quote <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>

                  {/* Route Visual */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 mb-3">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Origin</p>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-blue-500" />
                        {shipment.pickup_location || shipment.origin_port || "TBD"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Destination</p>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-green-500" />
                        {shipment.delivery_location || shipment.destination_port || "TBD"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {shipment.etd && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> ETD: {format(new Date(shipment.etd), "MMM d")}
                      </span>
                    )}
                    {shipment.eta && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> ETA: {format(new Date(shipment.eta), "MMM d")}
                      </span>
                    )}
                    {totalWeight > 0 && (
                      <span className="flex items-center gap-1">
                        <Weight className="h-3 w-3" /> {totalWeight.toLocaleString()} kg
                      </span>
                    )}
                    {shipment.shipment_type && (
                      <Badge variant="outline" className="text-[10px]">{shipment.shipment_type}</Badge>
                    )}
                  </div>
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
