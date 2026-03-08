import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Ship, Plus, Anchor, ArrowRight, Trash2, Send, MapPin, Calendar, Hash, RefreshCw, Loader2
} from "lucide-react";

interface VesselBookingPanelProps {
  shipmentId: string;
  variant?: "shipper" | "admin";
  bookingRef?: string | null;
}

const CARRIERS = ["Maersk", "MSC", "CMA CGM", "Evergreen", "Hapag-Lloyd", "COSCO", "ONE", "Yang Ming", "ZIM", "HMM"];
const BOOKING_STATUSES = ["draft", "confirmed", "cancelled"];
const LEG_TYPES = [
  { value: "feeder", label: "Feeder Vessel" },
  { value: "main", label: "Main Vessel" },
  { value: "transshipment", label: "Transshipment" },
];

const statusBadge: Record<string, string> = {
  draft: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
};

const emptyLeg = (order: number, type: string = "main") => ({
  leg_order: order,
  leg_type: type,
  vessel_name: "",
  voyage_number: "",
  origin_port: "",
  destination_port: "",
  etd: "",
  eta: "",
  transshipment_port: "",
  notes: "",
});

export function VesselBookingPanel({ shipmentId, variant = "shipper", bookingRef }: VesselBookingPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    booking_number: "",
    carrier: "",
    container_type: "40GP",
    container_count: 1,
    notes: "",
  });
  const [legs, setLegs] = useState([emptyLeg(1, "feeder"), emptyLeg(2, "main")]);

  const isAdmin = variant === "admin";

  // Base styles
  const cardBg = isAdmin ? "bg-[hsl(220,18%,10%)]" : "bg-card";
  const cardBorder = isAdmin ? "border-[hsl(220,15%,13%)]" : "border-border";
  const inputBg = isAdmin ? "bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white" : "";
  const labelColor = isAdmin ? "text-[hsl(220,10%,50%)]" : "text-muted-foreground";
  const textPrimary = isAdmin ? "text-white" : "text-foreground";
  const textSecondary = isAdmin ? "text-[hsl(220,10%,50%)]" : "text-muted-foreground";

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["vessel-bookings", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vessel_bookings")
        .select("*, booking_legs(*)")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!shipmentId,
  });

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!user) return;
      // Create booking
      const { data: booking, error } = await supabase
        .from("vessel_bookings")
        .insert({
          shipment_id: shipmentId,
          booking_number: newBooking.booking_number || null,
          carrier: newBooking.carrier || null,
          container_type: newBooking.container_type || null,
          container_count: newBooking.container_count,
          notes: newBooking.notes || null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Create legs (filter out empty ones)
      const validLegs = legs.filter(l => l.vessel_name || l.voyage_number || l.origin_port || l.destination_port);
      if (validLegs.length > 0) {
        const { error: legsErr } = await supabase
          .from("booking_legs")
          .insert(validLegs.map(l => ({
            booking_id: booking.id,
            leg_order: l.leg_order,
            leg_type: l.leg_type,
            vessel_name: l.vessel_name || null,
            voyage_number: l.voyage_number || null,
            origin_port: l.origin_port || null,
            destination_port: l.destination_port || null,
            etd: l.etd || null,
            eta: l.eta || null,
            transshipment_port: l.transshipment_port || null,
            notes: l.notes || null,
          })));
        if (legsErr) throw legsErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vessel-bookings", shipmentId] });
      setIsAddOpen(false);
      setNewBooking({ booking_number: "", carrier: "", container_type: "40GP", container_count: 1, notes: "" });
      setLegs([emptyLeg(1, "feeder"), emptyLeg(2, "main")]);
      toast.success("Vessel booking created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create booking"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("vessel_bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vessel-bookings", shipmentId] });
      toast.success("Booking status updated");
    },
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vessel_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vessel-bookings", shipmentId] });
      toast.success("Booking deleted");
    },
  });

  const submitToCarrier = useMutation({
    mutationFn: async (bookingId: string) => {
      const booking = bookings?.find((b: any) => b.id === bookingId);
      if (!booking) throw new Error("Booking not found");

      const { data, error } = await supabase.functions.invoke("carrier-booking", {
        body: {
          shipmentId,
          carrier: booking.carrier,
          bookingNumber: booking.booking_number,
          containerType: booking.container_type,
          containerCount: booking.container_count,
        },
      });
      if (error) throw error;

      // Mark as EDI submitted
      await supabase.from("vessel_bookings").update({ edi_submitted: true }).eq("id", bookingId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vessel-bookings", shipmentId] });
      toast.success("Booking submitted to carrier via EDI");
    },
    onError: (err: any) => toast.error(err.message || "EDI submission failed"),
  });

  const syncFromE2Open = useMutation({
    mutationFn: async (mode: string = "all") => {
      const { data, error } = await supabase.functions.invoke("e2open-sync", {
        body: { shipment_id: shipmentId, mode, booking_ref: bookingRef },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vessel-bookings", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["shipment", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["tracking_events", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["containers", shipmentId] });
      const synced = data?.synced?.join(", ") || "data";
      toast.success(`Synced from e2open: ${synced}`);
    },
    onError: (err: any) => toast.error(err.message || "e2open sync failed"),
  });

  const updateLeg = (index: number, field: string, value: string) => {
    setLegs(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const addLeg = () => {
    setLegs(prev => [...prev, emptyLeg(prev.length + 1, "main")]);
  };

  const removeLeg = (index: number) => {
    setLegs(prev => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, leg_order: i + 1 })));
  };

  return (
    <div className={`rounded-xl border ${cardBorder} ${cardBg} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ship className={`h-4 w-4 ${isAdmin ? "text-blue-400" : "text-accent"}`} />
          <h2 className={`text-sm font-semibold ${textPrimary}`}>Vessel Bookings</h2>
          {bookings && bookings.length > 0 && (
            <Badge variant="outline" className={`text-[10px] ${isAdmin ? "border-[hsl(220,15%,20%)] text-[hsl(220,10%,50%)]" : ""}`}>
              {bookings.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className={`text-xs ${isAdmin ? "border-[hsl(220,15%,20%)] text-[hsl(220,10%,50%)] hover:text-white" : ""}`}
            disabled={syncFromE2Open.isPending}
            onClick={() => syncFromE2Open.mutate("all")}
          >
            {syncFromE2Open.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Sync from e2open
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className={isAdmin
                ? "bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white text-xs"
                : "text-xs"
              } variant={isAdmin ? "default" : "electric"}>
                <Plus className="h-3 w-3 mr-1" /> New Booking
              </Button>
            </DialogTrigger>
          <DialogContent className={`${isAdmin ? "bg-[hsl(220,18%,10%)] border-[hsl(220,15%,18%)] text-white" : ""} max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <DialogHeader>
              <DialogTitle className={isAdmin ? "text-white" : ""}>Create Vessel Booking</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Booking details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={`text-xs ${labelColor}`}>Booking Number</Label>
                  <Input className={`${inputBg} h-8 text-xs`} placeholder="BKNG-001" value={newBooking.booking_number} onChange={e => setNewBooking(p => ({ ...p, booking_number: e.target.value }))} />
                </div>
                <div>
                  <Label className={`text-xs ${labelColor}`}>Carrier</Label>
                  <Select value={newBooking.carrier} onValueChange={v => setNewBooking(p => ({ ...p, carrier: v }))}>
                    <SelectTrigger className={`${inputBg} h-8 text-xs`}><SelectValue placeholder="Select carrier" /></SelectTrigger>
                    <SelectContent>{CARRIERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={`text-xs ${labelColor}`}>Container Type</Label>
                  <Select value={newBooking.container_type} onValueChange={v => setNewBooking(p => ({ ...p, container_type: v }))}>
                    <SelectTrigger className={`${inputBg} h-8 text-xs`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["20GP", "40GP", "40HC", "20RF", "40RF", "45HC"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={`text-xs ${labelColor}`}>Container Count</Label>
                  <Input type="number" min={1} className={`${inputBg} h-8 text-xs`} value={newBooking.container_count} onChange={e => setNewBooking(p => ({ ...p, container_count: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>

              {/* Voyage legs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${isAdmin ? "text-[hsl(220,10%,40%)]" : "text-muted-foreground"}`}>Voyage Legs</p>
                  <button onClick={addLeg} className={`text-[10px] flex items-center gap-1 ${isAdmin ? "text-blue-400 hover:text-blue-300" : "text-accent hover:text-accent/80"}`}>
                    <Plus className="h-3 w-3" /> Add Leg
                  </button>
                </div>
                <div className="space-y-3">
                  {legs.map((leg, i) => (
                    <div key={i} className={`rounded-lg border ${isAdmin ? "border-[hsl(220,15%,18%)] bg-[hsl(220,15%,8%)]" : "border-border bg-muted/30"} p-3 space-y-2`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Anchor className={`h-3.5 w-3.5 ${leg.leg_type === "feeder" ? "text-cyan-400" : "text-blue-400"}`} />
                          <span className={`text-xs font-medium ${textPrimary}`}>Leg {leg.leg_order}</span>
                          <Select value={leg.leg_type} onValueChange={v => updateLeg(i, "leg_type", v)}>
                            <SelectTrigger className={`${inputBg} h-6 text-[10px] w-32`}><SelectValue /></SelectTrigger>
                            <SelectContent>{LEG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {legs.length > 1 && (
                          <button onClick={() => removeLeg(i)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className={`text-[10px] ${labelColor}`}>Vessel Name</Label>
                          <Input className={`${inputBg} h-7 text-xs`} placeholder="MV Example" value={leg.vessel_name} onChange={e => updateLeg(i, "vessel_name", e.target.value)} />
                        </div>
                        <div>
                          <Label className={`text-[10px] ${labelColor}`}>Voyage Number</Label>
                          <Input className={`${inputBg} h-7 text-xs`} placeholder="V001E" value={leg.voyage_number} onChange={e => updateLeg(i, "voyage_number", e.target.value)} />
                        </div>
                        <div>
                          <Label className={`text-[10px] ${labelColor}`}>Origin Port</Label>
                          <Input className={`${inputBg} h-7 text-xs`} placeholder="USLAX" value={leg.origin_port} onChange={e => updateLeg(i, "origin_port", e.target.value)} />
                        </div>
                        <div>
                          <Label className={`text-[10px] ${labelColor}`}>Destination Port</Label>
                          <Input className={`${inputBg} h-7 text-xs`} placeholder="CNSHA" value={leg.destination_port} onChange={e => updateLeg(i, "destination_port", e.target.value)} />
                        </div>
                        <div>
                          <Label className={`text-[10px] ${labelColor}`}>ETD</Label>
                          <Input type="date" className={`${inputBg} h-7 text-xs`} value={leg.etd} onChange={e => updateLeg(i, "etd", e.target.value)} />
                        </div>
                        <div>
                          <Label className={`text-[10px] ${labelColor}`}>ETA</Label>
                          <Input type="date" className={`${inputBg} h-7 text-xs`} value={leg.eta} onChange={e => updateLeg(i, "eta", e.target.value)} />
                        </div>
                        {leg.leg_type === "feeder" && (
                          <div className="col-span-2">
                            <Label className={`text-[10px] ${labelColor}`}>Transshipment Port</Label>
                            <Input className={`${inputBg} h-7 text-xs`} placeholder="Hub port for transshipment" value={leg.transshipment_port} onChange={e => updateLeg(i, "transshipment_port", e.target.value)} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className={`text-xs ${labelColor}`}>Notes</Label>
                <Textarea className={`${inputBg} text-xs min-h-[50px]`} value={newBooking.notes} onChange={e => setNewBooking(p => ({ ...p, notes: e.target.value }))} />
              </div>

              <Button
                className={`w-full text-xs ${isAdmin ? "bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white" : ""}`}
                variant={isAdmin ? "default" : "electric"}
                disabled={createBooking.isPending}
                onClick={() => createBooking.mutate()}
              >
                {createBooking.isPending ? "Creating…" : "Create Booking"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Existing bookings */}
      {isLoading ? (
        <div className={`h-20 rounded-lg animate-pulse ${isAdmin ? "bg-[hsl(220,15%,15%)]" : "bg-muted"}`} />
      ) : !bookings?.length ? (
        <p className={`text-xs text-center py-6 ${textSecondary}`}>No vessel bookings yet. Create one to start.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => {
            const sortedLegs = [...(b.booking_legs || [])].sort((a: any, b: any) => a.leg_order - b.leg_order);
            return (
              <div key={b.id} className={`rounded-lg border ${isAdmin ? "border-[hsl(220,15%,15%)] bg-[hsl(220,15%,8%)]" : "border-border bg-muted/30"} p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className={`h-3 w-3 ${textSecondary}`} />
                    <span className={`text-xs font-medium ${textPrimary}`}>{b.booking_number || "No booking #"}</span>
                    {b.carrier && <span className={`text-[10px] ${textSecondary}`}>• {b.carrier}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[9px] ${statusBadge[b.status] || ""}`}>
                      {b.status}
                    </Badge>
                    <Select value={b.status} onValueChange={status => updateStatus.mutate({ id: b.id, status })}>
                      <SelectTrigger className={`h-6 text-[10px] w-24 ${isAdmin ? "bg-transparent border-[hsl(220,15%,20%)] text-white" : ""}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{BOOKING_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className={`text-[10px] ${textSecondary} mb-2`}>
                  {b.container_count}× {b.container_type || "N/A"}
                  {b.edi_submitted && <Badge variant="outline" className="ml-2 text-[9px] border-emerald-500/30 text-emerald-400">EDI Sent</Badge>}
                </div>

                {/* Voyage legs timeline */}
                {sortedLegs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {sortedLegs.map((leg: any, i: number) => (
                      <div key={leg.id} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                          leg.leg_type === "feeder" ? "bg-cyan-500/15 text-cyan-400" : "bg-blue-500/15 text-blue-400"
                        }`}>
                          {leg.leg_order}
                        </div>
                        <div className="flex-1 flex items-center gap-1 text-[10px]">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          <span className={textPrimary}>{leg.origin_port || "?"}</span>
                          <ArrowRight className={`h-2.5 w-2.5 shrink-0 ${textSecondary}`} />
                          <span className={textPrimary}>{leg.destination_port || "?"}</span>
                          {leg.vessel_name && <span className={textSecondary}>• {leg.vessel_name} {leg.voyage_number}</span>}
                          {leg.transshipment_port && (
                            <span className="text-cyan-400 text-[9px]">⇄ {leg.transshipment_port}</span>
                          )}
                        </div>
                        {leg.etd && (
                          <span className={`text-[9px] ${textSecondary} shrink-0 flex items-center gap-0.5`}>
                            <Calendar className="h-2.5 w-2.5" />{leg.etd}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed" style={{ borderColor: isAdmin ? "hsl(220,15%,15%)" : undefined }}>
                  {!b.edi_submitted && b.carrier && (
                    <button
                      onClick={() => submitToCarrier.mutate(b.id)}
                      disabled={submitToCarrier.isPending}
                      className={`text-[10px] flex items-center gap-1 ${isAdmin ? "text-amber-400 hover:text-amber-300" : "text-accent hover:text-accent/80"}`}
                    >
                      <Send className="h-3 w-3" />
                      {submitToCarrier.isPending ? "Sending…" : "Submit to Carrier"}
                    </button>
                  )}
                  <button
                    onClick={() => deleteBooking.mutate(b.id)}
                    className="text-[10px] flex items-center gap-1 text-red-400 hover:text-red-300 ml-auto"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
