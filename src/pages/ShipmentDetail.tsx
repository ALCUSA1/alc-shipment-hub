import { useState, useEffect } from "react";
import { DocumentGenerator } from "@/components/shipment/DocumentGenerator";
import { ShipmentPnL } from "@/components/shipment/ShipmentPnL";
import { PaymentStatusCard } from "@/components/shipment/PaymentStatusCard";
import { VesselBookingPanel } from "@/components/shipment/VesselBookingPanel";
import { AirBookingPanel } from "@/components/shipment/AirBookingPanel";
import { AirlineRateSelector } from "@/components/shipment/AirlineRateSelector";
import { CustomsFilingPanel } from "@/components/shipment/CustomsFilingPanel";
import { TruckingPanel } from "@/components/shipment/TruckingPanel";
import { WarehousePanel } from "@/components/shipment/WarehousePanel";
import { CarrierRateSelector } from "@/components/shipment/CarrierRateSelector";
import { AuditTrailPanel } from "@/components/shipment/AuditTrailPanel";
import { LiveTrackingPanel } from "@/components/shipment/LiveTrackingPanel";
import { DemurrageTracker } from "@/components/shipment/DemurrageTracker";
import { CutoffTracker } from "@/components/shipment/CutoffTracker";
import { VoyageDatesEditor } from "@/components/shipment/VoyageDatesEditor";
import { AmendmentPanel } from "@/components/shipment/AmendmentPanel";
import { ShipmentChargesPanel } from "@/components/shipment/ShipmentChargesPanel";
import { DetentionTimeline } from "@/components/shipment/DetentionTimeline";
import { DocumentChecklist } from "@/components/shipment/DocumentChecklist";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ShipmentNextAction } from "@/components/shipment/ShipmentNextAction";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, FileText, Users, Clock, Check, Circle, Loader2, Radio, Trash2, Ship, Copy, BookmarkPlus } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const OCEAN_MILESTONES = [
  "Booking Confirmed", "Cargo Received", "Container Loaded",
  "Vessel Departed", "In Transit", "Port Arrival", "Customs Clearance", "Delivered",
];

