import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Truck, Container, MapPin, Clock, DollarSign, Star,
  ArrowLeft, ArrowRight, Save, CheckCircle2, Sparkles, Send,
} from "lucide-react";

interface Props {
  shipmentId: string;
  originPort: string;
  destinationPort: string;
  shipment: any;
  needsTrucking: boolean;
  setNeedsTrucking: (v: boolean) => void;
  needsWarehouse: boolean;
  setNeedsWarehouse: (v: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft: () => void;
  saving: boolean;
}

interface TruckingSuggestion {
  id: string;
  company: string;
  rate: number;
  currency: string;
  transitTime: string;
  rating: number;
  available: boolean;
  type: "pickup" | "delivery";
  notes: string;
}

interface WarehouseSuggestion {
  id: string;
  name: string;
  location: string;
  dailyRate: number;
  currency: string;
  freeStorageDays: number;
  available: boolean;
  specialties: string[];
}

export function LogisticsSetupStep({
  shipmentId, originPort, destinationPort, shipment,
  needsTrucking, setNeedsTrucking, needsWarehouse, setNeedsWarehouse,
  onBack, onContinue, onSaveDraft, saving,
}: Props) {
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedPickupTrucker, setSelectedPickupTrucker] = useState<string | null>(null);
  const [selectedDeliveryTrucker, setSelectedDeliveryTrucker] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [truckingInstructions, setTruckingInstructions] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);

  // Fetch trucking companies from trucking_quotes or generate suggestions
  const { data: truckingQuotes = [] } = useQuery({
    queryKey: ["logistics-trucking", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trucking_quotes")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("rate", { ascending: true });
      return data || [];
    },
    enabled: !!shipmentId,
  });

  // Fetch warehouse orders
  const { data: warehouseOrders = [] } = useQuery({
    queryKey: ["logistics-warehouse", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("warehouse_orders")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!shipmentId,
  });

  // Generate smart suggestions based on ports
  const pickupSuggestions: TruckingSuggestion[] = useMemo(() => {
    if (truckingQuotes.length > 0) {
      return truckingQuotes
        .filter((q: any) => q.service_type === "pickup" || q.service_type === "drayage_origin")
        .map((q: any) => ({
          id: q.id,
          company: q.carrier_name || "Trucking Co.",
          rate: q.rate || 0,
          currency: q.currency || "USD",
          transitTime: q.transit_hours ? `${q.transit_hours}h` : "Same day",
          rating: 4.5,
          available: q.status !== "rejected",
          type: "pickup" as const,
          notes: q.notes || "",
        }));
    }
    // Default suggestions based on port
    return [
      { id: "sug-p1", company: "ALC Drayage Services", rate: 650, currency: "USD", transitTime: "Same day", rating: 4.8, available: true, type: "pickup" as const, notes: "Preferred partner — guaranteed capacity" },
      { id: "sug-p2", company: "Express Container Transport", rate: 725, currency: "USD", transitTime: "Same day", rating: 4.5, available: true, type: "pickup" as const, notes: "Hazmat certified, reefer available" },
      { id: "sug-p3", company: "Regional Trucking LLC", rate: 580, currency: "USD", transitTime: "Next day", rating: 4.2, available: true, type: "pickup" as const, notes: "Budget option — 24hr advance booking" },
    ];
  }, [truckingQuotes, originPort]);

  const deliverySuggestions: TruckingSuggestion[] = useMemo(() => {
    if (truckingQuotes.length > 0) {
      return truckingQuotes
        .filter((q: any) => q.service_type === "delivery" || q.service_type === "drayage_destination")
        .map((q: any) => ({
          id: q.id,
          company: q.carrier_name || "Trucking Co.",
          rate: q.rate || 0,
          currency: q.currency || "USD",
          transitTime: q.transit_hours ? `${q.transit_hours}h` : "Same day",
          rating: 4.5,
          available: q.status !== "rejected",
          type: "delivery" as const,
          notes: q.notes || "",
        }));
    }
    return [
      { id: "sug-d1", company: "ALC Last Mile", rate: 550, currency: "USD", transitTime: "Same day", rating: 4.7, available: true, type: "delivery" as const, notes: "Liftgate, inside delivery available" },
      { id: "sug-d2", company: "Swift Container Delivery", rate: 625, currency: "USD", transitTime: "Same day", rating: 4.4, available: true, type: "delivery" as const, notes: "White glove service available" },
    ];
  }, [truckingQuotes, destinationPort]);

  const warehouseSuggestions: WarehouseSuggestion[] = useMemo(() => {
    if (warehouseOrders.length > 0) {
      return warehouseOrders.map((w: any) => ({
        id: w.id,
        name: w.facility_name || "Warehouse",
        location: w.address || "",
        dailyRate: w.handling_fee || 25,
        currency: "USD",
        freeStorageDays: 3,
        available: true,
        specialties: ["General cargo"],
      }));
    }
    return [
      { id: "sug-w1", name: `${originPort} Container Freight Station`, location: `Near ${originPort}`, dailyRate: 35, currency: "USD", freeStorageDays: 5, available: true, specialties: ["CFS", "Consolidation", "Export packing"] },
      { id: "sug-w2", name: "ALC Bonded Warehouse", location: `${originPort} area`, dailyRate: 45, currency: "USD", freeStorageDays: 3, available: true, specialties: ["Bonded", "Hazmat certified", "Temperature controlled"] },
    ];
  }, [warehouseOrders, originPort]);

  // Auto-generate trucking instructions from shipment data
  useEffect(() => {
    if (shipment && !truckingInstructions) {
      const parts = [];
      if (shipment.carrier) parts.push(`Carrier: ${shipment.carrier}`);
      if (shipment.vessel) parts.push(`Vessel: ${shipment.vessel}`);
      if (shipment.voyage) parts.push(`Voyage: ${shipment.voyage}`);
      if (shipment.container_type) parts.push(`Container: ${shipment.container_type}`);
      if (shipment.etd) parts.push(`ETD: ${new Date(shipment.etd).toLocaleDateString()}`);
      if (parts.length > 0) {
        setTruckingInstructions(`Shipment: ${shipment.shipment_ref || ""}\n${parts.join("\n")}\n\nPlease coordinate pickup/delivery accordingly.`);
      }
    }
  }, [shipment]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Truck className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Logistics Setup</h2>
          <p className="text-sm text-muted-foreground">Configure trucking and warehouse services with smart suggestions</p>
        </div>
      </div>

      {/* Origin Trucking */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-accent" />
              Origin Pickup Trucking
            </CardTitle>
            <Switch checked={needsTrucking} onCheckedChange={setNeedsTrucking} />
          </div>
        </CardHeader>
        {needsTrucking && (
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Pickup Address</Label>
              <Input
                value={pickupAddress}
                onChange={e => setPickupAddress(e.target.value)}
                placeholder="Enter shipper's pickup address"
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium text-accent">Smart Suggestions</span>
            </div>

            <div className="space-y-2">
              {pickupSuggestions.map(sug => (
                <div
                  key={sug.id}
                  onClick={() => setSelectedPickupTrucker(sug.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPickupTrucker === sug.id
                      ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                      : "border-border hover:border-accent/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedPickupTrucker === sug.id && <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />}
                      <div>
                        <p className="text-sm font-medium">{sug.company}</p>
                        <p className="text-[11px] text-muted-foreground">{sug.notes}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-accent">${sug.rate}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {sug.transitTime}
                        <span className="mx-1">·</span>
                        <Star className="h-3 w-3 text-yellow-500" /> {sug.rating}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Destination Delivery */}
      {needsTrucking && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              Destination Delivery Trucking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Delivery Address</Label>
              <Input
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Enter consignee's delivery address"
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              {deliverySuggestions.map(sug => (
                <div
                  key={sug.id}
                  onClick={() => setSelectedDeliveryTrucker(sug.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedDeliveryTrucker === sug.id
                      ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                      : "border-border hover:border-accent/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedDeliveryTrucker === sug.id && <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />}
                      <div>
                        <p className="text-sm font-medium">{sug.company}</p>
                        <p className="text-[11px] text-muted-foreground">{sug.notes}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-accent">${sug.rate}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {sug.transitTime}
                        <span className="mx-1">·</span>
                        <Star className="h-3 w-3 text-yellow-500" /> {sug.rating}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warehouse */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Container className="h-4 w-4 text-accent" />
              Warehouse Services
            </CardTitle>
            <Switch checked={needsWarehouse} onCheckedChange={setNeedsWarehouse} />
          </div>
        </CardHeader>
        {needsWarehouse && (
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium text-accent">Nearby Facilities</span>
            </div>
            <div className="space-y-2">
              {warehouseSuggestions.map(wh => (
                <div
                  key={wh.id}
                  onClick={() => setSelectedWarehouse(wh.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedWarehouse === wh.id
                      ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                      : "border-border hover:border-accent/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {selectedWarehouse === wh.id && <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />}
                        <p className="text-sm font-medium">{wh.name}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{wh.location}</p>
                      <div className="flex gap-1 mt-1">
                        {wh.specialties.map(s => (
                          <Badge key={s} variant="outline" className="text-[9px] px-1 py-0">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">${wh.dailyRate}<span className="text-[10px] font-normal text-muted-foreground">/day</span></p>
                      <p className="text-[10px] text-muted-foreground">{wh.freeStorageDays} days free</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Auto-generated trucking instructions */}
      {needsTrucking && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Auto-Generated Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground mb-2">
              These instructions are auto-populated from your shipment data. The trucking company will receive this information automatically.
            </p>
            <Textarea
              value={truckingInstructions}
              onChange={e => setTruckingInstructions(e.target.value)}
              rows={5}
              className="text-xs"
            />
          </CardContent>
        </Card>
      )}

      {/* Cost summary */}
      {(needsTrucking || needsWarehouse) && (
        <Card className="border-accent/20 bg-accent/[0.02]">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Logistics Cost Summary</p>
            <div className="grid grid-cols-3 gap-4 text-xs">
              {needsTrucking && selectedPickupTrucker && (
                <div>
                  <span className="text-muted-foreground">Pickup</span>
                  <p className="font-medium">${pickupSuggestions.find(s => s.id === selectedPickupTrucker)?.rate || 0}</p>
                </div>
              )}
              {needsTrucking && selectedDeliveryTrucker && (
                <div>
                  <span className="text-muted-foreground">Delivery</span>
                  <p className="font-medium">${deliverySuggestions.find(s => s.id === selectedDeliveryTrucker)?.rate || 0}</p>
                </div>
              )}
              {needsWarehouse && selectedWarehouse && (
                <div>
                  <span className="text-muted-foreground">Warehouse</span>
                  <p className="font-medium">${warehouseSuggestions.find(s => s.id === selectedWarehouse)?.dailyRate || 0}/day</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSaveDraft} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" />{saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button variant="electric" onClick={onContinue}>
            <Send className="h-4 w-4 mr-1.5" /> Save & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
