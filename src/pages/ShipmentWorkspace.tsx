import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/shared/BackButton";
import { DocumentChecklist } from "@/components/shipment/DocumentChecklist";
import { CustomerFinancialsTab } from "@/components/shipment/CustomerFinancialsTab";
import { LogisticsServicesPanel } from "@/components/shipment/LogisticsServicesPanel";
import { AuditTrailPanel } from "@/components/shipment/AuditTrailPanel";
import { CustomsFilingPanel } from "@/components/shipment/CustomsFilingPanel";
import { LiveTrackingPanel } from "@/components/shipment/LiveTrackingPanel";
import { TruckingRateSelector } from "@/components/shipment/TruckingRateSelector";
import { DocumentLifecycleBar } from "@/components/shipment/DocumentLifecycleBar";
import { ShipmentIntelligencePanel } from "@/components/shipment/ShipmentIntelligencePanel";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Package, FileText, Clock, Check, MapPin, ArrowRight,
  MessageSquare, Activity, BarChart3, Ship, Plane, Truck, Shield,
  Anchor, Globe, Container, CheckCircle2, Receipt, DollarSign,
} from "lucide-react";

/* ── Status helpers ── */
const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_pricing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  quote_ready: "bg-accent/10 text-accent",
  
  booked: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_transit: "bg-accent/10 text-accent",
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
  { key: "aes_submitted", label: "Export Clearance", icon: Shield },
  { key: "cargo_received", label: "Cargo at Terminal", icon: Container },
  { key: "departed", label: "Departed Origin", icon: Ship },
  { key: "in_transit", label: "In Transit", icon: Globe },
  { key: "arrived_destination", label: "Arrived", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
  { key: "financially_closed", label: "Closed", icon: Receipt },
];

const TABS = [
  { id: "overview", label: "Overview", icon: Package },
  { id: "tracking", label: "Tracking", icon: Clock },
  { id: "booking", label: "Booking", icon: Anchor },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "logistics", label: "Logistics", icon: Truck },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "financials", label: "Financials", icon: BarChart3 },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "activity", label: "Activity", icon: Activity },
] as const;

