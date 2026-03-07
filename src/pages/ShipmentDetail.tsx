import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, FileText, Users, Clock, Check, Circle, Ship, Loader2, Radio, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const MILESTONES_ORDER = [
  "Booking Confirmed",
  "Cargo Received",
  "Container Loaded",
  "Vessel Departed",
  "In Transit",
  "Port Arrival",
  "Customs Clearance",
  "Delivered",
];

const statusColor: Record<string, string> = {
  "in_transit": "bg-accent/10 text-accent",
  "booking_confirmed": "bg-yellow-100 text-yellow-700",
  "cargo_received": "bg-blue-100 text-blue-700",
  "delivered": "bg-green-100 text-green-700",
  "draft": "bg-secondary text-muted-foreground",
  "pending": "bg-secondary text-muted-foreground",
};

const formatStatus = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CARRIERS = [
  { value: "maersk", label: "Maersk" },
  { value: "msc", label: "MSC" },
  { value: "cmacgm", label: "CMA CGM" },
  { value: "evergreen", label: "Evergreen" },
];

const ShipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("shipments").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Shipment deleted", description: "The draft shipment has been removed." });
      navigate("/dashboard/shipments");
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // Realtime subscriptions for live updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`shipment-realtime-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments', filter: `id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["shipment", id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_events', filter: `shipment_id=eq.${id}` }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["tracking_events", id] });
        if (payload.eventType === 'INSERT') {
          const newEvent = payload.new as any;
          toast({ title: "Tracking Update", description: `${newEvent.milestone}${newEvent.location ? ` — ${newEvent.location}` : ''}` });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'edi_messages', filter: `shipment_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["edi_messages", id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  const { data: shipment, isLoading } = useQuery({
    queryKey: ["shipment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, companies(company_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: cargo } = useQuery({
    queryKey: ["cargo", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cargo").select("*").eq("shipment_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: containers } = useQuery({
    queryKey: ["containers", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("containers").select("*").eq("shipment_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: parties } = useQuery({
    queryKey: ["parties", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipment_parties").select("*").eq("shipment_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: trackingEvents } = useQuery({
    queryKey: ["tracking_events", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tracking_events").select("*").eq("shipment_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("shipment_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: ediMessages } = useQuery({
    queryKey: ["edi_messages", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("edi_messages").select("*").eq("shipment_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleBooking = async () => {
    if (!selectedCarrier) return;
    setBookingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("carrier-booking", {
        body: { shipment_id: id, carrier: selectedCarrier },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Booking Sent", description: data.message });
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["shipment", id] });
      queryClient.invalidateQueries({ queryKey: ["tracking_events", id] });
      queryClient.invalidateQueries({ queryKey: ["edi_messages", id] });
    } catch (err: any) {
      toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
    } finally {
      setBookingLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!shipment) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-foreground mb-2">Shipment not found</h2>
          <p className="text-muted-foreground mb-6">The shipment you're looking for doesn't exist.</p>
          <Button variant="electric" asChild>
            <Link to="/dashboard/shipments">Back to Shipments</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Build milestones from tracking events
  const completedMilestones = new Map(
    (trackingEvents || []).map((e) => [e.milestone, e])
  );

  const milestones = MILESTONES_ORDER.map((label) => {
    const event = completedMilestones.get(label);
    return {
      label,
      date: event ? format(new Date(event.event_date), "MMM d, yyyy") : null,
      location: event?.location || null,
      completed: !!event,
    };
  });

  const currentMilestoneIndex = (() => {
    let last = -1;
    milestones.forEach((m, i) => { if (m.completed) last = i; });
    return last;
  })();

  const containersSummary = (containers || [])
    .map((c) => `${c.quantity}x${c.container_type}`)
    .join(", ") || "—";

  const firstCargo = cargo?.[0];
  const companyName = (shipment as any).companies?.company_name as string | undefined;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
          <Link to="/dashboard/shipments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shipments
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{shipment.shipment_ref}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[shipment.status] || "bg-secondary text-muted-foreground"}`}>
                {formatStatus(shipment.status)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {companyName && <span className="font-medium text-foreground mr-2">{companyName}</span>}
              {shipment.origin_port || "—"} → {shipment.destination_port || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {shipment.status === "draft" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Draft
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete draft shipment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete shipment <strong>{shipment.shipment_ref}</strong> and all associated cargo, containers, parties, and quotes. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="electric" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Generate Documents
            </Button>
          </div>
        </div>
      </div>

      {/* Milestone Timeline */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              Shipment Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-border hidden md:block" />
              <div className="absolute top-4 left-4 h-0.5 bg-accent hidden md:block" style={{
                width: currentMilestoneIndex >= 0
                  ? `${(currentMilestoneIndex / (milestones.length - 1)) * 100}%`
                  : '0%',
                maxWidth: 'calc(100% - 2rem)',
              }} />
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                {milestones.map((milestone, i) => {
                  const isActive = i === currentMilestoneIndex;
                  const isCompleted = milestone.completed;
                  return (
                    <motion.div
                      key={milestone.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                      className="flex flex-col items-center text-center relative"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 mb-3 transition-all ${
                        isCompleted
                          ? isActive
                            ? "bg-accent text-accent-foreground ring-4 ring-accent/20"
                            : "bg-accent text-accent-foreground"
                          : "bg-secondary border-2 border-border text-muted-foreground"
                      }`}>
                        {isCompleted ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                      </div>
                      <p className={`text-xs font-medium leading-tight mb-1 ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {milestone.label}
                      </p>
                      {milestone.date && <p className="text-[10px] text-muted-foreground">{milestone.date}</p>}
                      {milestone.location && <p className="text-[10px] text-muted-foreground/60">{milestone.location}</p>}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Shipment Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-accent" />
                Shipment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                <InfoRow label="Shipment Type" value={formatStatus(shipment.shipment_type)} />
                <InfoRow label="Status" value={formatStatus(shipment.status)} />
                <InfoRow label="Origin Port" value={shipment.origin_port || "—"} />
                <InfoRow label="Destination Port" value={shipment.destination_port || "—"} />
                <InfoRow label="Pickup Location" value={shipment.pickup_location || "—"} />
                <InfoRow label="Delivery Location" value={shipment.delivery_location || "—"} />
                <InfoRow label="Vessel" value={shipment.vessel || "TBD"} />
                <InfoRow label="Voyage" value={shipment.voyage || "TBD"} />
                <InfoRow label="ETD" value={shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "TBD"} />
                <InfoRow label="ETA" value={shipment.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "TBD"} />
                <InfoRow label="Booking Ref" value={shipment.booking_ref || "—"} />
                <InfoRow label="Containers" value={containersSummary} />
              </div>
              {firstCargo && (
                <>
                  <Separator className="my-5" />
                  <h4 className="text-sm font-semibold text-foreground mb-3">Cargo Information</h4>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                    <InfoRow label="Commodity" value={firstCargo.commodity || "—"} />
                    <InfoRow label="HS Code" value={firstCargo.hs_code || "—"} />
                    <InfoRow label="Gross Weight" value={firstCargo.gross_weight ? `${firstCargo.gross_weight} kg` : "—"} />
                    <InfoRow label="Volume" value={firstCargo.volume ? `${firstCargo.volume} CBM` : "—"} />
                    <InfoRow label="Packages" value={firstCargo.num_packages ? `${firstCargo.num_packages} ${firstCargo.package_type || ""}`.trim() : "—"} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Parties */}
          {parties && parties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  Parties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parties.map((party) => (
                    <div key={party.id} className="flex items-start justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{party.role}</p>
                        <p className="text-sm font-medium text-foreground">{party.company_name}</p>
                        {party.contact_name && <p className="text-xs text-muted-foreground">{party.contact_name}</p>}
                      </div>
                      <div className="text-right">
                        {party.email && <p className="text-xs text-muted-foreground">{party.email}</p>}
                        {party.phone && <p className="text-xs text-muted-foreground">{party.phone}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Sidebar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-6">
          {/* Carrier Booking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ship className="h-4 w-4 text-accent" />
                Carrier Booking
              </CardTitle>
              <CardDescription>Send booking request (IFTMIN) to a shipping line</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                <SelectContent>
                  {CARRIERS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <Button variant="electric" className="w-full" disabled={!selectedCarrier}>
                    <Ship className="h-4 w-4 mr-1" />Send Booking Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Booking Request</DialogTitle>
                    <DialogDescription>
                      This will send an IFTMIN booking request to <strong>{CARRIERS.find(c => c.value === selectedCarrier)?.label}</strong> for shipment <strong>{shipment.shipment_ref}</strong>.
                      The carrier will process this and respond with a booking confirmation.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button variant="electric" onClick={handleBooking} disabled={bookingLoading}>
                      {bookingLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Confirm & Send
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* EDI Message Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-accent" />
                EDI Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ediMessages && ediMessages.length > 0 ? (
                <div className="space-y-3">
                  {ediMessages.map((msg) => (
                    <div key={msg.id} className="flex items-start justify-between py-2 border-b last:border-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{msg.message_type}</Badge>
                          <Badge variant={msg.direction === "inbound" ? "secondary" : "default"} className="text-[10px]">
                            {msg.direction === "inbound" ? "← IN" : "→ OUT"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{msg.carrier}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={`text-[10px] ${msg.status === "error" ? "border-destructive text-destructive" : ""}`}>
                          {msg.status}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(msg.created_at), "MMM d, HH:mm")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No EDI messages yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <p className="text-sm text-foreground">{doc.doc_type}</p>
                      <span className={`text-xs font-medium ${doc.status === "generated" ? "text-green-600" : "text-muted-foreground"}`}>
                        {formatStatus(doc.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documents yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export default ShipmentDetail;
