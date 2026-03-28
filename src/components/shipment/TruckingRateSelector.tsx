import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock, DollarSign, Star, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface TruckingRate {
  id: string;
  carrier: string;
  price: number;
  currency: string;
  transitHours: number;
  equipmentType: string;
  rating: number;
  tag?: string;
}

interface TruckingRateSelectorProps {
  shipmentId: string;
  originPort: string;
  destinationPort: string;
  pickupLocation?: string;
  deliveryLocation?: string;
  containerType?: string;
}

/* ── Simulated rate data (would come from carrier APIs in production) ── */
function generateRates(from: string, to: string, leg: "origin" | "destination"): TruckingRate[] {
  const basePrice = leg === "origin" ? 450 : 550;
  return [
    { id: `${leg}-1`, carrier: "Swift Drayage", price: basePrice, currency: "USD", transitHours: 4, equipmentType: "Chassis", rating: 4.8, tag: "Best Value" },
    { id: `${leg}-2`, carrier: "Harbor Express", price: basePrice + 120, currency: "USD", transitHours: 2, equipmentType: "Chassis + Tri-Axle", rating: 4.9, tag: "Fastest" },
    { id: `${leg}-3`, carrier: "Continental Trucking", price: basePrice - 50, currency: "USD", transitHours: 6, equipmentType: "Standard Chassis", rating: 4.5 },
    { id: `${leg}-4`, carrier: "Pacific Intermodal", price: basePrice + 30, currency: "USD", transitHours: 5, equipmentType: "Chassis", rating: 4.6 },
  ];
}

function RateCard({ rate, selected, onSelect, disabled }: { rate: TruckingRate; selected: boolean; onSelect: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${
        selected
          ? "border-accent bg-accent/5 ring-1 ring-accent/20"
          : "border-border hover:border-accent/40 hover:bg-accent/5"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{rate.carrier}</span>
            {rate.tag && (
              <Badge variant="secondary" className="text-[10px] bg-accent/10 text-accent border-accent/20">
                {rate.tag}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{rate.transitHours}h</span>
            <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{rate.equipmentType}</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" />{rate.rating}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-foreground">${rate.price}</p>
          <p className="text-[10px] text-muted-foreground">{rate.currency}</p>
        </div>
      </div>
      {selected && (
        <div className="mt-2 pt-2 border-t border-accent/20 flex items-center gap-1.5 text-xs text-accent font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" /> Selected
        </div>
      )}
    </button>
  );
}

export function TruckingRateSelector({ shipmentId, originPort, destinationPort, pickupLocation, deliveryLocation, containerType }: TruckingRateSelectorProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const originRates = useMemo(() => generateRates(pickupLocation || originPort, originPort, "origin"), [pickupLocation, originPort]);
  const destRates = useMemo(() => generateRates(destinationPort, deliveryLocation || destinationPort, "destination"), [deliveryLocation, destinationPort]);

  const selectedOriginRate = originRates.find(r => r.id === selectedOrigin);
  const selectedDestRate = destRates.find(r => r.id === selectedDest);
  const total = (selectedOriginRate?.price || 0) + (selectedDestRate?.price || 0);

  const handleConfirm = async () => {
    if (!user) return;
    setConfirming(true);
    try {
      const inserts = [];
      if (selectedOriginRate) {
        inserts.push({
          shipment_id: shipmentId,
          trucker_user_id: user.id,
          company_name: selectedOriginRate.carrier,
          price: selectedOriginRate.price,
          currency: selectedOriginRate.currency,
          equipment_type: selectedOriginRate.equipmentType,
          status: "accepted",
          notes: `Origin pickup: ${pickupLocation || originPort} → ${originPort} | ${selectedOriginRate.transitHours}h transit`,
        });
      }
      if (selectedDestRate) {
        inserts.push({
          shipment_id: shipmentId,
          trucker_user_id: user.id,
          company_name: selectedDestRate.carrier,
          price: selectedDestRate.price,
          currency: selectedDestRate.currency,
          equipment_type: selectedDestRate.equipmentType,
          status: "accepted",
          notes: `Destination delivery: ${destinationPort} → ${deliveryLocation || destinationPort} | ${selectedDestRate.transitHours}h transit`,
        });
      }
      if (inserts.length > 0) {
        const { error } = await supabase.from("trucking_quotes").insert(inserts);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["trucking_quotes_panel", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["logistics-trucking-quotes", shipmentId] });
      toast.success("Trucking rates confirmed and added to shipment!");
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm trucking");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4 text-accent" />
          Trucking Rates
        </CardTitle>
        <CardDescription>Select trucking services for origin pickup and destination delivery</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Origin Pickup */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Origin Pickup</p>
              <p className="text-xs text-muted-foreground">{pickupLocation || "Warehouse"} <ArrowRight className="inline h-3 w-3" /> {originPort}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {originRates.map(rate => (
              <RateCard
                key={rate.id}
                rate={rate}
                selected={selectedOrigin === rate.id}
                onSelect={() => setSelectedOrigin(rate.id)}
              />
            ))}
          </div>
        </div>

        {/* Destination Delivery */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Destination Delivery</p>
              <p className="text-xs text-muted-foreground">{destinationPort} <ArrowRight className="inline h-3 w-3" /> {deliveryLocation || "Consignee"}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {destRates.map(rate => (
              <RateCard
                key={rate.id}
                rate={rate}
                selected={selectedDest === rate.id}
                onSelect={() => setSelectedDest(rate.id)}
              />
            ))}
          </div>
        </div>

        {/* Summary & Confirm */}
        {(selectedOrigin || selectedDest) && (
          <div className="rounded-xl border-2 border-accent/20 bg-accent/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trucking Total</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-foreground">${total.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">USD</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {selectedOriginRate && <span>Origin: ${selectedOriginRate.price} ({selectedOriginRate.carrier})</span>}
                  {selectedOriginRate && selectedDestRate && <span>+</span>}
                  {selectedDestRate && <span>Dest: ${selectedDestRate.price} ({selectedDestRate.carrier})</span>}
                </div>
              </div>
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                Confirm Trucking
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
