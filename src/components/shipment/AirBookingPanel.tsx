import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Plus, Send, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const AIRLINES = [
  "Emirates SkyCargo", "Lufthansa Cargo", "Cathay Pacific Cargo", "Singapore Airlines Cargo",
  "Korean Air Cargo", "Qatar Airways Cargo", "Turkish Airlines Cargo", "Cargolux",
  "FedEx Express", "UPS Airlines", "DHL Aviation", "Atlas Air",
  "Etihad Cargo", "ANA Cargo", "EVA Air Cargo", "China Airlines Cargo",
];

interface AirBookingPanelProps {
  shipmentId: string;
  airline?: string | null;
  flightNumber?: string | null;
  mawbNumber?: string | null;
  bookingRef?: string | null;
}

export function AirBookingPanel({ shipmentId, airline, flightNumber, mawbNumber, bookingRef }: AirBookingPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [booking, setBooking] = useState({
    airline: airline || "",
    flightNumber: flightNumber || "",
    mawbNumber: mawbNumber || "",
    pieces: "",
    weight: "",
    bookingRef: bookingRef || "",
    notes: "",
    spaceStatus: "pending" as "pending" | "confirmed" | "waitlisted",
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("shipments").update({
        airline: booking.airline || null,
        flight_number: booking.flightNumber || null,
        mawb_number: booking.mawbNumber || null,
        booking_ref: booking.bookingRef || null,
        carrier: booking.airline || null,
      }).eq("id", shipmentId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      setSaved(true);
      toast({ title: "Air booking saved", description: "Flight and MAWB details updated." });
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEAwb = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // First save, then submit eAWB
      await handleSave();
      const { data, error } = await supabase.functions.invoke("generate-air-waybill", {
        body: { shipment_id: shipmentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "eAWB Submitted", description: data?.message || "Electronic Air Waybill submitted successfully." });
    } catch (err: any) {
      toast({ title: "eAWB Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="h-4 w-4 text-accent" />
            Air Booking
          </CardTitle>
          <Badge variant="secondary" className={
            booking.spaceStatus === "confirmed" ? "bg-green-100 text-green-700" :
            booking.spaceStatus === "waitlisted" ? "bg-yellow-100 text-yellow-700" :
            "bg-secondary text-muted-foreground"
          }>
            {booking.spaceStatus === "confirmed" ? "Space Confirmed" :
             booking.spaceStatus === "waitlisted" ? "Waitlisted" : "Pending"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] text-muted-foreground">Airline</Label>
            <Select value={booking.airline} onValueChange={v => setBooking(p => ({ ...p, airline: v }))}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select airline" /></SelectTrigger>
              <SelectContent>{AIRLINES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Flight Number</Label>
            <Input className="mt-1 h-8 text-xs" value={booking.flightNumber} onChange={e => setBooking(p => ({ ...p, flightNumber: e.target.value }))} placeholder="EK9721" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] text-muted-foreground">MAWB Number</Label>
            <Input className="mt-1 h-8 text-xs" value={booking.mawbNumber} onChange={e => setBooking(p => ({ ...p, mawbNumber: e.target.value }))} placeholder="176-12345678" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Booking Reference</Label>
            <Input className="mt-1 h-8 text-xs" value={booking.bookingRef} onChange={e => setBooking(p => ({ ...p, bookingRef: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] text-muted-foreground">Total Pieces</Label>
            <Input type="number" className="mt-1 h-8 text-xs" value={booking.pieces} onChange={e => setBooking(p => ({ ...p, pieces: e.target.value }))} />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Total Weight (kg)</Label>
            <Input type="number" className="mt-1 h-8 text-xs" value={booking.weight} onChange={e => setBooking(p => ({ ...p, weight: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Space Status</Label>
          <Select value={booking.spaceStatus} onValueChange={(v: any) => setBooking(p => ({ ...p, spaceStatus: v }))}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="waitlisted">Waitlisted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Notes</Label>
          <Textarea className="mt-1 text-xs min-h-[40px]" value={booking.notes} onChange={e => setBooking(p => ({ ...p, notes: e.target.value }))} placeholder="Special requirements, ULD preferences..." />
        </div>
        <div className="flex gap-2">
          <Button variant="electric" size="sm" className="flex-1 text-xs" onClick={handleSave} disabled={submitting}>
            {saved ? <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" /> : submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            {saved ? "Saved" : "Save Booking"}
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={handleSubmitEAwb} disabled={submitting || !booking.mawbNumber}>
            <Send className="h-3.5 w-3.5 mr-1" />
            Submit eAWB
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
