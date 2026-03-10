import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  MapPin, Calendar, Package, ArrowLeft, Truck, User, Phone,
  DollarSign, Building2, Ship, FileText, AlertTriangle, Mail, Navigation, Check, X,
} from "lucide-react";

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
          cargo (commodity, gross_weight, volume, hs_code, country_of_origin, num_packages, package_type, dangerous_goods, dimensions, special_instructions),
          containers (container_type, container_size, quantity, container_number, reefer_temp, oog_dimensions),
          shipment_parties (role, company_name, contact_name, email, phone, address, city, state, postal_code, country)
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("user_id", user!.id)
        .maybeSingle();

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
        company_name: profile?.company_name || null,
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

  const parties = (shipment.shipment_parties || []) as any[];
  const shipper = parties.find((p: any) => p.role === "shipper");
  const consignee = parties.find((p: any) => p.role === "consignee");
  const notifyParty = parties.find((p: any) => p.role === "notify_party");
  const hasDG = shipment.cargo?.some((c: any) => c.dangerous_goods) || false;
  const isShipmentFinalized = ["delivered", "completed", "cancelled"].includes(shipment.status);
  const canSubmitQuote = !isShipmentFinalized && ["draft", "booked", "in_transit", "arrived", "booking_confirmed"].includes(shipment.status);

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
        <div className="flex items-center gap-2">
          {hasDG && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Hazmat
            </Badge>
          )}
          <Badge variant="outline">{shipment.status}</Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Shipper & Consignee */}
          {(shipper || consignee) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-accent" />
                  Parties
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-6">
                {shipper && <PartyBlock label="Shipper" party={shipper} />}
                {consignee && <PartyBlock label="Consignee" party={consignee} />}
                {notifyParty && <PartyBlock label="Notify Party" party={notifyParty} />}
              </CardContent>
            </Card>
          )}

          {/* Route & Pickup/Delivery Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                Route & Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
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
              </div>

              {(shipment.pickup_instructions || shipment.delivery_instructions) && (
                <>
                  <Separator />
                  <div className="grid sm:grid-cols-2 gap-4">
                    {shipment.pickup_instructions && (
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                          <Navigation className="h-3 w-3" /> Pickup Instructions
                        </p>
                        <p className="text-sm text-foreground">{shipment.pickup_instructions}</p>
                      </div>
                    )}
                    {shipment.delivery_instructions && (
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                          <Navigation className="h-3 w-3" /> Delivery Instructions
                        </p>
                        <p className="text-sm text-foreground">{shipment.delivery_instructions}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Booking / Vessel Info */}
          {(shipment.vessel || shipment.carrier || shipment.airline) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ship className="h-4 w-4 text-accent" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shipment.carrier && (
                  <InfoField label="Carrier" value={shipment.carrier} />
                )}
                {shipment.vessel && (
                  <InfoField label="Vessel" value={shipment.vessel} />
                )}
                {shipment.voyage && (
                  <InfoField label="Voyage" value={shipment.voyage} />
                )}
                {shipment.airline && (
                  <InfoField label="Airline" value={shipment.airline} />
                )}
                {shipment.flight_number && (
                  <InfoField label="Flight #" value={shipment.flight_number} />
                )}
                {shipment.incoterms && (
                  <InfoField label="Incoterm" value={shipment.incoterms} />
                )}
              </CardContent>
            </Card>
          )}

          {/* Cargo Details */}
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
                    <div key={idx} className="p-3 bg-secondary/50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{cargo.commodity || "General cargo"}</p>
                        {cargo.dangerous_goods && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" /> DG
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        {cargo.gross_weight && <span>Weight: {cargo.gross_weight} kg</span>}
                        {cargo.volume && <span>Volume: {cargo.volume} CBM</span>}
                        {cargo.num_packages && <span>Packages: {cargo.num_packages} {cargo.package_type || ""}</span>}
                        {cargo.dimensions && <span>Dims: {cargo.dimensions}</span>}
                        {cargo.hs_code && <span>HS: {cargo.hs_code}</span>}
                        {cargo.country_of_origin && <span>Origin: {cargo.country_of_origin}</span>}
                      </div>
                      {cargo.special_instructions && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-2 mt-1">
                          ⚠️ {cargo.special_instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cargo details available.</p>
              )}
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-accent" />
                Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipment.containers?.length > 0 ? (
                <div className="space-y-2">
                  {shipment.containers.map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <Badge variant="secondary">
                        {c.quantity}x {c.container_size ? `${c.container_size} ` : ""}{c.container_type}
                      </Badge>
                      {c.container_number && (
                        <span className="text-muted-foreground">#{c.container_number}</span>
                      )}
                      {c.reefer_temp && (
                        <Badge variant="outline" className="text-xs">Temp: {c.reefer_temp}</Badge>
                      )}
                      {c.oog_dimensions && (
                        <Badge variant="outline" className="text-xs">OOG: {c.oog_dimensions}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Equipment TBD</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quote Panel */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                {isShipmentFinalized ? "Quote Summary" : "Submit Quote"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isShipmentFinalized && !existingQuote ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Shipment is {shipment.status}.</p>
                  <p className="text-xs text-muted-foreground mt-1">No quotes can be submitted.</p>
                </div>
              ) : existingQuote ? (
                <div className="space-y-4">
                  <div className="p-4 bg-accent/10 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      {existingQuote.status === "available" ? "Incoming Order" : "Your Quote"}
                    </p>
                    {existingQuote.status !== "available" && (
                      <p className="text-2xl font-bold text-foreground">
                        ${Number(existingQuote.price).toLocaleString()}
                      </p>
                    )}
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

                  {existingQuote.notes && (
                    <p className="text-xs text-muted-foreground border rounded-lg p-3 bg-secondary/30">
                      {existingQuote.notes}
                    </p>
                  )}

                  {existingQuote.pickup_date && (
                    <p className="text-sm text-muted-foreground">
                      Pickup: {format(new Date(existingQuote.pickup_date), "MMM d, yyyy")}
                      {existingQuote.pickup_time && ` at ${existingQuote.pickup_time}`}
                    </p>
                  )}

                  {/* Accept / Reject for incoming orders (status: available) */}
                  {existingQuote.status === "available" && (
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-sm font-medium text-foreground">This order was sent to you by a shipper.</p>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          variant="electric"
                          onClick={async () => {
                            const { error } = await supabase
                              .from("trucking_quotes")
                              .update({ status: "accepted_by_carrier" })
                              .eq("id", existingQuote.id);
                            if (error) {
                              toast({ title: "Error", description: error.message, variant: "destructive" });
                              return;
                            }
                            queryClient.invalidateQueries({ queryKey: ["my-quote", id] });
                            toast({ title: "Order accepted", description: "You can now submit your pricing details." });
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" /> Accept Order
                        </Button>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            const { error } = await supabase
                              .from("trucking_quotes")
                              .update({ status: "rejected" })
                              .eq("id", existingQuote.id);
                            if (error) {
                              toast({ title: "Error", description: error.message, variant: "destructive" });
                              return;
                            }
                            queryClient.invalidateQueries({ queryKey: ["my-quote", id] });
                            toast({ title: "Order declined" });
                          }}
                        >
                          <X className="h-4 w-4 mr-1" /> Decline
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Show quote form after carrier accepts the order */}
                  {existingQuote.status === "accepted_by_carrier" && (
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-sm font-medium text-foreground">Submit your pricing to the shipper:</p>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const { data: profile } = await supabase
                            .from("profiles")
                            .select("company_name")
                            .eq("user_id", user!.id)
                            .maybeSingle();

                          const { error } = await supabase
                            .from("trucking_quotes")
                            .update({
                              price: parseFloat(price),
                              pickup_date: pickupDate || null,
                              pickup_time: pickupTime || null,
                              equipment_type: equipmentType || null,
                              driver_name: driverName || null,
                              driver_phone: driverPhone || null,
                              truck_plate: truckPlate || null,
                              notes: notes || existingQuote.notes || null,
                              company_name: profile?.company_name || null,
                              status: "submitted",
                            })
                            .eq("id", existingQuote.id);
                          if (error) {
                            toast({ title: "Error", description: error.message, variant: "destructive" });
                            return;
                          }
                          queryClient.invalidateQueries({ queryKey: ["my-quote", id] });
                          toast({ title: "Quote submitted", description: "Your quote has been sent to the shipper." });
                        }}
                        className="space-y-3"
                      >
                        <div>
                          <Label htmlFor="price-update">Price (USD) *</Label>
                          <Input id="price-update" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required className="mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Pickup Date</Label>
                            <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label>Time</Label>
                            <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="mt-1" />
                          </div>
                        </div>
                        <div>
                          <Label>Equipment Type</Label>
                          <Input value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)} placeholder="53' Dry Van" className="mt-1" />
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
                        </div>
                        <Button type="submit" className="w-full">Submit Quote</Button>
                      </form>
                    </div>
                  )}
                </div>
              ) : canSubmitQuote ? (
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

function PartyBlock({ label, party }: { label: string; party: any }) {
  const addressParts = [party.address, party.city, party.state, party.postal_code, party.country].filter(Boolean);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium text-foreground">{party.company_name || "—"}</p>
      {party.contact_name && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <User className="h-3 w-3" /> {party.contact_name}
        </p>
      )}
      {party.phone && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Phone className="h-3 w-3" /> {party.phone}
        </p>
      )}
      {party.email && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Mail className="h-3 w-3" /> {party.email}
        </p>
      )}
      {addressParts.length > 0 && (
        <p className="text-sm text-muted-foreground flex items-start gap-1.5">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> {addressParts.join(", ")}
        </p>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default TruckingOrderDetail;
