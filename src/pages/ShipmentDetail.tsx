import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentGenerator } from "@/components/shipment/DocumentGenerator";
import { ShipmentPnL } from "@/components/shipment/ShipmentPnL";
import { AiShipmentAssistant } from "@/components/shipment/AiShipmentAssistant";
import { AiShipmentSummary } from "@/components/shipment/AiShipmentSummary";
import { AiSmartBanners } from "@/components/shipment/AiSmartBanners";
import { PaymentStatusCard } from "@/components/shipment/PaymentStatusCard";
import { CustomerFinancialsTab } from "@/components/shipment/CustomerFinancialsTab";
import { DocumentLifecycleTimeline } from "@/components/shipment/DocumentLifecycleTimeline";
import { FinancialStatusPanel } from "@/components/shipment/FinancialStatusPanel";
import { ShipmentDocumentPack } from "@/components/shipment/ShipmentDocumentPack";
import { useUserRole } from "@/hooks/useUserRole";
import { VesselBookingPanel } from "@/components/shipment/VesselBookingPanel";
import { AirBookingPanel } from "@/components/shipment/AirBookingPanel";
import { CustomsFilingPanel } from "@/components/shipment/CustomsFilingPanel";
import { TruckingPanel } from "@/components/shipment/TruckingPanel";
import { WarehousePanel } from "@/components/shipment/WarehousePanel";
import { CarrierRateSelector } from "@/components/shipment/CarrierRateSelector";
import { AuditTrailPanel } from "@/components/shipment/AuditTrailPanel";
import { LiveTrackingPanel } from "@/components/shipment/LiveTrackingPanel";
import { NormalizedTrackingView } from "@/components/shipment/NormalizedTrackingView";
import { NormalizedBookingView } from "@/components/shipment/NormalizedBookingView";
import { NormalizedTransportDocView } from "@/components/shipment/NormalizedTransportDocView";
import { NormalizedIssuanceView } from "@/components/shipment/NormalizedIssuanceView";
import { SurrenderView } from "@/components/shipment/SurrenderView";
import { DemurrageTracker } from "@/components/shipment/DemurrageTracker";
import { CutoffTracker } from "@/components/shipment/CutoffTracker";
import { VoyageDatesEditor } from "@/components/shipment/VoyageDatesEditor";
import { AmendmentPanel } from "@/components/shipment/AmendmentPanel";
import { ShipmentChargesPanel } from "@/components/shipment/ShipmentChargesPanel";
import { DetentionTimeline } from "@/components/shipment/DetentionTimeline";
import { DocumentChecklist } from "@/components/shipment/DocumentChecklist";
import { ShipmentNextAction } from "@/components/shipment/ShipmentNextAction";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Package, FileText, Users, Clock, Check, Circle, Loader2, Radio,
  Trash2, Ship, Copy, BookmarkPlus, MapPin, ArrowRight, DollarSign,
  MessageSquare, Activity, BarChart3, AlertTriangle,
} from "lucide-react";
import { translateEdiMessage } from "@/lib/edi-translations";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_pricing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  quote_ready: "bg-accent/10 text-accent",
  
  booked: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_transit: "bg-accent/10 text-accent",
  arrived: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const formatStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const OCEAN_MILESTONES = [
  "Booking Confirmed", "Cargo Received", "Container Loaded",
  "Vessel Departed", "In Transit", "Port Arrival", "Customs Clearance", "Delivered",
];
const AIR_MILESTONES = [
  "Booking Confirmed", "Cargo Received at Origin", "Security Screening",
  "Flight Departed", "In Transit", "Arrived at Destination", "Customs Clearance", "Delivered",
];

function AiTranslatedMessage({ messageType, direction, carrier, status }: {
  messageType: string; direction: string; carrier: string; status: string;
}) {
  const { data: translation } = useQuery({
    queryKey: ["edi-translate", messageType, direction],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("translate-edi", {
        body: { message_type: messageType, direction, carrier, status },
      });
      if (error) return null;
      return data?.translation as string | null;
    },
    staleTime: Infinity,
    retry: false,
  });
  if (!translation) return null;
  return <p className="text-xs text-accent mt-1 italic">{translation}</p>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

