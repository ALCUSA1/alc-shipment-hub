import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { BackButton } from "@/components/shared/BackButton";
import { DocumentChecklist } from "@/components/shipment/DocumentChecklist";
import { CustomerFinancialsTab } from "@/components/shipment/CustomerFinancialsTab";
import { LogisticsServicesPanel } from "@/components/shipment/LogisticsServicesPanel";
import { AuditTrailPanel } from "@/components/shipment/AuditTrailPanel";
import { CustomsFilingPanel } from "@/components/shipment/CustomsFilingPanel";
import { LiveTrackingPanel } from "@/components/shipment/LiveTrackingPanel";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Package, FileText, Clock, Check, Circle, MapPin, ArrowRight,
  MessageSquare, Activity, BarChart3, Ship, Plane, Truck, Shield,
  Anchor, Globe, Container, CheckCircle2, Receipt, AlertTriangle,
  DollarSign, Save, Send, ChevronRight, User, Building2, Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PortSelector } from "@/components/shipment/PortSelector";
import { HsCodeAutocomplete } from "@/components/shared/HsCodeAutocomplete";

/* ── Status helpers ── */
const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_pricing: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  quote_ready: "bg-accent/10 text-accent",
  awaiting_approval: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
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

/* ── Booking Section Component ── */
function BookingSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <CardContent className="pt-0 pb-5 px-5">{children}</CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

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

  // Booking form state
  const [commodity, setCommodity] = useState("");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [numPackages, setNumPackages] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [containerQty, setContainerQty] = useState("1");
  const [dangerousGoods, setDangerousGoods] = useState(false);
  const [shipperName, setShipperName] = useState("");
  const [shipperAddress, setShipperAddress] = useState("");
  const [consigneeName, setConsigneeName] = useState("");
  const [consigneeAddress, setConsigneeAddress] = useState("");
  const [notifyParty, setNotifyParty] = useState("");
  const [needsCustoms, setNeedsCustoms] = useState(false);
  const [needsTrucking, setNeedsTrucking] = useState(false);
  const [needsWarehouse, setNeedsWarehouse] = useState(false);
  const [needsInsurance, setNeedsInsurance] = useState(false);
  const [specialNotes, setSpecialNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // Pre-populate form from existing data
  useEffect(() => {
    if (cargo?.[0]) {
      setCommodity(cargo[0].commodity || "");
      setWeight(cargo[0].gross_weight?.toString() || "");
      setVolume(cargo[0].volume?.toString() || "");
      setNumPackages(cargo[0].num_packages?.toString() || "");
      setHsCode(cargo[0].hs_code || "");
      setDangerousGoods(cargo[0].dangerous_goods || false);
    }
    if (containers?.[0]) {
      setContainerQty(containers[0].quantity?.toString() || "1");
    }
    if (parties) {
      const shipper = parties.find(p => p.role === "shipper");
      const consignee = parties.find(p => p.role === "consignee");
      const notify = parties.find(p => p.role === "notify_party");
      if (shipper) { setShipperName(shipper.name || ""); setShipperAddress(shipper.address || ""); }
      if (consignee) { setConsigneeName(consignee.name || ""); setConsigneeAddress(consignee.address || ""); }
      if (notify) setNotifyParty(notify.name || "");
    }
  }, [cargo, containers, parties]);

  const isDraft = shipment?.lifecycle_stage === "draft" || shipment?.status === "draft";
  const isBooking = isDraft || shipment?.lifecycle_stage === "pending_pricing";

  /* ── Save Draft ── */
  const handleSaveDraft = async () => {
    if (!id || !user) return;
    setSaving(true);
    try {
      // Upsert cargo
      const existingCargo = cargo?.[0];
      if (existingCargo) {
        await supabase.from("cargo").update({
          commodity: commodity || null,
          hs_code: hsCode || null,
          gross_weight: weight ? parseFloat(weight) : null,
          volume: volume ? parseFloat(volume) : null,
          num_packages: numPackages ? parseInt(numPackages) : null,
          dangerous_goods: dangerousGoods,
        }).eq("id", existingCargo.id);
      } else if (commodity || weight || hsCode) {
        await supabase.from("cargo").insert({
          shipment_id: id,
          commodity: commodity || null,
          hs_code: hsCode || null,
          gross_weight: weight ? parseFloat(weight) : null,
          volume: volume ? parseFloat(volume) : null,
          num_packages: numPackages ? parseInt(numPackages) : null,
          dangerous_goods: dangerousGoods,
        });
      }

      // Upsert parties
      const upsertParty = async (role: string, name: string, address: string) => {
        if (!name) return;
        const existing = parties?.find(p => p.role === role);
        if (existing) {
          await supabase.from("shipment_parties").update({ name, address: address || null }).eq("id", existing.id);
        } else {
          await supabase.from("shipment_parties").insert({
            shipment_id: id,
            role,
            name,
            address: address || null,
            assigned_by_user_id: user.id,
          });
        }
      };
      await upsertParty("shipper", shipperName, shipperAddress);
      await upsertParty("consignee", consigneeName, consigneeAddress);
      if (notifyParty) await upsertParty("notify_party", notifyParty, "");

      // Update container qty
      if (containers?.[0]) {
        await supabase.from("containers").update({ quantity: parseInt(containerQty) || 1 }).eq("id", containers[0].id);
      } else if (shipment?.container_type) {
        await supabase.from("containers").insert({
          shipment_id: id,
          container_type: shipment.container_type,
          quantity: parseInt(containerQty) || 1,
        });
      }

      // Save special notes
      if (specialNotes) {
        await supabase.from("shipments").update({ notes: specialNotes } as any).eq("id", id);
      }

      queryClient.invalidateQueries({ queryKey: ["ws-cargo", id] });
      queryClient.invalidateQueries({ queryKey: ["ws-parties", id] });
      queryClient.invalidateQueries({ queryKey: ["ws-containers", id] });
      toast.success("Draft saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  /* ── Submit Booking ── */
  const handleSubmitBooking = async () => {
    if (!id || !user) return;
    setSubmitting(true);
    try {
      // Save draft first
      await handleSaveDraft();

      // Transition lifecycle: draft → pending_pricing
      const { error } = await supabase.from("shipments").update({
        status: "pending_pricing",
        lifecycle_stage: "pending_pricing",
      }).eq("id", id);
      if (error) throw error;

      // Create document checklist
      const requiredDocs = ["bill_of_lading", "commercial_invoice", "packing_list", "shipper_letter_of_instruction"];
      if (needsCustoms) requiredDocs.push("customs_declaration", "aes_filing");
      if (needsInsurance) requiredDocs.push("insurance_certificate");

      await supabase.from("documents").insert(
        requiredDocs.map(docType => ({ shipment_id: id, user_id: user.id, doc_type: docType, status: "pending" }))
      );

      // Create services record
      await supabase.from("shipment_services").insert({
        shipment_id: id,
        customs_clearance: needsCustoms,
        origin_trucking: needsTrucking,
        warehousing: needsWarehouse,
        insurance: needsInsurance,
      });

      queryClient.invalidateQueries({ queryKey: ["ws-shipment", id] });
      toast.success("Booking submitted for pricing!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit booking");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Lifecycle helpers ── */
  const stageOrder = ["draft", "pending_pricing", "quote_ready", "awaiting_approval", "booked", "in_transit", "delivered", "closed"];
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

  /* ── Tabs ── */
  const TABS = isBooking
    ? [
        { id: "booking", label: "Booking", icon: Anchor },
        { id: "cargo", label: "Cargo & Parties", icon: Package },
        { id: "compliance", label: "Compliance", icon: Shield },
        { id: "logistics", label: "Logistics Services", icon: Truck },
        { id: "documents", label: "Documents", icon: FileText },
        { id: "payment", label: "Payment Summary", icon: DollarSign },
      ]
    : [
        { id: "overview", label: "Overview", icon: Package },
        { id: "tracking", label: "Tracking", icon: Clock },
        { id: "booking", label: "Booking", icon: Anchor },
        { id: "compliance", label: "Compliance", icon: Shield },
        { id: "logistics", label: "Logistics", icon: Truck },
        { id: "documents", label: "Documents", icon: FileText },
        { id: "financials", label: "Financials", icon: BarChart3 },
        { id: "messages", label: "Messages", icon: MessageSquare },
        { id: "activity", label: "Activity", icon: Activity },
      ];

  /* ── Loading / Not Found ── */
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
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

  const sellTotal = financials.filter(f => f.entry_type === "revenue").reduce((s, f) => s + (f.amount || 0), 0);
  const costTotal = financials.filter(f => f.entry_type === "cost").reduce((s, f) => s + (f.amount || 0), 0);
  const containersSummary = (containers || []).map(c => `${c.quantity || 1}x${c.container_type}`).join(", ") || "—";
  const firstCargo = cargo?.[0];
  const companyName = (shipment as any).companies?.company_name as string | undefined;

  return (
    <DashboardLayout>
      <SEO title={`${shipment.shipment_ref || "Shipment"} — Workspace`} />

      <div className="max-w-6xl mx-auto space-y-5">
        {/* Back + Ref */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{shipment.shipment_ref}</h1>
                <Badge className={`text-xs ${statusColor[shipment.lifecycle_stage || shipment.status] || "bg-secondary"}`}>
                  {fmt(shipment.lifecycle_stage || shipment.status)}
                </Badge>
              </div>
              {companyName && <p className="text-xs text-muted-foreground">{companyName}</p>}
            </div>
          </div>
          {isBooking && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button variant="electric" size="sm" onClick={handleSubmitBooking} disabled={submitting}>
                <Send className="h-3.5 w-3.5 mr-1.5" />{submitting ? "Submitting..." : "Submit Booking"}
              </Button>
            </div>
          )}
        </div>

        {/* Price Header — Always visible */}
        <PriceHeader shipment={shipment} financials={financials} />

        {/* Lifecycle Timeline — for non-draft shipments */}
        {!isDraft && (
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
        )}

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-transparent p-0 border-b border-border rounded-none pb-0">
            {TABS.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:bg-transparent rounded-none pb-2 text-xs gap-1.5"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── BOOKING TAB (Summary + confirm for drafts) ── */}
          <TabsContent value="booking" className="mt-5">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Anchor className="h-4 w-4 text-accent" /> Shipment Summary
                  </CardTitle>
                </CardHeader>
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

              {/* Vessel/Air booking details for post-draft */}
              {!isDraft && shipment.mode === "ocean" && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Vessel Details</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><p className="text-xs text-muted-foreground uppercase">Vessel</p><p className="font-medium">{shipment.vessel || "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground uppercase">Voyage</p><p className="font-medium">{shipment.voyage || "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground uppercase">Booking #</p><p className="font-medium">{(shipment as any).booking_number || "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground uppercase">BL #</p><p className="font-medium">{(shipment as any).bl_number || "—"}</p></div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── CARGO & PARTIES TAB (editable for drafts) ── */}
          <TabsContent value="cargo" className="mt-5">
            <div className="space-y-4">
              <BookingSection title="Cargo Details" icon={Package} defaultOpen={true}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Commodity</Label>
                      <Input value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="e.g. Electronics" className="mt-1" disabled={!isBooking} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">HS Code</Label>
                      <div className="mt-1">
                        <HsCodeAutocomplete value={hsCode} commodity={commodity} onChange={setHsCode} placeholder="e.g. 8471.30.01.00" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
                      <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="18000" className="mt-1" disabled={!isBooking} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Volume (CBM)</Label>
                      <Input type="number" value={volume} onChange={e => setVolume(e.target.value)} placeholder="33" className="mt-1" disabled={!isBooking} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Packages</Label>
                      <Input type="number" value={numPackages} onChange={e => setNumPackages(e.target.value)} placeholder="50" className="mt-1" disabled={!isBooking} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Container Qty</Label>
                      <Input type="number" min="1" value={containerQty} onChange={e => setContainerQty(e.target.value)} className="mt-1" disabled={!isBooking} />
                    </div>
                    <div className="flex items-center gap-3 pt-5">
                      <Switch checked={dangerousGoods} onCheckedChange={setDangerousGoods} disabled={!isBooking} />
                      <Label className="text-xs">Dangerous Goods</Label>
                    </div>
                  </div>
                </div>
              </BookingSection>

              <BookingSection title="Parties" icon={User} defaultOpen={true}>
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shipper / Exporter</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input value={shipperName} onChange={e => setShipperName(e.target.value)} placeholder="Company name" className="mt-1" disabled={!isBooking} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <Input value={shipperAddress} onChange={e => setShipperAddress(e.target.value)} placeholder="Full address" className="mt-1" disabled={!isBooking} />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Consignee</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input value={consigneeName} onChange={e => setConsigneeName(e.target.value)} placeholder="Company name" className="mt-1" disabled={!isBooking} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <Input value={consigneeAddress} onChange={e => setConsigneeAddress(e.target.value)} placeholder="Full address" className="mt-1" disabled={!isBooking} />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notify Party</p>
                    <Input value={notifyParty} onChange={e => setNotifyParty(e.target.value)} placeholder="Notify party name" disabled={!isBooking} />
                  </div>
                </div>
              </BookingSection>
            </div>
          </TabsContent>

          {/* ── COMPLIANCE TAB ── */}
          <TabsContent value="compliance" className="mt-5">
            {isBooking ? (
              <BookingSection title="Export Compliance (AES / EEI)" icon={Shield} defaultOpen={true}>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">AES filing will be generated automatically</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Based on your cargo details and party information, the system will determine if AES/EEI filing is required
                        and generate the necessary compliance documents when you submit the booking.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={needsCustoms} onCheckedChange={setNeedsCustoms} />
                    <div>
                      <Label className="text-sm">Customs Clearance Service</Label>
                      <p className="text-xs text-muted-foreground">We handle customs documentation and clearance</p>
                    </div>
                  </div>
                </div>
              </BookingSection>
            ) : (
              <CustomsFilingPanel shipmentId={id!} />
            )}
          </TabsContent>

          {/* ── LOGISTICS SERVICES TAB ── */}
          <TabsContent value="logistics" className="mt-5">
            {isBooking ? (
              <div className="space-y-4">
                <BookingSection title="Logistics Services" icon={Truck} defaultOpen={true}>
                  <div className="space-y-4">
                    {[
                      { key: "trucking", label: "Origin Trucking", desc: "Pickup from shipper to port", state: needsTrucking, setter: setNeedsTrucking, icon: Truck },
                      { key: "warehouse", label: "Warehouse Services", desc: "Storage at origin or destination", state: needsWarehouse, setter: setNeedsWarehouse, icon: Container },
                      { key: "insurance", label: "Cargo Insurance", desc: "All-risk cargo insurance coverage", state: needsInsurance, setter: setNeedsInsurance, icon: Shield },
                    ].map(svc => (
                      <div key={svc.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                            <svc.icon className="h-4 w-4 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{svc.label}</p>
                            <p className="text-xs text-muted-foreground">{svc.desc}</p>
                          </div>
                        </div>
                        <Switch checked={svc.state} onCheckedChange={svc.setter} />
                      </div>
                    ))}
                    <div>
                      <Label className="text-xs text-muted-foreground">Special Instructions</Label>
                      <Textarea value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} placeholder="Any special requirements..." className="mt-1" rows={3} />
                    </div>
                  </div>
                </BookingSection>
              </div>
            ) : (
              <LogisticsServicesPanel shipmentId={id!} />
            )}
          </TabsContent>

          {/* ── DOCUMENTS TAB ── */}
          <TabsContent value="documents" className="mt-5">
            {isBooking ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" /> Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <Info className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Documents will be generated after booking submission</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Required documents (SI, BL, Invoice, etc.) will be automatically created based on your shipment type
                        and selected services. You can review and download them in the workspace after submission.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Expected documents:</p>
                    {["Shipping Instruction (SI)", "House Bill of Lading (HBL)", "Commercial Invoice", "Packing List",
                      ...(needsCustoms ? ["AES Filing / ITN Confirmation"] : []),
                      ...(needsInsurance ? ["Insurance Certificate"] : []),
                    ].map(doc => (
                      <div key={doc} className="flex items-center gap-2 text-sm">
                        <Circle className="h-3 w-3 text-muted-foreground" />
                        <span>{doc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <DocumentChecklist shipmentId={id!} />
            )}
          </TabsContent>

          {/* ── PAYMENT SUMMARY TAB (booking mode) ── */}
          <TabsContent value="payment" className="mt-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-accent" /> Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {financials.filter(f => f.entry_type === "revenue").map(f => (
                    <div key={f.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{f.description}</span>
                      <span className="font-mono font-medium">${f.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount Due</span>
                  <span className="text-accent">${sellTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <p>Payment will be requested after your booking is confirmed. You can pay via credit card or wire transfer.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── OVERVIEW TAB (post-booking) ── */}
          <TabsContent value="overview" className="mt-5">
            <div className="space-y-4">
              {/* Summary cards */}
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

              {/* Shipment details */}
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
            </div>
          </TabsContent>

          {/* ── TRACKING TAB ── */}
          <TabsContent value="tracking" className="mt-5">
            <LiveTrackingPanel shipmentId={id!} />
          </TabsContent>

          {/* ── FINANCIALS TAB (post-booking) ── */}
          <TabsContent value="financials" className="mt-5">
            <CustomerFinancialsTab shipmentId={id!} />
          </TabsContent>

          {/* ── MESSAGES TAB ── */}
          <TabsContent value="messages" className="mt-5">
            <Card>
              <CardContent className="pt-5">
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Shipment messages will appear here</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link to="/dashboard/messages">Open Messages</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ACTIVITY TAB ── */}
          <TabsContent value="activity" className="mt-5">
            <AuditTrailPanel shipmentId={id!} />
          </TabsContent>
        </Tabs>

        {/* Bottom action bar for booking mode */}
        {isBooking && (
          <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-4 -mx-4 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="text-lg font-bold text-accent">${sellTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving}>
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button variant="electric" onClick={handleSubmitBooking} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Booking"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ShipmentWorkspace;