const AIR_MILESTONES = [
  "Booking Confirmed", "Cargo Received at Origin", "Security Screening",
  "Flight Departed", "In Transit", "Arrived at Destination", "Customs Clearance", "Delivered",
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
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [showDocGen, setShowDocGen] = useState(false);

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

  const isAirShipment = shipment.mode === "air";
  const MILESTONES_ORDER = isAirShipment ? AIR_MILESTONES : OCEAN_MILESTONES;
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
        <div className="mb-4 -ml-2">
          <BackButton />
        </div>
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
              {isAirShipment && shipment.mawb_number && <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded mr-2">MAWB: {shipment.mawb_number}</span>}
              {shipment.origin_port || "—"} → {shipment.destination_port || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
            <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/shipments/new?clone=${id}`)}>
              <Copy className="mr-2 h-4 w-4" />
              Clone
            </Button>
            <Button variant="outline" size="sm" onClick={async () => {
              if (!user || !shipment) return;
              try {
                const { error } = await supabase.from("shipment_templates").insert({
                  user_id: user.id,
                  name: `${shipment.shipment_ref} Template`,
                  shipment_type: shipment.shipment_type,
                  mode: shipment.mode || "ocean",
                  origin_port: shipment.origin_port,
                  destination_port: shipment.destination_port,
                  pickup_location: shipment.pickup_location,
                  delivery_location: shipment.delivery_location,
                  commodity: firstCargo?.commodity || null,
                  hs_code: firstCargo?.hs_code || null,
                  container_type: containers?.[0]?.container_type || null,
                  container_count: containers?.length || 1,
                  incoterm: (shipment as any).incoterm || null,
                  parties: JSON.stringify((parties || []).map(p => ({ role: p.role, company_name: p.company_name, contact_name: p.contact_name }))),
                  cargo: JSON.stringify((cargo || []).map(c => ({ commodity: c.commodity, hs_code: c.hs_code, gross_weight: c.gross_weight, volume: c.volume }))),
                });
                if (error) throw error;
                toast({ title: "Template saved", description: "Shipment saved as reusable template." });
              } catch (err: any) {
                toast({ title: "Failed to save template", description: err.message, variant: "destructive" });
              }
            }}>
              <BookmarkPlus className="mr-2 h-4 w-4" />
              Save Template
            </Button>
            <Button variant="electric" size="sm" onClick={() => setShowDocGen(true)}>
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
              {/* General Info */}
              <div className="grid sm:grid-cols-3 gap-x-8 gap-y-4 mb-6">
                <InfoRow label="Shipment Type" value={formatStatus(shipment.shipment_type)} />
                <InfoRow label="Mode" value={isAirShipment ? "Air" : "Ocean"} />
                <InfoRow label="Status" value={formatStatus(shipment.status)} />
                <InfoRow label="Booking Ref" value={shipment.booking_ref || "—"} />
                <InfoRow label="Containers" value={containersSummary} />
                {isAirShipment ? (
                  <>
                    <InfoRow label="Airline" value={(shipment as any).airline || "TBD"} />
                    <InfoRow label="Flight" value={(shipment as any).flight_number || "TBD"} />
                    <InfoRow label="MAWB" value={(shipment as any).mawb_number || "TBD"} />
                    <InfoRow label="HAWB" value={(shipment as any).hawb_number || "—"} />
                  </>
                ) : (
                  <>
                    <InfoRow label="Vessel" value={shipment.vessel || "TBD"} />
                    <InfoRow label="Voyage" value={shipment.voyage || "TBD"} />
                  </>
                )}
              </div>

              <Separator className="my-5" />

              {/* Origin ↔ Destination side by side */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 rounded-lg bg-muted/40 border border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Origin</h4>
                  <InfoRow label={isAirShipment ? "Airport" : "Port"} value={shipment.origin_port || "—"} />
                  <InfoRow label="Pickup Location" value={shipment.pickup_location || "—"} />
                  <InfoRow label="ETD" value={shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "TBD"} />
                </div>
                <div className="space-y-4 p-4 rounded-lg bg-muted/40 border border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination</h4>
                  <InfoRow label={isAirShipment ? "Airport" : "Port"} value={shipment.destination_port || "—"} />
                  <InfoRow label="Delivery Location" value={shipment.delivery_location || "—"} />
                  <InfoRow label="ETA" value={shipment.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "TBD"} />
                </div>
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

          {/* Demurrage & Detention (Ocean only) */}
          {!isAirShipment && (
            <DemurrageTracker shipmentId={id!} shipmentStatus={shipment.status} />
          )}

          {/* Detention Timeline (Ocean only) */}
          {!isAirShipment && (
            <DetentionTimeline eta={shipment.eta} />
          )}

          {/* Amendments & Corrections */}
          <AmendmentPanel
            shipmentId={id!}
            vesselDeparted={["in_transit", "arrived", "delivered", "completed"].includes(shipment.status)}
          />

          {/* Vessel Bookings - read-only for delivered */}
          {!isDelivered && !isAirShipment && <div data-guide="vessel"><VesselBookingPanel shipmentId={id!} variant="shipper" bookingRef={shipment.booking_ref} /></div>}
          {!isDelivered && isAirShipment && (
            <AirBookingPanel
              shipmentId={id!}
              airline={(shipment as any).airline}
              flightNumber={(shipment as any).flight_number}
              mawbNumber={(shipment as any).mawb_number}
              bookingRef={shipment.booking_ref}
            />
          )}

          {/* Customs / AES Filing */}
          <div data-guide="customs">
            <CustomsFilingPanel shipmentId={id!} mode={isAirShipment ? "air" : "ocean"} />
          </div>

          {/* Trucking */}
          <div data-guide="trucking">
            <TruckingPanel shipmentId={id!} shipmentStatus={shipment.status} />
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

          {/* Audit Trail / Activity Log */}
          <AuditTrailPanel shipmentId={id!} />
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
          {!isDelivered && !isAirShipment && (
            <CarrierRateSelector
              shipmentId={id!}
              shipmentRef={shipment.shipment_ref}
              originPort={shipment.origin_port}
              destinationPort={shipment.destination_port}
              containerType={(containers && containers.length > 0) ? containers[0].container_type : null}
            />
          )}

          {/* Live Tracking */}
          <LiveTrackingPanel
            shipmentId={id!}
            mode={isAirShipment ? "air" : "ocean"}
            bookingRef={shipment.booking_ref}
            vessel={shipment.vessel}
            voyage={shipment.voyage}
            airline={(shipment as any).airline}
            flightNumber={(shipment as any).flight_number}
            mawbNumber={(shipment as any).mawb_number}
          />

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

          {/* Charges & Fees */}
          <ShipmentChargesPanel shipmentId={id!} />

          {/* Payment Status */}
          <PaymentStatusCard shipmentId={id!} />

          {/* Document Checklist */}
          <div data-guide="documents">
            <DocumentChecklist shipmentId={id!} userId={shipment.user_id} />
          </div>
        </motion.div>
      </div>

      {/* Document Generator Dialog */}
      <DocumentGenerator
        shipmentId={id!}
        shipmentRef={shipment.shipment_ref}
        mode={isAirShipment ? "air" : "ocean"}
        open={showDocGen}
        onOpenChange={setShowDocGen}
      />
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