/* ── Price Header ── */
function PriceHeader({ shipment, financials }: { shipment: any; financials: any[] }) {
  const sellTotal = financials.filter(f => f.entry_type === "revenue").reduce((s, f) => s + (f.amount || 0), 0);
  const isAir = shipment.mode === "air";

  return (
    <div className="bg-gradient-to-r from-accent/5 to-accent/[0.02] border border-accent/20 rounded-xl p-4 md:p-5">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            {isAir ? <Plane className="h-5 w-5 text-accent" /> : <Ship className="h-5 w-5 text-accent" />}
          </div>
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-foreground">
              {shipment.origin_port || "Origin"} <ArrowRight className="h-4 w-4 text-accent" /> {shipment.destination_port || "Destination"}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              {shipment.carrier && <span className="font-medium text-foreground">{shipment.carrier}</span>}
              {shipment.etd && <span>ETD: {format(new Date(shipment.etd), "MMM d, yyyy")}</span>}
              {shipment.eta && <span>ETA: {format(new Date(shipment.eta), "MMM d, yyyy")}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          {sellTotal > 0 && (
            <>
              <p className="text-2xl font-bold text-accent">${sellTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Price (USD)</p>
            </>
          )}
          <Badge className={`mt-1 ${statusColor[shipment.lifecycle_stage || shipment.status] || "bg-secondary"}`}>
            {fmt(shipment.lifecycle_stage || shipment.status)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
const ShipmentWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  // If this is a draft shipment, redirect to the unified booking flow
  const checkAndRedirect = (shipmentData: any) => {
    const isDraft = shipmentData?.lifecycle_stage === "draft" || shipmentData?.status === "draft";
    const isPendingPricing = shipmentData?.lifecycle_stage === "pending_pricing";
    if (isDraft || isPendingPricing) {
      navigate(`/book?step=details&id=${id}`, { replace: true });
    }
  };

  /* ── Realtime ── */
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`workspace-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments', filter: `id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["ws-shipment", id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracking_events', filter: `shipment_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["ws-tracking", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  /* ── Data queries ── */
  const { data: shipment, isLoading } = useQuery({
    queryKey: ["ws-shipment", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("*, companies!shipments_company_id_fkey(company_name)").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (data) checkAndRedirect(data);
      return data;
    },
    enabled: !!id,
  });

  const { data: cargo } = useQuery({
    queryKey: ["ws-cargo", id],
    queryFn: async () => { const { data } = await supabase.from("cargo").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: containers } = useQuery({
    queryKey: ["ws-containers", id],
    queryFn: async () => { const { data } = await supabase.from("containers").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: parties } = useQuery({
    queryKey: ["ws-parties", id],
    queryFn: async () => { const { data } = await supabase.from("shipment_parties").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: trackingEvents } = useQuery({
    queryKey: ["ws-tracking", id],
    queryFn: async () => { const { data } = await supabase.from("tracking_events").select("*").eq("shipment_id", id!).order("event_date", { ascending: true }); return data; },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ["ws-documents", id],
    queryFn: async () => { const { data } = await supabase.from("documents").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: financials = [] } = useQuery({
    queryKey: ["ws-financials", id],
    queryFn: async () => { const { data } = await supabase.from("shipment_financials").select("*").eq("shipment_id", id!); return data || []; },
    enabled: !!id,
  });

  const { data: customsFilings } = useQuery({
    queryKey: ["ws-customs", id],
    queryFn: async () => { const { data } = await supabase.from("customs_filings").select("*").eq("shipment_id", id!); return data; },
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ["ws-payments", id],
    queryFn: async () => { const { data } = await supabase.from("payments").select("status").eq("shipment_id", id!).order("created_at", { ascending: false }).limit(1); return data; },
    enabled: !!id,
  });

  /* ── Lifecycle helpers ── */
  const stageOrder = ["draft", "pending_pricing", "quote_ready", "booked", "in_transit", "delivered", "closed"];
  const currentStageIndex = stageOrder.indexOf(shipment?.lifecycle_stage || shipment?.status || "draft");

  const getLifecycleStatus = (stageKey: string) => {
    const completedMilestones = new Set((trackingEvents || []).map(e => e.milestone));
    if (completedMilestones.has(stageKey)) return "completed";
    const stageMapping: Record<string, number> = {
      request_created: 0, quote_approved: 2, booking_confirmed: 4,
      pickup_scheduled: 4, aes_submitted: 4, cargo_received: 4,
      departed: 5, in_transit: 5, arrived_destination: 5,
      delivered: 6, financially_closed: 7,
    };
    const req = stageMapping[stageKey] ?? 99;
    if (currentStageIndex > req) return "completed";
    if (currentStageIndex === req) return "current";
    return "upcoming";
  };

  /* ── Loading / Not Found ── */
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>
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

  const sellTotal = financials.filter(f => f.entry_type === "revenue").reduce((s, f) => s + (f.amount || 0), 0);
  const containersSummary = (containers || []).map(c => `${c.quantity || 1}x${c.container_type}`).join(", ") || "—";
  const firstCargo = cargo?.[0];
  const companyName = (shipment as any).companies?.company_name as string | undefined;

  return (
    <DashboardLayout>
      <SEO title={`${shipment.shipment_ref || "Shipment"} — Workspace`} description="Manage your shipment tracking, documents, and operations." />

      <div className="max-w-6xl mx-auto space-y-5">
        {/* Back + Ref */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{shipment.shipment_ref}</h1>
                <Badge className={`text-xs ${statusColor[shipment.lifecycle_stage || shipment.status] || "bg-secondary"}`}>
                  {fmt(shipment.lifecycle_stage || shipment.status)}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                {companyName && <span>{companyName}</span>}
                {shipment.booking_ref && (
                  <span className="font-mono">Booking: <span className="text-foreground">{shipment.booking_ref}</span></span>
                )}
                {shipment.customer_reference && (
                  <span className="font-mono">Customer Ref: <span className="text-foreground">{shipment.customer_reference}</span></span>
                )}
              </div>
            </div>
          </div>
          {/* Action buttons based on lifecycle */}
          <div className="flex items-center gap-2">
            {(shipment.lifecycle_stage || shipment.status) === "quote_ready" && (
              <Button
                onClick={async () => {
                  try {
                    const { error } = await supabase.from("shipments").update({ lifecycle_stage: "booked", status: "booked" }).eq("id", shipment.id);
                    if (error) throw error;
                    queryClient.invalidateQueries({ queryKey: ["ws-shipment", id] });
                    toast.success("Shipment booked successfully!");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to book shipment");
                  }
                }}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm Booking
              </Button>
            )}
            {(shipment.lifecycle_stage || shipment.status) === "booked" && (
              <Button
                onClick={async () => {
                  try {
                    const { error } = await supabase.from("shipments").update({ lifecycle_stage: "in_transit", status: "in_transit" }).eq("id", shipment.id);
                    if (error) throw error;
                    queryClient.invalidateQueries({ queryKey: ["ws-shipment", id] });
                    toast.success("Shipment marked as in transit!");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to update shipment");
                  }
                }}
                variant="outline"
              >
                <Ship className="h-4 w-4 mr-1.5" /> Mark In Transit
              </Button>
            )}
            {(shipment.lifecycle_stage || shipment.status) === "in_transit" && (
              <Button
                onClick={async () => {
                  try {
                    const { error } = await supabase.from("shipments").update({ lifecycle_stage: "delivered", status: "delivered" }).eq("id", shipment.id);
                    if (error) throw error;
                    queryClient.invalidateQueries({ queryKey: ["ws-shipment", id] });
                    toast.success("Shipment marked as delivered!");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to update shipment");
                  }
                }}
                variant="outline"
              >
                <Check className="h-4 w-4 mr-1.5" /> Mark Delivered
              </Button>
            )}
          </div>
        </div>

        {/* Price Header */}
        <PriceHeader shipment={shipment} financials={financials} />

        {/* AI Intelligence Panel */}
        <ShipmentIntelligencePanel
          shipment={shipment}
          documents={documents}
          customsFilings={customsFilings}
        />

        {/* Lifecycle Timeline */}

        {/* Lifecycle Timeline */}
        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-0 min-w-[800px]">
            {LIFECYCLE_STAGES.map((stage, i) => {
              const status = getLifecycleStatus(stage.key);
              const Icon = stage.icon;
              return (
                <div key={stage.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs ${
                      status === "completed" ? "bg-accent text-accent-foreground"
                      : status === "current" ? "bg-accent/20 text-accent ring-2 ring-accent/40"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      {status === "completed" ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <span className={`text-[9px] text-center leading-tight max-w-[60px] ${
                      status !== "upcoming" ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}>{stage.label}</span>
                  </div>
                  {i < LIFECYCLE_STAGES.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${status === "completed" ? "bg-accent" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-transparent p-0 border-b border-border rounded-none pb-0">
            {TABS.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:bg-transparent rounded-none pb-2 text-xs gap-1.5">
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-5">
            <div className="space-y-4">
              <DocumentLifecycleBar
                documents={(documents || []).map(d => ({ doc_type: d.doc_type, status: d.status, created_at: d.created_at, file_url: d.file_url }))}
                payments={[]}
                customsFilings={(customsFilings || []).map(f => ({ status: f.status }))}
                lifecycleStage={shipment?.lifecycle_stage || shipment?.status}
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Anchor, label: "Booking", status: currentStageIndex >= 4 ? "Confirmed" : "Pending", color: currentStageIndex >= 4 ? "green" : "yellow" },
                  { icon: Shield, label: "Compliance", status: (customsFilings || []).length > 0 ? "Filed" : "N/A", color: (customsFilings || []).length > 0 ? "blue" : "muted" },
                  { icon: Ship, label: "Transport", status: currentStageIndex >= 6 ? "Delivered" : currentStageIndex >= 5 ? "In Transit" : "Pending", color: currentStageIndex >= 6 ? "green" : currentStageIndex >= 5 ? "blue" : "muted" },
                  { icon: DollarSign, label: "Payment", status: "Due", color: "yellow" },
                ].map((card, i) => {
                  const colors: Record<string, string> = {
                    green: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    yellow: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                    blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                    muted: "bg-muted text-muted-foreground border-border",
                  };
                  return (
                    <div key={i} className={`rounded-xl border p-3 flex items-center gap-3 ${colors[card.color]}`}>
                      <card.icon className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{card.label}</p>
                        <p className="text-sm font-semibold">{card.status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Card>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-xs text-muted-foreground uppercase">Origin</p><p className="font-medium">{shipment.origin_port || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">Destination</p><p className="font-medium">{shipment.destination_port || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">Carrier</p><p className="font-medium">{shipment.carrier || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">Containers</p><p className="font-medium">{containersSummary}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">ETD</p><p className="font-medium">{shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">ETA</p><p className="font-medium">{shipment.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">Commodity</p><p className="font-medium">{firstCargo?.commodity || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">HS Code</p><p className="font-medium">{firstCargo?.hs_code || "—"}</p></div>
                  </div>
                </CardContent>
              </Card>
              {/* Trucking Rate Selector — shown after booking confirmed */}
              {["booked", "in_transit"].includes(shipment.lifecycle_stage || shipment.status) && (
                <TruckingRateSelector
                  shipmentId={shipment.id}
                  originPort={shipment.origin_port || ""}
                  destinationPort={shipment.destination_port || ""}
                  pickupLocation={(shipment as any).pickup_location || undefined}
                  deliveryLocation={(shipment as any).delivery_location || undefined}
                  containerType={containers?.[0]?.container_type}
                />
              )}

              {/* Export Clearance / Customs action card — shown when booked and no customs filed */}
              {["booked", "in_transit"].includes(shipment.lifecycle_stage || shipment.status) && (
                <Card className={`border ${(customsFilings || []).some(f => f.status === "submitted" || f.status === "approved" || f.status === "filed") ? "border-emerald-500/30 bg-emerald-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${(customsFilings || []).some(f => f.status === "submitted" || f.status === "approved" || f.status === "filed") ? "bg-emerald-500/15" : "bg-yellow-500/15"}`}>
                          <Shield className={`h-5 w-5 ${(customsFilings || []).some(f => f.status === "submitted" || f.status === "approved" || f.status === "filed") ? "text-emerald-600" : "text-yellow-600"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {(customsFilings || []).some(f => f.status === "submitted" || f.status === "approved" || f.status === "filed")
                              ? "Export Clearance Filed"
                              : "Export Clearance Required"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(customsFilings || []).some(f => f.status === "submitted" || f.status === "approved" || f.status === "filed")
                              ? "AES/customs filing has been submitted for this shipment."
                              : "Complete US customs information (AES/EEI) — exporter details, HTS codes, and consignee info required before cargo can ship."}
                          </p>
                        </div>
                      </div>
                      {!(customsFilings || []).some(f => f.status === "submitted" || f.status === "approved" || f.status === "filed") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 border-yellow-500/40 text-yellow-700 hover:bg-yellow-500/10"
                          onClick={() => setActiveTab("compliance")}
                        >
                          <Shield className="h-3.5 w-3.5 mr-1.5" />
                          Complete Now
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* BOOKING TAB (read-only summary) */}
          <TabsContent value="booking" className="mt-5">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Anchor className="h-4 w-4 text-accent" /> Booking Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground uppercase">Origin</p><p className="font-medium">{shipment.origin_port || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Destination</p><p className="font-medium">{shipment.destination_port || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Carrier</p><p className="font-medium">{shipment.carrier || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Mode</p><p className="font-medium">{shipment.mode === "air" ? "Air Freight" : "Ocean FCL"}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">ETD</p><p className="font-medium">{shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">ETA</p><p className="font-medium">{shipment.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Container</p><p className="font-medium">{containersSummary}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Commodity</p><p className="font-medium">{firstCargo?.commodity || "—"}</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRACKING TAB */}
          <TabsContent value="tracking" className="mt-5">
            <LiveTrackingPanel shipmentId={id!} mode={(shipment.mode as "ocean" | "air") || "ocean"} />
          </TabsContent>

          {/* COMPLIANCE TAB */}
          <TabsContent value="compliance" className="mt-5">
            <CustomsFilingPanel shipmentId={id!} />
          </TabsContent>

          {/* LOGISTICS TAB */}
          <TabsContent value="logistics" className="mt-5">
            <LogisticsServicesPanel shipmentId={id!} shipmentRef={shipment.shipment_ref || ""} />
          </TabsContent>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents" className="mt-5">
            <DocumentChecklist
              shipmentId={id!}
              userId={user?.id || ""}
              shipmentMode={shipment.mode}
              shipmentType={shipment.shipment_type}
              lifecycleStage={shipment.lifecycle_stage}
              paymentStatus={payments?.[0]?.status}
            />
          </TabsContent>

          {/* FINANCIALS TAB */}
          <TabsContent value="financials" className="mt-5">
            <CustomerFinancialsTab shipmentId={id!} shipmentRef={shipment.shipment_ref || ""} />
          </TabsContent>

          {/* MESSAGES TAB */}
          <TabsContent value="messages" className="mt-5">
            <Card>
              <CardContent className="pt-5">
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Shipment messages will appear here</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild><Link to="/dashboard/messages">Open Messages</Link></Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACTIVITY TAB */}
          <TabsContent value="activity" className="mt-5">
            <AuditTrailPanel shipmentId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ShipmentWorkspace;