const WORKSPACE_TABS = [
  { id: "overview", label: "Overview", icon: Package },
  { id: "booking", label: "Booking", icon: BookmarkPlus },
  { id: "transport-doc", label: "Transport Document", icon: Ship },
  { id: "issuance", label: "eBL Issuance", icon: FileText },
  { id: "surrender", label: "eBL Surrender", icon: HandCoins },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "tracking", label: "Tracking & Milestones", icon: Clock },
  { id: "parties", label: "Parties", icon: Users },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "financials", label: "Financials", icon: BarChart3 },
  { id: "activity", label: "Activity Log", icon: Activity },
];

const ShipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin, isOpsManager, isSales, isLoading: rolesLoading } = useUserRole();
  const isAdminOrInternal = isAdmin || isOpsManager || isSales;
  const [deleting, setDeleting] = useState(false);
  const [showDocGen, setShowDocGen] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  // Redirect non-internal users to customer workspace (only after roles loaded and shipment query settled)
  useEffect(() => {
    if (!rolesLoading && !isAdminOrInternal && id) {
      navigate(`/dashboard/shipments/${id}/workspace${window.location.search}`, { replace: true });
    }
  }, [rolesLoading, isAdminOrInternal, id, navigate]);


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

  // Realtime subscriptions
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

  const { data: shipment, isLoading, error: shipmentError } = useQuery({
    queryKey: ["shipment", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("*, companies!shipments_company_id_fkey(company_name)").eq("id", id!).maybeSingle();
      if (error) {
        console.error("[ShipmentDetail] query error:", error);
        throw error;
      }
      return data;
    },
    enabled: !!id,
  });

  const { data: cargo } = useQuery({
    queryKey: ["cargo", id],
    queryFn: async () => { const { data } = await supabase.from("cargo").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: containers } = useQuery({
    queryKey: ["containers", id],
    queryFn: async () => { const { data } = await supabase.from("containers").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: containerCommodities } = useQuery({
    queryKey: ["container_commodities", id],
    queryFn: async () => { const { data } = await supabase.from("container_commodities").select("*").eq("shipment_id", id!).order("line_sequence"); return data; },
    enabled: !!id,
  });

  const { data: parties } = useQuery({
    queryKey: ["parties", id],
    queryFn: async () => { const { data } = await supabase.from("shipment_parties").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: trackingEvents } = useQuery({
    queryKey: ["tracking_events", id],
    queryFn: async () => { const { data } = await supabase.from("tracking_events").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => { const { data } = await supabase.from("documents").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: quotes } = useQuery({
    queryKey: ["shipment-quotes", id],
    queryFn: async () => { const { data } = await supabase.from("quotes").select("amount, status").eq("shipment_id", id!).eq("status", "accepted"); return data; },
    enabled: !!id,
  });

  const { data: ediMessages } = useQuery({
    queryKey: ["edi_messages", id],
    queryFn: async () => { const { data } = await supabase.from("edi_messages").select("*").eq("shipment_id", id!).order("created_at", { ascending: false }); return data; },
    enabled: !!id,
  });

  const { data: customsFilingsForBanners } = useQuery({
    queryKey: ["customs_banners", id],
    queryFn: async () => { const { data } = await supabase.from("customs_filings").select("id, status").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: paymentsForBanners } = useQuery({
    queryKey: ["payments_banners", id],
    queryFn: async () => { const { data } = await supabase.from("payments").select("id, status").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const shipmentContext = useMemo(() => {
    if (!shipment) return {};
    return {
      ref: shipment.shipment_ref, status: shipment.status, mode: shipment.mode || "ocean",
      type: shipment.shipment_type, origin: shipment.origin_port, destination: shipment.destination_port,
      etd: shipment.etd, eta: shipment.eta, vessel: shipment.vessel, voyage: shipment.voyage,
      cargo: (cargo || []).map(c => ({ commodity: c.commodity, hs_code: c.hs_code, weight: c.gross_weight, volume: c.volume })),
      containers: (containers || []).map(c => ({ type: c.container_type, number: c.container_number, quantity: c.quantity })),
      parties: (parties || []).map(p => ({ role: p.role, company: p.company_name })),
      documents: (documents || []).map(d => ({ type: d.doc_type, status: d.status })),
      tracking: (trackingEvents || []).map(t => ({ milestone: t.milestone, date: t.event_date, location: t.location })),
    };
  }, [shipment, cargo, containers, parties, documents, trackingEvents]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!shipment) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-foreground mb-2">Shipment not found</h2>
          <Button variant="electric" asChild><Link to="/dashboard/shipments">Back to Shipments</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  const completedMilestones = new Map((trackingEvents || []).map((e) => [e.milestone, e]));
  const isAirShipment = shipment.mode === "air";
  const MILESTONES_ORDER = isAirShipment ? AIR_MILESTONES : OCEAN_MILESTONES;
  const milestones = MILESTONES_ORDER.map((label) => {
    const event = completedMilestones.get(label);
    return { label, date: event ? format(new Date(event.event_date), "MMM d, yyyy") : null, location: event?.location || null, completed: !!event };
  });
  const currentMilestoneIndex = (() => { let last = -1; milestones.forEach((m, i) => { if (m.completed) last = i; }); return last; })();
  const containersSummary = (containers || []).map((c) => `${c.quantity}x${c.container_type}`).join(", ") || "—";
  const firstCargo = cargo?.[0];
  const companyName = (shipment as any).companies?.company_name as string | undefined;
  const isDelivered = shipment.status === "delivered" || shipment.status === "completed" || shipment.status === "closed";
  const isBooked = ["booked", "in_transit", "arrived", "delivered", "completed", "closed"].includes(shipment.status);
  const isInTransitOrBeyond = ["in_transit", "arrived", "delivered", "completed", "closed"].includes(shipment.status);

  return (
    <DashboardLayout>
      {/* Workspace Header */}
      <div className="mb-6">
        <div className="mb-3 -ml-2"><BackButton /></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{shipment.shipment_ref}</h1>
              {isDelivered ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                  <Check className="h-3.5 w-3.5" /> Delivered
                </span>
              ) : (
                <Badge className={`text-xs ${statusColor[shipment.status] || "bg-secondary text-muted-foreground"}`}>
                  {formatStatus(shipment.status)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {companyName && <span className="font-medium text-foreground mr-2">{companyName}</span>}
              {shipment.origin_port || "—"} → {shipment.destination_port || "—"}
              <span className="mx-2 text-border">|</span>
              <span className="text-xs">{isAirShipment ? "Air" : "Ocean"} • {formatStatus(shipment.shipment_type)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {shipment.status === "draft" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete draft shipment?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete {shipment.shipment_ref}.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
                      {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/shipments/new?clone=${id}`)}>
              <Copy className="mr-2 h-4 w-4" />Clone
            </Button>
            <Button variant="electric" size="sm" onClick={() => setShowDocGen(true)}>
              <FileText className="mr-2 h-4 w-4" />Generate Docs
            </Button>
          </div>
        </div>
      </div>

      {/* Smart Next Action Banner */}
      <div className="mb-4">
        <ShipmentNextAction shipmentId={id!} shipmentStatus={shipment.status} />
      </div>

      {/* Tabbed Workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-transparent p-0 border-b border-border rounded-none pb-0">
          {WORKSPACE_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent rounded-none px-4 pb-3 text-sm gap-1.5"
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── OVERVIEW TAB ── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <AiShipmentSummary shipmentContext={shipmentContext} shipmentId={id!} />
          <AiSmartBanners shipment={shipment} documents={documents} payments={paymentsForBanners} customsFilings={customsFilingsForBanners} />

          {/* Shipment Details Card */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-accent" />Shipment Details</CardTitle></CardHeader>
            <CardContent>
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
                  </>
                ) : (
                  <>
                    <InfoRow label="Vessel" value={shipment.vessel || "TBD"} />
                    <InfoRow label="Voyage" value={shipment.voyage || "TBD"} />
                  </>
                )}
              </div>
              <Separator className="my-5" />
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4 p-4 rounded-lg bg-muted/40 border border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Origin</h4>
                  <InfoRow label={isAirShipment ? "Airport" : "Port"} value={shipment.origin_port || "—"} />
                  <InfoRow label="ETD" value={shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "TBD"} />
                </div>
                <div className="space-y-4 p-4 rounded-lg bg-muted/40 border border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination</h4>
                  <InfoRow label={isAirShipment ? "Airport" : "Port"} value={shipment.destination_port || "—"} />
                  <InfoRow label="ETA" value={shipment.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "TBD"} />
                </div>
              </div>
              {/* Cargo summary */}
              {firstCargo && (
                <>
                  <Separator className="my-5" />
                  <h4 className="text-sm font-semibold text-foreground mb-3">Cargo</h4>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                    <InfoRow label="Commodity" value={firstCargo.commodity || "—"} />
                    <InfoRow label="HS Code" value={firstCargo.hs_code || "—"} />
                    <InfoRow label="Gross Weight" value={firstCargo.gross_weight ? `${firstCargo.gross_weight} kg` : "—"} />
                    <InfoRow label="Volume" value={firstCargo.volume ? `${firstCargo.volume} CBM` : "—"} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Execution panels for overview */}
          {!isDelivered && !isBooked && !isAirShipment && <VesselBookingPanel shipmentId={id!} variant="shipper" bookingRef={shipment.booking_ref} />}
          {!isDelivered && isAirShipment && (
            <AirBookingPanel shipmentId={id!} airline={(shipment as any).airline} flightNumber={(shipment as any).flight_number} mawbNumber={(shipment as any).mawb_number} bookingRef={shipment.booking_ref} />
          )}
          <CustomsFilingPanel shipmentId={id!} mode={isAirShipment ? "air" : "ocean"} />
          <TruckingPanel shipmentId={id!} shipmentStatus={shipment.status} />
          <WarehousePanel shipmentId={id!} />
        </TabsContent>

        {/* ── BOOKING TAB ── */}
        <TabsContent value="booking" className="mt-6 space-y-6">
          <NormalizedBookingView shipmentId={id!} />
        </TabsContent>

        {/* ── TRANSPORT DOCUMENT TAB ── */}
        <TabsContent value="transport-doc" className="mt-6 space-y-6">
          <NormalizedTransportDocView shipmentId={id!} />
        </TabsContent>

        {/* ── eBL ISSUANCE TAB ── */}
        <TabsContent value="issuance" className="mt-6 space-y-6">
          <NormalizedIssuanceView shipmentId={id!} />
        </TabsContent>

        {/* ── PRICING TAB ── */}
        <TabsContent value="pricing" className="mt-6 space-y-6">
          {/* Rate Selection (pre-booking) */}
          {!isBooked && !isAirShipment && (
            <CarrierRateSelector
              shipmentId={id!}
              shipmentRef={shipment.shipment_ref}
              originPort={shipment.origin_port}
              destinationPort={shipment.destination_port}
              containerType={(containers && containers.length > 0) ? containers[0].container_type : null}
            />
          )}

          {/* Embedded Pricing Engine */}
          <PricingEngineEmbed shipmentId={id!} shipmentType={shipment.shipment_type} mode={shipment.mode || "ocean"} />

          {/* Charges & Fees */}
          <ShipmentChargesPanel shipmentId={id!} />
          <PaymentStatusCard shipmentId={id!} />
        </TabsContent>

        {/* ── DOCUMENTS TAB ── */}
        <TabsContent value="documents" className="mt-6 space-y-6">
          <ShipmentDocumentPack shipmentId={id!} shipmentRef={shipment.shipment_ref} mode={isAirShipment ? "air" : "ocean"} />
          <DocumentChecklist shipmentId={id!} userId={shipment.user_id} />
          <AmendmentPanel shipmentId={id!} vesselDeparted={isInTransitOrBeyond} />
        </TabsContent>

        {/* ── TRACKING TAB ── */}
        <TabsContent value="tracking" className="mt-6 space-y-6">
          {/* Milestone Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-accent" />Shipment Tracking</CardTitle></CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-border hidden md:block" />
                <div className="absolute top-4 left-4 h-0.5 bg-emerald-500 hidden md:block" style={{
                  width: currentMilestoneIndex >= 0 ? `${(currentMilestoneIndex / (milestones.length - 1)) * 100}%` : '0%',
                  maxWidth: 'calc(100% - 2rem)',
                }} />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {milestones.map((milestone, i) => (
                    <div key={milestone.label} className="flex flex-col items-center text-center relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 mb-3 transition-all ${
                        milestone.completed
                          ? i === currentMilestoneIndex
                            ? "bg-emerald-500 text-white ring-4 ring-emerald-500/25"
                            : "bg-emerald-500 text-white"
                          : "bg-secondary border-2 border-border text-muted-foreground"
                      }`}>
                        {milestone.completed ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Circle className="h-3 w-3" />}
                      </div>
                      <p className={`text-xs font-medium leading-tight mb-1 ${milestone.completed ? "text-foreground" : "text-muted-foreground"}`}>{milestone.label}</p>
                      {milestone.date && <p className="text-[10px] text-muted-foreground">{milestone.date}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voyage Dates */}
          <VoyageDatesEditor shipmentId={id!} etd={shipment.etd} eta={shipment.eta} vessel={shipment.vessel} voyage={shipment.voyage} readOnly={isInTransitOrBeyond} />

          {/* Cutoff Deadlines */}
          {!isDelivered && (
            <CutoffTracker shipmentId={id!} etd={shipment.etd} cutoffs={{
              cy_cutoff: (shipment as any).cy_cutoff, si_cutoff: (shipment as any).si_cutoff,
              vgm_cutoff: (shipment as any).vgm_cutoff, doc_cutoff: (shipment as any).doc_cutoff,
            }} />
          )}

          {/* Normalized Carrier Tracking View */}
          <NormalizedTrackingView shipmentId={id!} />

          {/* Carrier Communications */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Radio className="h-4 w-4 text-accent" />Carrier Communications</CardTitle></CardHeader>
            <CardContent>
              {ediMessages && ediMessages.length > 0 ? (
                <div className="space-y-3">
                  {ediMessages.map((msg) => {
                    const translated = translateEdiMessage(msg.message_type, msg.direction, msg.carrier);
                    return (
                      <div key={msg.id} className="py-2.5 border-b last:border-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={msg.direction === "inbound" ? "secondary" : "default"} className="text-[10px]">
                                {msg.direction === "inbound" ? "← Received" : "→ Sent"}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground font-medium">{translated.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{translated.description}</p>
                            {!translated.isKnown && <AiTranslatedMessage messageType={msg.message_type} direction={msg.direction} carrier={msg.carrier} status={msg.status} />}
                          </div>
                          <p className="text-[10px] text-muted-foreground ml-3">{format(new Date(msg.created_at), "MMM d, HH:mm")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No carrier communications yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Demurrage */}
          {!isAirShipment && isDelivered && <DemurrageTracker shipmentId={id!} shipmentStatus={shipment.status} />}
          {!isAirShipment && isDelivered && <DetentionTimeline eta={shipment.eta} />}
        </TabsContent>

        {/* ── PARTIES TAB ── */}
        <TabsContent value="parties" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-accent" />Parties & Partners</CardTitle></CardHeader>
            <CardContent>
              {parties && parties.length > 0 ? (
                <div className="space-y-4">
                  {parties.map((party) => (
                    <div key={party.id} className="flex items-start justify-between py-3 border-b last:border-0">
                      <div>
                        <Badge variant="secondary" className="text-[10px] mb-1">{party.role}</Badge>
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
              ) : (
                <p className="text-sm text-muted-foreground">No parties assigned yet. Parties are managed in the shipment workspace.</p>
              )}
            </CardContent>
          </Card>
          <AiShipmentAssistant shipmentContext={shipmentContext} />
        </TabsContent>

        {/* ── MESSAGES TAB ── */}
        <TabsContent value="messages" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-accent" />
                Shipment Messages
              </CardTitle>
              <CardDescription>Communication thread for this shipment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">No messages yet</p>
                <p className="text-xs text-muted-foreground">Use the chat drawer to start a conversation about this shipment.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FINANCIALS TAB ── */}
        <TabsContent value="financials" className="mt-6 space-y-6">
          {/* Document & Payment Lifecycle Timeline */}
          <DocumentLifecycleTimeline shipmentId={id!} />
          {/* Financial Status & Payment Flow */}
          <FinancialStatusPanel shipmentId={id!} />

          {isAdminOrInternal ? (
            <>
              <ShipmentPnL shipmentId={id!} quoteAmount={(quotes || []).reduce((sum, q) => sum + (q.amount || 0), 0)} shipmentStatus={shipment.status} />
              <ShipmentChargesPanel shipmentId={id!} />
              <PaymentStatusCard shipmentId={id!} />
            </>
          ) : (
            <CustomerFinancialsTab
              shipmentId={id!}
              shipmentRef={shipment.shipment_ref}
              customerName={(shipment as any).companies?.company_name}
            />
          )}
        </TabsContent>

        {/* ── ACTIVITY LOG TAB ── */}
        <TabsContent value="activity" className="mt-6 space-y-6">
          <AuditTrailPanel shipmentId={id!} />
        </TabsContent>
      </Tabs>

      {/* Document Generator Dialog */}
      <DocumentGenerator shipmentId={id!} shipmentRef={shipment.shipment_ref} mode={isAirShipment ? "air" : "ocean"} open={showDocGen} onOpenChange={setShowDocGen} />
    </DashboardLayout>
  );
};

/* ── Embedded Pricing Engine (simplified for shipment context) ── */
function PricingEngineEmbed({ shipmentId, shipmentType, mode }: { shipmentId: string; shipmentType: string; mode: string }) {
  const [directCost, setDirectCost] = useState(0);
  const [freightCost, setFreightCost] = useState(0);
  const [truckingCost, setTruckingCost] = useState(0);
  const [terminalCost, setTerminalCost] = useState(0);
  const [docFees, setDocFees] = useState(0);
  const [customsCost, setCustomsCost] = useState(0);
  const [otherDirect, setOtherDirect] = useState(0);

  const [variableCost, setVariableCost] = useState(0);
  const [agentComm, setAgentComm] = useState(0);
  const [insuranceCost, setInsuranceCost] = useState(0);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const marginDefaults: Record<string, { min: number; target: number; stretch: number }> = {
    fcl: { min: 6, target: 8, stretch: 10 },
    lcl: { min: 12, target: 17, stretch: 22 },
    air: { min: 10, target: 13, stretch: 16 },
    trucking: { min: 6, target: 9, stretch: 12 },
  };

  const typeKey = shipmentType?.toLowerCase().includes("fcl") ? "fcl"
    : shipmentType?.toLowerCase().includes("lcl") ? "lcl"
    : mode === "air" ? "air" : "fcl";

  const margins = marginDefaults[typeKey] || marginDefaults.fcl;
  const [targetMargin, setTargetMargin] = useState(margins.target);

  const totalDirect = freightCost + truckingCost + terminalCost + docFees + customsCost + otherDirect;
  const totalVariable = variableCost + agentComm + insuranceCost;
  const trueCost = totalDirect + totalVariable;

  const adjustedMarginPct = targetMargin / 100;
  const breakEvenPrice = trueCost;
  const minSellPrice = adjustedMarginPct >= 1 ? trueCost * 2 : trueCost / (1 - margins.min / 100);
  const recommendedSellPrice = adjustedMarginPct >= 1 ? trueCost * 2 : trueCost / (1 - adjustedMarginPct);
  const stretchSellPrice = adjustedMarginPct >= 1 ? trueCost * 2 : trueCost / (1 - margins.stretch / 100);

  const grossProfit = recommendedSellPrice - totalDirect;
  const netProfit = recommendedSellPrice - trueCost;
  const netMarginPct = recommendedSellPrice > 0 ? (netProfit / recommendedSellPrice) * 100 : 0;

  const isLowMargin = netMarginPct < margins.min;
  const isBelowCost = recommendedSellPrice < trueCost;

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {trueCost > 0 && isBelowCost && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Sell price is below total cost
        </div>
      )}
      {trueCost > 0 && isLowMargin && !isBelowCost && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 p-3 flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Net margin below minimum target ({margins.min}%)
        </div>
      )}

      {/* 3-Panel Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: Cost Inputs */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Cost Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Direct Costs</h4>
              <div className="space-y-2">
                {[
                  { label: "Freight", value: freightCost, set: setFreightCost },
                  { label: "Trucking", value: truckingCost, set: setTruckingCost },
                  { label: "Terminal", value: terminalCost, set: setTerminalCost },
                  { label: "Docs", value: docFees, set: setDocFees },
                  { label: "Customs", value: customsCost, set: setCustomsCost },
                  { label: "Other", value: otherDirect, set: setOtherDirect },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <label className="text-[10px] text-muted-foreground w-14 shrink-0">{f.label}</label>
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
                      <input type="number" value={f.value || ""} onChange={(e) => f.set(Number(e.target.value) || 0)}
                        className="flex h-8 w-full rounded-md border border-input bg-background pl-5 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="0" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-right text-xs font-semibold">Direct: <span className="tabular-nums">${totalDirect.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
            </div>
            <Separator />
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Variable Costs</h4>
              <div className="space-y-2">
                {[
                  { label: "Platform", value: variableCost, set: setVariableCost },
                  { label: "Agent", value: agentComm, set: setAgentComm },
                  { label: "Insurance", value: insuranceCost, set: setInsuranceCost },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <label className="text-[10px] text-muted-foreground w-14 shrink-0">{f.label}</label>
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
                      <input type="number" value={f.value || ""} onChange={(e) => f.set(Number(e.target.value) || 0)}
                        className="flex h-8 w-full rounded-md border border-input bg-background pl-5 pr-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Margin Target</h4>
              <input type="number" step="0.5" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value) || 0)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-2" />
              <div className="flex gap-1.5">
                {[
                  { label: "Min", value: margins.min },
                  { label: "Target", value: margins.target },
                  { label: "Stretch", value: margins.stretch },
                ].map((m) => (
                  <button key={m.label} onClick={() => setTargetMargin(m.value)}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                      targetMargin === m.value ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:border-accent/30"
                    }`}>
                    {m.label} {m.value}%
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CENTER: Price Outputs */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-accent" />
              Pricing Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trueCost > 0 ? (
              <div className="space-y-3">
                {[
                  { label: "Break Even", value: breakEvenPrice, color: "text-muted-foreground", bg: "bg-muted/30" },
                  { label: "Minimum Sell Price", value: minSellPrice, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/10" },
                  { label: "Recommended Price", value: recommendedSellPrice, color: "text-accent", bg: "bg-accent/5 border-accent/20" },
                  { label: "Stretch Price", value: stretchSellPrice, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/10" },
                ].map((p) => (
                  <div key={p.label} className={`rounded-xl border p-4 ${p.bg}`}>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{p.label}</p>
                    <p className={`text-2xl font-bold tabular-nums ${p.color}`}>
                      ${p.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Enter costs to calculate pricing</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Profit & Margin */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Profit & Margin</CardTitle>
          </CardHeader>
          <CardContent>
            {trueCost > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {[
                    { label: "Total Cost", value: trueCost, color: "text-foreground" },
                    { label: "Gross Profit", value: grossProfit, color: grossProfit >= 0 ? "text-emerald-600" : "text-destructive" },
                    { label: "Net Profit", value: netProfit, color: netProfit >= 0 ? "text-emerald-600" : "text-destructive" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className={`text-sm font-semibold tabular-nums ${item.color}`}>
                        ${item.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={`rounded-xl p-4 text-center ${netMarginPct >= margins.min ? "bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800" : "bg-destructive/5 border border-destructive/20"}`}>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Net Margin</p>
                  <p className={`text-3xl font-bold tabular-nums ${netMarginPct >= margins.min ? "text-emerald-600" : "text-destructive"}`}>
                    {netMarginPct.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Target: {margins.min}% – {margins.stretch}%
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Margins will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ShipmentDetail;
