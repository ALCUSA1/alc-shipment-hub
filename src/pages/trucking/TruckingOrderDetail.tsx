import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { MapPin, Calendar, Package, ArrowLeft, Truck, User, Phone, DollarSign } from "lucide-react";

const TruckingOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [price, setPrice] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [truckPlate, setTruckPlate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: shipment, isLoading } = useQuery({
    queryKey: ["trucking-order-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select(`
          *,
          cargo (commodity, gross_weight, volume, hs_code, country_of_origin, num_packages, package_type),
          containers (container_type, quantity, container_number)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: existingQuote } = useQuery({
    queryKey: ["my-quote", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trucking_quotes")
        .select("*")
        .eq("shipment_id", id!)
        .eq("trucker_user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const submitQuote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("trucking_quotes").insert({
        shipment_id: id!,
        trucker_user_id: user!.id,
        price: parseFloat(price),
        pickup_date: pickupDate || null,
        pickup_time: pickupTime || null,
        equipment_type: equipmentType || null,
        driver_name: driverName || null,
        driver_phone: driverPhone || null,
        truck_plate: truckPlate || null,
        notes: notes || null,
        status: "submitted",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Quote submitted", description: "Your quote has been sent to the shipper." });
      queryClient.invalidateQueries({ queryKey: ["my-quote", id] });
      queryClient.invalidateQueries({ queryKey: ["trucking-stats"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <TruckingLayout>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </TruckingLayout>
    );
  }

  if (!shipment) {
    return (
      <TruckingLayout>
        <p className="text-muted-foreground">Order not found.</p>
      </TruckingLayout>
    );
  }

  const totalWeight = shipment.cargo?.reduce((sum: number, c: any) => sum + (c.gross_weight || 0), 0) || 0;

  return (
    <TruckingLayout>
      <Button variant="ghost" size="sm" onClick={() => navigate("/trucking/orders")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Orders
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{shipment.shipment_ref}</h1>
          <p className="text-sm text-muted-foreground">
            {shipment.shipment_type} shipment • Created {format(new Date(shipment.created_at), "MMM d, yyyy")}
          </p>
        </div>
        <Badge variant="outline">{shipment.status}</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                Route Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pickup Location</p>
                <p className="font-medium text-foreground">{shipment.pickup_location || shipment.origin_port || "TBD"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Delivery Location</p>
                <p className="font-medium text-foreground">{shipment.delivery_location || shipment.destination_port || "TBD"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">ETD</p>
                <p className="font-medium text-foreground">
                  {shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "TBD"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">ETA</p>
                <p className="font-medium text-foreground">
                  {shipment.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "TBD"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-accent" />
                Cargo Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipment.cargo?.length > 0 ? (
                <div className="space-y-3">
                  {shipment.cargo.map((cargo: any, idx: number) => (
                    <div key={idx} className="p-3 bg-secondary/50 rounded-lg">
                      <p className="font-medium text-foreground">{cargo.commodity || "General cargo"}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-sm text-muted-foreground">
                        {cargo.gross_weight && <span>Weight: {cargo.gross_weight} kg</span>}
                        {cargo.volume && <span>Volume: {cargo.volume} CBM</span>}
                        {cargo.num_packages && <span>Packages: {cargo.num_packages}</span>}
                        {cargo.hs_code && <span>HS: {cargo.hs_code}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cargo details available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-accent" />
                Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipment.containers?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {shipment.containers.map((c: any, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {c.quantity}x {c.container_type}
                      {c.container_number && ` (${c.container_number})`}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Equipment TBD</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                Submit Quote
              </CardTitle>
            </CardHeader>
            <CardContent>
              {existingQuote ? (
                <div className="space-y-4">
                  <div className="p-4 bg-accent/10 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Your Quote</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${Number(existingQuote.price).toLocaleString()}
                    </p>
                    <Badge
                      className="mt-2"
                      variant={
                        existingQuote.status === "accepted"
                          ? "default"
                          : existingQuote.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {existingQuote.status}
                    </Badge>
                  </div>
                  {existingQuote.pickup_date && (
                    <p className="text-sm text-muted-foreground">
                      Pickup: {format(new Date(existingQuote.pickup_date), "MMM d, yyyy")}
                      {existingQuote.pickup_time && ` at ${existingQuote.pickup_time}`}
                    </p>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitQuote.mutate();
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="price">Price (USD) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="pickupDate">Pickup Date</Label>
                      <Input
                        id="pickupDate"
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pickupTime">Time</Label>
                      <Input
                        id="pickupTime"
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="equipment">Equipment Type</Label>
                    <Input
                      id="equipment"
                      value={equipmentType}
                      onChange={(e) => setEquipmentType(e.target.value)}
                      placeholder="e.g., 53' Dry Van"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="driverName">Driver Name</Label>
                    <Input
                      id="driverName"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="John Smith"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="driverPhone">Driver Phone</Label>
                      <Input
                        id="driverPhone"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="555-0123"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="truckPlate">Truck Plate</Label>
                      <Input
                        id="truckPlate"
                        value={truckPlate}
                        onChange={(e) => setTruckPlate(e.target.value)}
                        placeholder="ABC 123"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional details..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="electric"
                    className="w-full"
                    disabled={submitQuote.isPending || !price}
                  >
                    {submitQuote.isPending ? "Submitting..." : "Submit Quote"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TruckingLayout>
  );
};

export default TruckingOrderDetail;
