import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CustomerFinancialsTab } from "@/components/shipment/CustomerFinancialsTab";
import { LogisticsServicesPanel } from "@/components/shipment/LogisticsServicesPanel";
import { DocumentChecklist } from "@/components/shipment/DocumentChecklist";
import { AuditTrailPanel } from "@/components/shipment/AuditTrailPanel";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Package, FileText, Clock, Check, Circle, MapPin, ArrowRight,
  MessageSquare, Activity, BarChart3, Ship, Plane, Truck,
  Shield, Download, Receipt, Eye, AlertTriangle, CheckCircle2,
  Anchor, Globe, Container, CalendarDays, RefreshCw, Info,
  Share2, Sparkles, Phone, Mail, ExternalLink, Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyRole } from "@/hooks/useCompanyRole";
import { canSeeTab, hasCapability, type WorkspaceTab } from "@/lib/company-permissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";

/* ── Status badge map ── */
const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_pricing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  quote_ready: "bg-accent/10 text-accent",
  awaiting_approval: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  booked: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_transit: "bg-accent/10 text-accent",
  arrived: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const fmt = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

/* ── Lifecycle Stages ── */
const LIFECYCLE_STAGES = [
  { key: "request_created", label: "Request Created", icon: Package },
  { key: "quote_approved", label: "Quote Approved", icon: CheckCircle2 },
  { key: "booking_confirmed", label: "Booking Confirmed", icon: Anchor },
  { key: "pickup_scheduled", label: "Pickup Scheduled", icon: Truck },
  { key: "pickup_completed", label: "Pickup Completed", icon: Check },
  { key: "aes_submitted", label: "Export Clearance Submitted", icon: Shield },
  { key: "aes_approved", label: "Export Clearance Approved", icon: CheckCircle2 },
  { key: "cargo_received", label: "Cargo at Terminal", icon: Container },
  { key: "departed", label: "Departed Origin", icon: Ship },
  { key: "in_transit", label: "In Transit", icon: Globe },
  { key: "arrived_destination", label: "Arrived Destination", icon: MapPin },
  { key: "customs_released", label: "Customs Released", icon: Shield },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
  { key: "financially_closed", label: "Financially Closed", icon: Receipt },
];

/* ── Customer Workspace Tabs ── */
const CUSTOMER_TABS = [
  { id: "overview", label: "Overview", icon: Package },
  { id: "tracking", label: "Tracking & Milestones", icon: Clock },
  { id: "booking", label: "Booking", icon: Anchor },
  { id: "logistics", label: "Logistics Services", icon: Truck },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "financials", label: "Financials", icon: BarChart3 },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "activity", label: "Activity Log", icon: Activity },
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

/* ── Summary Status Card ── */
function StatusCard({ icon: Icon, label, status, color }: { icon: any; label: string; status: string; color: "green" | "yellow" | "blue" | "red" | "muted" }) {
  const colors = {
    green: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    yellow: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    red: "bg-destructive/10 text-destructive border-destructive/20",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${colors[color]}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-sm font-semibold">{status}</p>
      </div>
    </div>
  );
}

/* ── Spark Share Dialog ── */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

