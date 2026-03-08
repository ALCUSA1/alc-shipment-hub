import { useState, useEffect } from "react";
import { ShipmentPnL } from "@/components/shipment/ShipmentPnL";
import { VesselBookingPanel } from "@/components/shipment/VesselBookingPanel";
import { CustomsFilingPanel } from "@/components/shipment/CustomsFilingPanel";
import { TruckingPanel } from "@/components/shipment/TruckingPanel";
import { WarehousePanel } from "@/components/shipment/WarehousePanel";
import { CarrierRateSelector } from "@/components/shipment/CarrierRateSelector";
import { DemurrageTracker } from "@/components/shipment/DemurrageTracker";
import { CutoffTracker } from "@/components/shipment/CutoffTracker";
import { VoyageDatesEditor } from "@/components/shipment/VoyageDatesEditor";
import { DocumentChecklist } from "@/components/shipment/DocumentChecklist";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ShipmentNextAction } from "@/components/shipment/ShipmentNextAction";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, FileText, Users, Clock, Check, Circle, Loader2, Radio, Trash2, Ship } from "lucide-react";
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

// CARRIERS list removed — now handled by CarrierRateSelector

const ShipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const { data: quotes } = useQuery({
    queryKey: ["shipment-quotes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("amount, status").eq("shipment_id", id!).eq("status", "accepted");
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

  // Booking is now handled by CarrierRateSelector

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
  const isDelivered = shipment.status === "delivered" || shipment.status === "completed";

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
              {isDelivered ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                  <Check className="h-3.5 w-3.5" />
                  Delivered
                </span>
              ) : (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[shipment.status] || "bg-secondary text-muted-foreground"}`}>
                  {formatStatus(shipment.status)}
                </span>
              )}
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

      {/* Smart Next Action */}
      <div className="mb-6">
        <ShipmentNextAction shipmentId={id!} shipmentStatus={shipment.status} />
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
              <div className="absolute top-4 left-4 h-0.5 bg-emerald-500 hidden md:block" style={{
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
                            ? "bg-emerald-500 text-white ring-4 ring-emerald-500/25 shadow-lg shadow-emerald-500/20"
                            : "bg-emerald-500 text-white shadow-sm"
                          : "bg-secondary border-2 border-border text-muted-foreground"
                      }`}>
                        {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Circle className="h-3 w-3" />}
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

          {/* Demurrage & Detention */}
          <DemurrageTracker
            shipmentId={id!}
            shipmentStatus={shipment.status}
          />

          {/* Vessel Bookings - read-only for delivered */}
          {!isDelivered && <div data-guide="vessel"><VesselBookingPanel shipmentId={id!} variant="shipper" /></div>}

          {/* Customs / AES Filing */}
          <div data-guide="customs">
            <CustomsFilingPanel shipmentId={id!} />
          </div>

          {/* Trucking */}
          <div data-guide="trucking">
            <TruckingPanel shipmentId={id!} />
          </div>

          {/* Warehouse Operations */}
          <div data-guide="warehouse">
            <WarehousePanel shipmentId={id!} />
          </div>

          {/* Profit & Loss */}
          <ShipmentPnL
            shipmentId={id!}
            quoteAmount={(quotes || []).reduce((sum, q) => sum + (q.amount || 0), 0)}
            shipmentStatus={shipment.status}
          />
        </motion.div>

        {/* Sidebar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-6">
          {/* Shipping Line Schedule - read-only view for delivered */}
          {isDelivered ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ship className="h-4 w-4 text-accent" />
                  Voyage Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Vessel" value={shipment.vessel || "—"} />
                <InfoRow label="Voyage" value={shipment.voyage || "—"} />
                <InfoRow label="ETD" value={shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "—"} />
                <InfoRow label="ETA" value={shipment.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "—"} />
              </CardContent>
            </Card>
          ) : (
            <VoyageDatesEditor
              shipmentId={id!}
              etd={shipment.etd}
              eta={shipment.eta}
              vessel={shipment.vessel}
              voyage={shipment.voyage}
            />
          )}

          {/* Cutoff Deadlines - hide for delivered */}
          {!isDelivered && (
            <CutoffTracker
              shipmentId={id!}
              etd={shipment.etd}
              cutoffs={{
                cy_cutoff: (shipment as any).cy_cutoff,
                si_cutoff: (shipment as any).si_cutoff,
                vgm_cutoff: (shipment as any).vgm_cutoff,
                doc_cutoff: (shipment as any).doc_cutoff,
              }}
            />
          )}

          {/* Carrier Rate Selection & Booking - hide for delivered */}
          {!isDelivered && (
            <CarrierRateSelector
              shipmentId={id!}
              shipmentRef={shipment.shipment_ref}
              originPort={shipment.origin_port}
              destinationPort={shipment.destination_port}
              containerType={(containers && containers.length > 0) ? containers[0].container_type : null}
            />
          )}

          {/* Carrier Communications (formerly EDI Messages) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-accent" />
                Carrier Communications
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

          {/* Document Checklist */}
          <DocumentChecklist shipmentId={id!} userId={shipment.user_id} />
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