function SparkShareDialog({ open, onOpenChange, shipment, onNavigateToSpark }: {
  open: boolean; onOpenChange: (o: boolean) => void; shipment: any; onNavigateToSpark: () => void;
}) {
  const route = `${shipment.origin_port || "Origin"} → ${shipment.destination_port || "Destination"}`;
  const ref = shipment.shipment_ref || shipment.id?.slice(0, 8);
  const status = (shipment.lifecycle_stage || shipment.status || "").replace(/_/g, " ");
  const shareText = `Shipment ${ref}: ${route}. Status: ${status}. ${shipment.eta ? `ETA: ${shipment.eta}` : ""}`.trim();
  const shareUrl = `${window.location.origin}/dashboard/shipments/${shipment.id}/workspace`;

  const copyLink = () => { navigator.clipboard.writeText(shareUrl); toast({ title: "Link copied!" }); onOpenChange(false); };
  const openWA = () => { window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`, "_blank"); onOpenChange(false); };
  const openSMS = () => { window.open(`sms:?body=${encodeURIComponent(shareText + "\n" + shareUrl)}`, "_blank"); onOpenChange(false); };
  const openEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(`Shipment Update: ${ref}`)}&body=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`, "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Share Shipment</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-3">
          <Button variant="outline" className="w-full justify-start gap-3 h-11 text-sm" onClick={() => { onOpenChange(false); onNavigateToSpark(); }}>
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Sparkles className="h-3.5 w-3.5 text-primary" /></div>
            Post on Spark
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-11 text-sm" onClick={copyLink}>
            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0"><ExternalLink className="h-3.5 w-3.5 text-foreground" /></div>
            Copy Link
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-11 text-sm" onClick={openWA}>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Phone className="h-3.5 w-3.5 text-emerald-600" /></div>
            WhatsApp
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-11 text-sm" onClick={openSMS}>
            <div className="h-7 w-7 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0"><MessageSquare className="h-3.5 w-3.5 text-sky-600" /></div>
            SMS
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-11 text-sm" onClick={openEmail}>
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Mail className="h-3.5 w-3.5 text-primary" /></div>
            Email
          </Button>
        </div>
        <div className="bg-muted/40 rounded-lg p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Preview</p>
          <p className="text-xs text-foreground">{shareText}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Component ── */
const CustomerShipmentWorkspace = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { role: companyRole } = useCompanyRole();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [sparkShareOpen, setSparkShareOpen] = useState(false);
  const navigate = useNavigate();

  // Filter tabs based on company role
  const visibleTabs = useMemo(() =>
    CUSTOMER_TABS.filter(tab => canSeeTab(companyRole, tab.id as WorkspaceTab)),
    [companyRole]
  );
  const canEdit = hasCapability(companyRole, "edit_shipment");
  const canUploadDocs = hasCapability(companyRole, "upload_documents");
  const isReadOnly = companyRole === "viewer";

  /* ── Realtime ── */
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`cust-shipment-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments', filter: `id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["cust-shipment", id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_events', filter: `shipment_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["cust-tracking", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  /* ── Queries ── */
  const { data: shipment, isLoading } = useQuery({
    queryKey: ["cust-shipment", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("*, companies!shipments_company_id_fkey(company_name)").eq("id", id!).maybeSingle();
      if (error) { console.error("[CustomerWorkspace] query error:", error); throw error; }
      return data;
    },
    enabled: !!id,
  });

  const { data: cargo } = useQuery({
    queryKey: ["cust-cargo", id],
    queryFn: async () => { const { data } = await supabase.from("cargo").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: containers } = useQuery({
    queryKey: ["cust-containers", id],
    queryFn: async () => { const { data } = await supabase.from("containers").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: parties } = useQuery({
    queryKey: ["cust-parties", id],
    queryFn: async () => { const { data } = await supabase.from("shipment_parties").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: trackingEvents } = useQuery({
    queryKey: ["cust-tracking", id],
    queryFn: async () => { const { data } = await supabase.from("tracking_events").select("*").eq("shipment_id", id!).order("event_date", { ascending: true }); return data; },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ["cust-documents", id],
    queryFn: async () => { const { data } = await supabase.from("documents").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: customsFilings } = useQuery({
    queryKey: ["cust-customs", id],
    queryFn: async () => { const { data } = await supabase.from("customs_filings").select("id, status, filing_type, created_at, itn, export_date").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: truckPickups } = useQuery({
    queryKey: ["cust-pickups", id],
    queryFn: async () => { const { data } = await supabase.from("truck_pickups").select("*").eq("shipment_id", id!).order("created_at"); return data; },
    enabled: !!id,
  });

  const { data: shipmentServices } = useQuery({
    queryKey: ["cust-services", id],
    queryFn: async () => { const { data } = await supabase.from("shipment_services").select("*").eq("shipment_id", id!).maybeSingle(); return data; },
    enabled: !!id,
  });

  /* ── Loading / Not Found ── */
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-3 gap-4"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
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

  const isAir = shipment.mode === "air";
  const companyName = (shipment as any).companies?.company_name as string | undefined;
  const containersSummary = (containers || []).map(c => `${c.quantity || 1}x${c.container_type}`).join(", ") || "—";
  const firstCargo = cargo?.[0];

  /* ── Derive milestone completions from tracking_events ── */
  const completedMilestones = new Set((trackingEvents || []).map(e => e.milestone));
  const lifecycleStatus = shipment.lifecycle_stage || shipment.status;

  /* Map lifecycle_stage to completed lifecycle stages */
  const stageOrder = ["draft", "pending_pricing", "quote_ready", "awaiting_approval", "booked", "in_transit", "delivered", "closed"];
  const currentStageIndex = stageOrder.indexOf(lifecycleStatus);

  const getLifecycleCompletion = (stageKey: string): "completed" | "current" | "upcoming" => {
    const stageMapping: Record<string, number> = {
      request_created: 0,
      quote_approved: 2,
      booking_confirmed: 4,
      pickup_scheduled: 4,
      pickup_completed: 4,
      aes_submitted: 4,
      aes_approved: 4,
      cargo_received: 4,
      departed: 5,
      in_transit: 5,
      arrived_destination: 5,
      customs_released: 5,
      out_for_delivery: 6,
      delivered: 6,
      financially_closed: 7,
    };
    const requiredIndex = stageMapping[stageKey] ?? 99;

    // Check tracking events for specific milestones
    if (completedMilestones.has(stageKey) || completedMilestones.has(stageKey.replace(/_/g, " "))) return "completed";

    if (currentStageIndex > requiredIndex) return "completed";
    if (currentStageIndex === requiredIndex) return "current";
    return "upcoming";
  };

  const currentLifecycleIndex = LIFECYCLE_STAGES.reduce((last, stage, i) => {
    const s = getLifecycleCompletion(stage.key);
    return s === "completed" || s === "current" ? i : last;
  }, -1);

  /* ── Derive summary status cards ── */
  const bookingStatus = currentStageIndex >= 4 ? { status: "Confirmed", color: "green" as const } : currentStageIndex >= 2 ? { status: "Quote Ready", color: "blue" as const } : { status: "Pending", color: "yellow" as const };
  const hasCustomsFiling = (customsFilings || []).length > 0;
  const customsStatus = hasCustomsFiling
    ? (customsFilings || []).some(f => f.status === "accepted" || f.status === "itn_received") ? { status: "Cleared", color: "green" as const } : { status: "In Progress", color: "yellow" as const }
    : { status: "Not Required", color: "muted" as const };
  const hasPickup = (truckPickups || []).length > 0;
  const originPickupStatus = hasPickup
    ? (truckPickups || []).some(p => p.status === "delivered" || p.status === "completed") ? { status: "Completed", color: "green" as const } : { status: "Scheduled", color: "blue" as const }
    : { status: "N/A", color: "muted" as const };
  const transitStatus = currentStageIndex >= 6 ? { status: "Delivered", color: "green" as const } : currentStageIndex >= 5 ? { status: "In Transit", color: "blue" as const } : { status: "Awaiting", color: "muted" as const };
  const deliveryStatus = currentStageIndex >= 6 ? { status: "Delivered", color: "green" as const } : hasPickup ? { status: "Scheduled", color: "blue" as const } : { status: "Pending", color: "muted" as const };

  /* ── Alerts ── */
  const alerts: { type: "red" | "yellow" | "blue"; message: string }[] = [];
  const missingDocs = (documents || []).filter(d => d.status === "pending" && !d.file_url);
  if (missingDocs.length > 0) alerts.push({ type: "yellow", message: `${missingDocs.length} document(s) still required` });
  if (hasCustomsFiling && (customsFilings || []).some(f => f.status === "rejected")) alerts.push({ type: "red", message: "Export filing rejected — action required" });
  if (lifecycleStatus === "awaiting_approval") alerts.push({ type: "yellow", message: "Quote awaiting your approval" });

  /* ── Next Action ── */
  const nextAction = (() => {
    if (lifecycleStatus === "awaiting_approval") return "Approve quote to proceed with booking";
    if (missingDocs.length > 0) return "Upload missing documents";
    if (lifecycleStatus === "pending_pricing") return "Awaiting pricing — no action needed";
    if (lifecycleStatus === "booked") return "Booking confirmed — awaiting departure";
    if (lifecycleStatus === "in_transit") return "Shipment in transit — track progress";
    if (lifecycleStatus === "delivered") return "Shipment delivered — review invoice";
    return "No action needed at this time";
  })();

  return (
    <DashboardLayout>
      {/* ── HEADER ── */}
      <div className="mb-6">
        <div className="mb-3 -ml-2"><BackButton /></div>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-2xl font-bold text-foreground">{shipment.shipment_ref}</h1>
              <Badge className={`text-xs ${statusColor[shipment.status] || "bg-secondary text-muted-foreground"}`}>
                {fmt(shipment.status)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {companyName && <span className="font-medium text-foreground">{companyName}</span>}
              <span className="flex items-center gap-1">{shipment.origin_port || "—"} <ArrowRight className="h-3 w-3" /> {shipment.destination_port || "—"}</span>
              <span className="text-xs">{isAir ? "Air" : "Ocean"} • {fmt(shipment.shipment_type)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
              {shipment.etd && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />ETD: {format(new Date(shipment.etd), "MMM d, yyyy")}</span>}
              {shipment.eta && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />ETA: {format(new Date(shipment.eta), "MMM d, yyyy")}</span>}
              <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" />Updated: {format(new Date(shipment.updated_at), "MMM d, h:mm a")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => {
                const params = new URLSearchParams();
                params.set("repeat", shipment.id);
                navigate(`/dashboard/shipments/new?${params.toString()}`);
              }} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />Repeat Shipment
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={async () => {
                const templateData = {
                  user_id: user?.id,
                  name: `${shipment.shipment_ref} Template`,
                  origin_port: shipment.origin_port,
                  destination_port: shipment.destination_port,
                  mode: shipment.mode || "ocean",
                  commodity: cargo?.[0]?.commodity || null,
                  shipment_type: shipment.shipment_type,
                  incoterms: shipment.incoterms,
                };
                const { error } = await supabase.from("shipment_templates").insert(templateData);
                if (error) {
                  toast({ title: "Failed to save template", description: error.message, variant: "destructive" });
                } else {
                  toast({ title: "Template saved", description: "You can reuse this from the Templates page." });
                }
              }} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" />Save as Template
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setActiveTab("messages")}>
              <MessageSquare className="mr-2 h-3.5 w-3.5" />Message Support
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("documents")}>
              <Download className="mr-2 h-3.5 w-3.5" />Documents
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("financials")}>
              <Receipt className="mr-2 h-3.5 w-3.5" />View Invoice
            </Button>
            <Button variant="electric" size="sm" onClick={() => setActiveTab("tracking")}>
              <Eye className="mr-2 h-3.5 w-3.5" />Track Shipment
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSparkShareOpen(true)} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />Share via Spark
            </Button>
          </div>
        </div>
      </div>

      {/* ── SPARK SHARE DIALOG ── */}
      {shipment && (
        <SparkShareDialog
          open={sparkShareOpen}
          onOpenChange={setSparkShareOpen}
          shipment={shipment}
          onNavigateToSpark={() => navigate("/dashboard/spark")}
        />
      )}

      {/* ── ALERTS ── */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-5">
          {alerts.map((a, i) => (
            <div key={i} className={`rounded-lg border px-4 py-2.5 flex items-center gap-2 text-sm ${
              a.type === "red" ? "border-destructive/30 bg-destructive/5 text-destructive" :
              a.type === "yellow" ? "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300" :
              "border-accent/30 bg-accent/5 text-accent"
            }`}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* ── SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatusCard icon={Anchor} label="Booking" status={bookingStatus.status} color={bookingStatus.color} />
        <StatusCard icon={Shield} label="Compliance" status={customsStatus.status} color={customsStatus.color} />
        <StatusCard icon={Truck} label="Origin Pickup" status={originPickupStatus.status} color={originPickupStatus.color} />
        <StatusCard icon={Ship} label="Transit" status={transitStatus.status} color={transitStatus.color} />
        <StatusCard icon={MapPin} label="Delivery" status={deliveryStatus.status} color={deliveryStatus.color} />
        <StatusCard icon={Receipt} label="Payment" status={lifecycleStatus === "closed" ? "Paid" : "Pending"} color={lifecycleStatus === "closed" ? "green" : "yellow"} />
      </div>

      {/* ── LIFECYCLE TIMELINE ── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-accent" />Shipment Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Progress bar */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-border hidden lg:block" />
            <div className="absolute top-5 left-5 h-0.5 bg-emerald-500 hidden lg:block transition-all" style={{
              width: currentLifecycleIndex >= 0 ? `${(currentLifecycleIndex / (LIFECYCLE_STAGES.length - 1)) * 100}%` : '0%',
              maxWidth: 'calc(100% - 2.5rem)',
            }} />
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-x-2 gap-y-4">
              {LIFECYCLE_STAGES.map((stage, i) => {
                const completion = getLifecycleCompletion(stage.key);
                const Icon = stage.icon;
                return (
                  <div key={stage.key} className="flex flex-col items-center text-center relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 mb-2 transition-all ${
                      completion === "completed"
                        ? "bg-emerald-500 text-white"
                        : completion === "current"
                        ? "bg-accent text-accent-foreground ring-4 ring-accent/25"
                        : "bg-secondary border-2 border-border text-muted-foreground"
                    }`}>
                      {completion === "completed" ? <Check className="h-4 w-4 stroke-[3]" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <p className={`text-[10px] font-medium leading-tight ${completion !== "upcoming" ? "text-foreground" : "text-muted-foreground"}`}>{stage.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── TABBED WORKSPACE ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-transparent p-0 border-b border-border rounded-none pb-0">
          {visibleTabs.map(tab => (
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

        {/* ══ OVERVIEW TAB ══ */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Next Action */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-wider">Next Action</p>
              <p className="text-sm text-foreground">{nextAction}</p>
            </div>
          </div>

          {/* Shipment Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-accent" />Shipment Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-x-8 gap-y-4">
                <InfoRow label="Shipment Number" value={shipment.shipment_ref} />
                <InfoRow label="Booking Ref" value={shipment.booking_ref || "Pending"} />
                <InfoRow label="Mode" value={isAir ? "Air Freight" : "Ocean Freight"} />
                <InfoRow label="Shipment Type" value={fmt(shipment.shipment_type)} />
                {isAir ? (
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
                <InfoRow label="Containers" value={containersSummary} />
                <InfoRow label="Origin" value={shipment.origin_port || "—"} />
                <InfoRow label="Destination" value={shipment.destination_port || "—"} />
                <InfoRow label="ETD" value={shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "TBD"} />
                <InfoRow label="ETA" value={shipment.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "TBD"} />
                <InfoRow label="Incoterms" value={(shipment as any).incoterms || "—"} />
              </div>
            </CardContent>
          </Card>

          {/* Cargo Details */}
          {firstCargo && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-accent" />Cargo Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-x-8 gap-y-4">
                  <InfoRow label="Commodity" value={firstCargo.commodity || "—"} />
                  <InfoRow label="HS Code" value={firstCargo.hs_code || "—"} />
                  <InfoRow label="Gross Weight" value={firstCargo.gross_weight ? `${firstCargo.gross_weight} kg` : "—"} />
                  <InfoRow label="Volume" value={firstCargo.volume ? `${firstCargo.volume} CBM` : "—"} />
                  <InfoRow label="Packages" value={firstCargo.num_packages ? `${firstCargo.num_packages}` : "—"} />
                  <InfoRow label="Dangerous Goods" value={firstCargo.dangerous_goods ? "Yes" : "No"} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Scope */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-accent" />Service Scope</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: isAir ? "Air Freight" : "Ocean Freight", active: true },
                  { label: "Trucking", active: shipmentServices?.trucking },
                  { label: "AES Filing", active: shipmentServices?.customs_clearance },
                  { label: "Customs Clearance", active: shipmentServices?.customs_clearance },
                  { label: "Warehousing", active: shipmentServices?.warehousing },
                  { label: "Insurance", active: shipmentServices?.insurance },
                ].map(svc => (
                  <div key={svc.label} className={`rounded-lg border p-3 text-sm flex items-center gap-2 ${svc.active ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" : "border-border text-muted-foreground"}`}>
                    {svc.active ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
                    {svc.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TRACKING TAB ══ */}
        <TabsContent value="tracking" className="mt-6 space-y-6">
          {/* Live Status */}
          <Card className="border-accent/20">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Status</p>
                  <p className="text-lg font-bold text-foreground mt-1">{fmt(shipment.status)}</p>
                  {(trackingEvents || []).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Latest: {(trackingEvents || [])[(trackingEvents || []).length - 1]?.milestone}
                      {(trackingEvents || [])[(trackingEvents || []).length - 1]?.location && ` — ${(trackingEvents || [])[(trackingEvents || []).length - 1]?.location}`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {shipment.eta && (
                    <>
                      <p className="text-xs text-muted-foreground">Estimated Arrival</p>
                      <p className="text-lg font-bold text-foreground">{format(new Date(shipment.eta), "MMM d, yyyy")}</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestone History */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-accent" />Milestone History</CardTitle></CardHeader>
            <CardContent>
              {(trackingEvents || []).length > 0 ? (
                <div className="space-y-0">
                  {[...(trackingEvents || [])].reverse().map((event, i) => (
                    <div key={event.id} className="flex gap-4 py-3 border-b last:border-0">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}>
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        {i < (trackingEvents || []).length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <p className="text-sm font-medium text-foreground">{event.milestone}</p>
                        {event.location && <p className="text-xs text-muted-foreground">{event.location}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(event.event_date), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No tracking events recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ BOOKING TAB ══ */}
        <TabsContent value="booking" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Anchor className="h-4 w-4 text-accent" />Booking Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                <InfoRow label="Booking Number" value={shipment.booking_ref || "Pending"} />
                <InfoRow label={isAir ? "Airline" : "Carrier / Shipping Line"} value={isAir ? (shipment as any).airline || "TBD" : shipment.vessel ? "See vessel below" : "TBD"} />
                {isAir ? (
                  <InfoRow label="Flight Number" value={(shipment as any).flight_number || "TBD"} />
                ) : (
                  <>
                    <InfoRow label="Vessel" value={shipment.vessel || "TBD"} />
                    <InfoRow label="Voyage" value={shipment.voyage || "TBD"} />
                  </>
                )}
                <InfoRow label={isAir ? "Airport of Departure" : "Port of Loading"} value={shipment.origin_port || "—"} />
                <InfoRow label={isAir ? "Airport of Arrival" : "Port of Discharge"} value={shipment.destination_port || "—"} />
                <InfoRow label="Sailing / Departure Date" value={shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "TBD"} />
                <InfoRow label="Estimated Arrival" value={shipment.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "TBD"} />
                <InfoRow label="Containers" value={containersSummary} />
                <InfoRow label="Booking Status" value={currentStageIndex >= 4 ? "Confirmed" : "Pending"} />
              </div>

              {/* Cutoff dates if available */}
              {((shipment as any).cy_cutoff || (shipment as any).doc_cutoff || (shipment as any).vgm_cutoff) && (
                <>
                  <Separator className="my-5" />
                  <h4 className="text-sm font-semibold text-foreground mb-3">Cutoff Dates</h4>
                  <div className="grid sm:grid-cols-3 gap-x-8 gap-y-4">
                    {(shipment as any).cy_cutoff && <InfoRow label="CY Cutoff" value={format(new Date((shipment as any).cy_cutoff), "MMM d, yyyy")} />}
                    {(shipment as any).doc_cutoff && <InfoRow label="Document Cutoff" value={format(new Date((shipment as any).doc_cutoff), "MMM d, yyyy")} />}
                    {(shipment as any).vgm_cutoff && <InfoRow label="VGM Cutoff" value={format(new Date((shipment as any).vgm_cutoff), "MMM d, yyyy")} />}
                    {(shipment as any).si_cutoff && <InfoRow label="SI Cutoff" value={format(new Date((shipment as any).si_cutoff), "MMM d, yyyy")} />}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ COMPLIANCE TAB ══ */}
        <TabsContent value="compliance" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-accent" />AES / Export Filing</CardTitle>
            </CardHeader>
            <CardContent>
              {(customsFilings || []).length > 0 ? (
                <div className="space-y-4">
                  {(customsFilings || []).map(filing => (
                    <div key={filing.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{filing.filing_type}</Badge>
                          <Badge className={`text-[10px] ${
                            filing.status === "accepted" || filing.status === "itn_received" ? "bg-emerald-100 text-emerald-700" :
                            filing.status === "rejected" ? "bg-destructive/10 text-destructive" :
                            filing.status === "submitted" ? "bg-yellow-100 text-yellow-700" :
                            "bg-secondary text-muted-foreground"
                          }`}>{fmt(filing.status)}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(filing.created_at), "MMM d, yyyy")}</p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                        <InfoRow label="Filing Status" value={fmt(filing.status)} />
                        {filing.itn && <InfoRow label="ITN" value={filing.itn} />}
                        {filing.export_date && <InfoRow label="Export Date" value={format(new Date(filing.export_date), "MMM d, yyyy")} />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No export filings for this shipment.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Alerts */}
          {alerts.filter(a => a.type === "red" || a.type === "yellow").length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-600" />Compliance Alerts</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.filter(a => a.type === "red" || a.type === "yellow").map((a, i) => (
                    <div key={i} className={`rounded-lg p-3 text-sm flex items-center gap-2 ${a.type === "red" ? "bg-destructive/5 text-destructive" : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"}`}>
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {a.message}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══ TRUCKING TAB ══ */}
        <TabsContent value="trucking" className="mt-6 space-y-6">
          <CustomerTruckingSection pickups={truckPickups || []} />
        </TabsContent>

        {/* ══ DOCUMENTS TAB ══ */}
        <TabsContent value="documents" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-accent" />Shipment Documents</CardTitle></CardHeader>
            <CardContent>
              {(documents || []).length > 0 ? (
                <div className="space-y-0">
                  {/* Group: Required / Uploaded / Generated */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="text-left px-4 py-2.5">Document</th>
                          <th className="text-left px-4 py-2.5">Status</th>
                          <th className="text-left px-4 py-2.5">Date</th>
                          <th className="text-right px-4 py-2.5">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(documents || []).map(doc => (
                          <tr key={doc.id} className="border-t hover:bg-secondary/20">
                            <td className="px-4 py-3 font-medium text-foreground text-xs">{fmt(doc.doc_type)}</td>
                            <td className="px-4 py-3">
                              <Badge className={`text-[10px] ${
                                doc.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                doc.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                "bg-secondary text-muted-foreground"
                              }`}>{doc.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(doc.created_at), "MMM d, yyyy")}</td>
                            <td className="px-4 py-3 text-right">
                              {doc.file_url ? (
                                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="mr-1 h-3 w-3" />Download</a>
                                </Button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No documents available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {missingDocs.length > 0 && (
            <Card className="border-yellow-300 dark:border-yellow-800">
              <CardHeader><CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-300"><AlertTriangle className="h-4 w-4" />Missing Documents</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {missingDocs.map(doc => (
                    <li key={doc.id} className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <Circle className="h-2 w-2 fill-current" />{fmt(doc.doc_type)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══ FINANCIALS TAB ══ */}
        <TabsContent value="financials" className="mt-6 space-y-6">
          <CustomerFinancialsTab
            shipmentId={id!}
            shipmentRef={shipment.shipment_ref}
            customerName={companyName}
          />
        </TabsContent>

        {/* ══ MESSAGES TAB ══ */}
        <TabsContent value="messages" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-accent" />Shipment Messages</CardTitle>
              <CardDescription>Communication thread for {shipment.shipment_ref}</CardDescription>
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

        {/* ══ ACTIVITY LOG TAB ══ */}
        <TabsContent value="activity" className="mt-6 space-y-6">
          <AuditTrailPanel shipmentId={id!} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

/* ── Customer Trucking Section ── */
function CustomerTruckingSection({ pickups }: { pickups: any[] }) {
  if (pickups.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-accent" />Trucking</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Truck className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No trucking service included for this shipment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-accent" />Trucking</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pickups.map(pickup => (
            <div key={pickup.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge className={`text-[10px] ${
                  pickup.status === "delivered" || pickup.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                  pickup.status === "en_route" || pickup.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                  pickup.status === "scheduled" ? "bg-accent/10 text-accent" :
                  "bg-secondary text-muted-foreground"
                }`}>{fmt(pickup.status)}</Badge>
                {pickup.pickup_date && (
                  <p className="text-xs text-muted-foreground">{format(new Date(pickup.pickup_date), "MMM d, yyyy")}</p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {pickup.pickup_location && <InfoRow label="Pickup Location" value={pickup.pickup_location} />}
                {pickup.delivery_location && <InfoRow label="Delivery Location" value={pickup.delivery_location} />}
                {pickup.pickup_date && <InfoRow label="Pickup Date" value={format(new Date(pickup.pickup_date), "MMM d, yyyy")} />}
                {pickup.pickup_time && <InfoRow label="Pickup Time" value={pickup.pickup_time} />}
                {pickup.driver_name && <InfoRow label="Driver" value={pickup.driver_name} />}
                {pickup.container_type && <InfoRow label="Container" value={pickup.container_type} />}
                {pickup.notes && <InfoRow label="Notes" value={pickup.notes} />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomerShipmentWorkspace;
