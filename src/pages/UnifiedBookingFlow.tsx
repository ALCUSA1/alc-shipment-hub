import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SEO } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createShipmentDraft, type RateSelection } from "@/lib/create-shipment-draft";

import { BookingProgressBar } from "@/components/booking/BookingProgressBar";
import { BookingSummaryPanel } from "@/components/booking/BookingSummaryPanel";
import { BookingDocumentReviewStep } from "@/components/booking/BookingDocumentReviewStep";
import { BookingPaymentStep } from "@/components/booking/BookingPaymentStep";
import { BookingConfirmationStep } from "@/components/booking/BookingConfirmationStep";

import { BookingSearchStep } from "@/components/booking-flow/BookingSearchStep";
import { BookingIntelligenceBanner } from "@/components/booking-flow/BookingIntelligenceBanner";
import { LogisticsSetupStep } from "@/components/booking-flow/LogisticsSetupStep";
import { SailingBoardStep } from "@/components/booking-flow/SailingBoardStep";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PortSelector } from "@/components/shipment/PortSelector";
import { HsCodeAutocomplete } from "@/components/shared/HsCodeAutocomplete";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import {
  Package, Ship, Plane, ArrowRight, ArrowLeft, Save, Send, User,
  Shield, Truck, Container, Anchor, FileText, Info, AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

/* ── Types ── */
export interface SearchParams {
  origin: string;
  destination: string;
  mode: "ocean" | "air";
  containerSize: string;
  containerType: string;
  commodity: string;
  weight: string;
  containers: number;
}

export interface SailingOption {
  id: string;
  carrier: string;
  origin_port: string;
  destination_port: string;
  container_type: string;
  base_rate: number;
  currency: string;
  transit_days: number | null;
  valid_from: string;
  valid_until: string;
  surcharges: any;
  notes: string | null;
  service_level: string | null;
  free_time_days: number | null;
  total_rate: number;
  ai_label?: string;
  ai_reason?: string;
  etd?: string;
  eta?: string;
  availability?: string;
}

type FlowStep = "search" | "rates" | "details" | "cargo" | "logistics" | "compliance" | "documents" | "payment" | "confirmed";
const STEPS: FlowStep[] = ["search", "rates", "details", "cargo", "logistics", "compliance", "documents", "payment", "confirmed"];

/* ── Collapsible Section ── */
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

/* ── Main Component ── */
const UnifiedBookingFlow = () => {
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [step, setStep] = useState<FlowStep>((urlParams.get("step") as FlowStep) || "search");
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [sailingOptions, setSailingOptions] = useState<SailingOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shipmentId, setShipmentId] = useState<string | null>(urlParams.get("id") || null);

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
  const [saving, setSaving] = useState(false);
  const [bookingLater, setBookingLater] = useState(false);

  // AES / Customs form state
  const [aesExporterName, setAesExporterName] = useState("");
  const [aesExporterEin, setAesExporterEin] = useState("");
  const [aesConsigneeName, setAesConsigneeName] = useState("");
  const [aesConsigneeAddress, setAesConsigneeAddress] = useState("");
  const [aesCountryOfDestination, setAesCountryOfDestination] = useState("");
  const [aesBrokerName, setAesBrokerName] = useState("");
  const [aesBrokerEmail, setAesBrokerEmail] = useState("");
  const [aesAesCitation, setAesAesCitation] = useState("");
  const [aesFilingId, setAesFilingId] = useState<string | null>(null);

  /* ── Data queries (once we have a shipment) ── */
  const { data: shipment } = useQuery({
    queryKey: ["book-shipment", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("shipments").select("*").eq("id", shipmentId!).maybeSingle();
      return data;
    },
    enabled: !!shipmentId,
  });

  const { data: cargo = [] } = useQuery({
    queryKey: ["book-cargo", shipmentId],
    queryFn: async () => { const { data } = await supabase.from("cargo").select("*").eq("shipment_id", shipmentId!); return data || []; },
    enabled: !!shipmentId,
  });

  const { data: containers = [] } = useQuery({
    queryKey: ["book-containers", shipmentId],
    queryFn: async () => { const { data } = await supabase.from("containers").select("*").eq("shipment_id", shipmentId!); return data || []; },
    enabled: !!shipmentId,
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["book-parties", shipmentId],
    queryFn: async () => { const { data } = await supabase.from("shipment_parties").select("*").eq("shipment_id", shipmentId!); return data || []; },
    enabled: !!shipmentId,
  });

  const { data: financials = [] } = useQuery({
    queryKey: ["book-financials", shipmentId],
    queryFn: async () => { const { data } = await supabase.from("shipment_financials").select("*").eq("shipment_id", shipmentId!); return data || []; },
    enabled: !!shipmentId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["book-documents", shipmentId],
    queryFn: async () => { const { data } = await supabase.from("documents").select("*").eq("shipment_id", shipmentId!); return data || []; },
    enabled: !!shipmentId,
  });

  const { data: shipmentServices } = useQuery({
    queryKey: ["book-services", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("shipment_services").select("*").eq("shipment_id", shipmentId!).maybeSingle();
      return data;
    },
    enabled: !!shipmentId,
  });

  const { data: customsFiling } = useQuery({
    queryKey: ["book-customs", shipmentId],
    queryFn: async () => {
      const { data } = await supabase.from("customs_filings").select("*").eq("shipment_id", shipmentId!).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!shipmentId,
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
    if (containers?.[0]) setContainerQty(containers[0].quantity?.toString() || "1");
    if (parties) {
      const shipper = parties.find((p: any) => p.role === "shipper");
      const consignee = parties.find((p: any) => p.role === "consignee");
      const notify = parties.find((p: any) => p.role === "notify_party");
      if (shipper) { setShipperName(shipper.company_name || ""); setShipperAddress(shipper.address || ""); }
      if (consignee) { setConsigneeName(consignee.company_name || ""); setConsigneeAddress(consignee.address || ""); }
      if (notify) setNotifyParty(notify.company_name || "");
    }
    if (shipmentServices) {
      setNeedsCustoms(shipmentServices.customs_clearance || false);
      setNeedsTrucking(shipmentServices.trucking || false);
      setNeedsWarehouse(shipmentServices.warehousing || false);
      setNeedsInsurance(shipmentServices.insurance || false);
    }
  }, [cargo, containers, parties, shipmentServices]);

  // Pre-populate AES form from existing customs filing or party data
  useEffect(() => {
    if (customsFiling) {
      setAesExporterName(customsFiling.exporter_name || "");
      setAesExporterEin(customsFiling.exporter_ein || "");
      setAesConsigneeName(customsFiling.consignee_name || "");
      setAesConsigneeAddress(customsFiling.consignee_address || "");
      setAesCountryOfDestination(customsFiling.country_of_destination || "");
      setAesBrokerName(customsFiling.broker_name || "");
      setAesBrokerEmail(customsFiling.broker_email || "");
      setAesAesCitation(customsFiling.aes_citation || "");
      setAesFilingId(customsFiling.id);
    } else if (parties) {
      // Auto-fill from party data if no customs filing exists yet
      const shipper = parties.find((p: any) => p.role === "shipper");
      const consignee = parties.find((p: any) => p.role === "consignee");
      if (shipper && !aesExporterName) setAesExporterName(shipper.company_name || "");
      if (consignee && !aesConsigneeName) {
        setAesConsigneeName(consignee.company_name || "");
        setAesConsigneeAddress(consignee.address || "");
      }
    }
  }, [customsFiling, parties]);

  // If arriving with an existing shipment ID (resume), jump to details
  useEffect(() => {
    if (shipmentId && step === "search" && !urlParams.get("step")) {
      setStep("details");
    }
  }, [shipmentId]);

  // Restore pending booking from sessionStorage after login redirect
  useEffect(() => {
    if (!user) return;
    const pending = sessionStorage.getItem("pendingBooking");
    if (!pending) return;
    // Only process once
    sessionStorage.removeItem("pendingBooking");
    const doRestore = async () => {
      try {
        const rate: RateSelection = JSON.parse(pending);
        setIsLoading(true);
        toast.info("Restoring your selected quote...");
        const draft = await createShipmentDraft(rate);
        setShipmentId(draft.id);
        // Populate searchParams so summary panel works
        setSearchParams({
          origin: rate.originPort,
          destination: rate.destinationPort,
          mode: rate.mode,
          containerSize: rate.containerType,
          containerType: rate.containerType,
          commodity: "",
          weight: "",
          containers: 1,
        });
        toast.success(`Shipment ${draft.shipment_ref} created — continue your booking`);
        setStep("details");
      } catch (err: any) {
        console.error("Failed to restore pending booking:", err);
        toast.error("We couldn't restore your selected quote. Please search and select a rate again.");
        setStep("search");
      } finally {
        setIsLoading(false);
      }
    };
    doRestore();
  }, [user]);

  /* ── Search handler ── */
  const handleSearch = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);
    try {
      const today = new Date().toISOString().split("T")[0];

      // 1. Stored carrier rates (all carriers, including Evergreen contract rates)
      let ratesQuery = supabase.from("carrier_rates").select("*")
        .eq("origin_port", params.origin)
        .eq("destination_port", params.destination)
        .eq("mode", params.mode)
        .gte("valid_until", today)
        .order("base_rate", { ascending: true });
      if (params.mode === "ocean") ratesQuery = ratesQuery.eq("container_type", params.containerSize);

      // 2. Live Evergreen sailings via DCSA Commercial Schedules (ocean only)
      const evergreenPromise = params.mode === "ocean"
        ? supabase.functions.invoke("schedule-search", {
            body: {
              query_type: "point_to_point",
              portOfLoading: params.origin,
              portOfDischarge: params.destination,
              departureDate: today,
            },
          }).catch((err) => {
            console.warn("Evergreen schedule-search failed (non-fatal):", err);
            return { data: null, error: err };
          })
        : Promise.resolve({ data: null, error: null });

      const [{ data: ratesData, error: ratesErr }, { data: schedData }] =
        await Promise.all([ratesQuery, evergreenPromise]);

      if (ratesErr) throw ratesErr;

      // Build stored-rate options first
      const storedOptions: SailingOption[] = (ratesData || []).map((r: any, idx: number) => {
        const surcharges = Array.isArray(r.surcharges) ? r.surcharges : [];
        const surchargeTotal = surcharges.reduce((s: number, sc: any) => s + (Number(sc.amount) || 0), 0);
        const etd = new Date(r.valid_from);
        etd.setDate(etd.getDate() + Math.floor(Math.random() * 7));
        const eta = new Date(etd);
        eta.setDate(eta.getDate() + (r.transit_days || 28));

        let ai_label: string | undefined, ai_reason: string | undefined;
        if (idx === 0) { ai_label = "Best Value"; ai_reason = "Lowest total cost with reliable transit time"; }
        else if (r.transit_days && r.transit_days <= 20) { ai_label = "Fastest"; ai_reason = "Shortest transit time on this lane"; }

        return {
          ...r,
          total_rate: r.base_rate + surchargeTotal,
          ai_label, ai_reason,
          etd: etd.toISOString(),
          eta: eta.toISOString(),
          availability: (r.base_rate + surchargeTotal) < 2000 ? "High" : (r.base_rate + surchargeTotal) < 3000 ? "Medium" : "Limited",
        };
      });

      // 3. Merge live Evergreen sailings, priced from stored Evergreen contract rate on same lane
      const liveOptions: SailingOption[] = [];
      const scheduleIds: string[] = Array.isArray(schedData?.schedule_ids) ? schedData.schedule_ids : [];

      if (scheduleIds.length > 0) {
        // Find stored Evergreen contract rate for this lane to price the live sailings
        const evergreenRate = (ratesData || []).find((r: any) =>
          (r.carrier || "").toLowerCase().includes("evergreen") ||
          (r.carrier_code || "").toUpperCase() === "EGLV"
        );
        const surcharges: any[] = (evergreenRate && Array.isArray((evergreenRate as any).surcharges))
          ? ((evergreenRate as any).surcharges as any[])
          : [];
        const surchargeTotal: number = surcharges.reduce((s: number, sc: any) => s + (Number(sc?.amount) || 0), 0);
        const baseRate: number = Number((evergreenRate as any)?.base_rate ?? 0);
        const totalRate: number = baseRate + surchargeTotal;
        const currency: string = (evergreenRate as any)?.currency || "USD";

        // Fetch a small batch of schedule details (cap to 5 to keep search snappy)
        const detailFetches = scheduleIds.slice(0, 5).map((id) =>
          supabase.functions.invoke("schedule-detail", { body: { schedule_id: id } })
            .catch(() => ({ data: null }))
        );
        const details = await Promise.all(detailFetches);

        details.forEach((res, i) => {
          const sched = (res as any)?.data;
          if (!sched?.schedule) return;
          const firstLeg = sched.legs?.[0];
          const lastLeg = sched.legs?.[sched.legs.length - 1];
          const etd = firstLeg?.planned_departure || null;
          const eta = lastLeg?.planned_arrival || null;
          const transitDays = etd && eta
            ? Math.max(1, Math.round((new Date(eta).getTime() - new Date(etd).getTime()) / (1000 * 60 * 60 * 24)))
            : evergreenRate?.transit_days || null;
          const vesselName = sched.vessel_schedule?.[0]?.vessel_name || firstLeg?.alc_vessels?.vessel_name || null;

          liveOptions.push({
            id: `live-eglv-${scheduleIds[i]}`,
            carrier: "Evergreen",
            origin_port: params.origin,
            destination_port: params.destination,
            container_type: params.containerSize,
            base_rate: baseRate,
            currency,
            transit_days: transitDays,
            valid_from: today,
            valid_until: evergreenRate?.valid_until || today,
            surcharges,
            notes: vesselName ? `Vessel: ${vesselName}` : "Live Evergreen sailing",
            service_level: sched.schedule?.service_name || sched.schedule?.service_code || "Live sailing",
            free_time_days: evergreenRate?.free_time_days || null,
            total_rate: totalRate,
            ai_label: "Live Sailing",
            ai_reason: evergreenRate ? "Live Evergreen schedule priced from your contract rate" : "Live Evergreen schedule — quote on request",
            etd: etd || undefined,
            eta: eta || undefined,
            availability: "Live",
          });
        });
      }

      // Merge: live sailings first, then stored rates (deduping any stored Evergreen rate that's now live-priced)
      const merged = [...liveOptions, ...storedOptions].sort((a, b) => a.total_rate - b.total_rate);

      setSailingOptions(merged);
      setStep("rates");

      if (params.mode === "ocean" && liveOptions.length === 0 && scheduleIds.length === 0) {
        toast.info("No live Evergreen sailings on this lane — showing stored rates only.");
      }
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Failed to search rates.");
      setSailingOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);


  /* ── Select sailing → create draft ── */
  const handleSelectSailing = useCallback(async (sailing: SailingOption) => {
    setIsLoading(true);
    try {
      const surcharges = Array.isArray(sailing.surcharges) ? sailing.surcharges : [];
      const rateSelection: RateSelection = {
        rateId: sailing.id,
        carrier: sailing.carrier,
        originPort: sailing.origin_port,
        destinationPort: sailing.destination_port,
        mode: searchParams?.mode || "ocean",
        containerType: sailing.container_type,
        baseRate: sailing.base_rate,
        surcharges,
        totalRate: sailing.total_rate,
        currency: sailing.currency,
        transitDays: sailing.transit_days,
        etd: sailing.etd || null,
        eta: sailing.eta || null,
        validFrom: sailing.valid_from,
        validUntil: sailing.valid_until,
        serviceLevel: sailing.service_level,
        freeTimeDays: sailing.free_time_days,
      };

      const draft = await createShipmentDraft(rateSelection);
      setShipmentId(draft.id);
      toast.success(`Shipment ${draft.shipment_ref} created — complete your booking details`);
      setStep("details");
    } catch (err: any) {
      toast.error(err.message || "Failed to create shipment. Please log in.");
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  /* ── Persist draft data ── */
  const persistDraft = async () => {
    if (!shipmentId || !user) throw new Error("Please log in.");

    const existingCargo = cargo?.[0];
    if (existingCargo) {
      await supabase.from("cargo").update({
        commodity: commodity || null, hs_code: hsCode || null,
        gross_weight: weight ? parseFloat(weight) : null,
        volume: volume ? parseFloat(volume) : null,
        num_packages: numPackages ? parseInt(numPackages) : null,
        dangerous_goods: dangerousGoods,
      }).eq("id", existingCargo.id);
    } else if (commodity || weight || hsCode) {
      await supabase.from("cargo").insert({
        shipment_id: shipmentId, commodity: commodity || null, hs_code: hsCode || null,
        gross_weight: weight ? parseFloat(weight) : null,
        volume: volume ? parseFloat(volume) : null,
        num_packages: numPackages ? parseInt(numPackages) : null,
        dangerous_goods: dangerousGoods,
      });
    }

    const upsertParty = async (role: string, companyName: string, address: string) => {
      if (!companyName) return;
      const existing = parties?.find((p: any) => p.role === role);
      if (existing) {
        await supabase.from("shipment_parties").update({ company_name: companyName, address: address || null }).eq("id", existing.id);
      } else {
        await supabase.from("shipment_parties").insert({
          shipment_id: shipmentId, role, company_name: companyName, address: address || null, assigned_by_user_id: user.id,
        });
      }
    };
    await upsertParty("shipper", shipperName, shipperAddress);
    await upsertParty("consignee", consigneeName, consigneeAddress);
    if (notifyParty) await upsertParty("notify_party", notifyParty, "");

    if (containers?.[0]) {
      await supabase.from("containers").update({ quantity: parseInt(containerQty) || 1 }).eq("id", containers[0].id);
    }

    await supabase.from("shipment_services").upsert({
      shipment_id: shipmentId,
      customs_clearance: needsCustoms, trucking: needsTrucking, warehousing: needsWarehouse, insurance: needsInsurance,
    } as any, { onConflict: "shipment_id" });

    // Save AES / Customs filing data
    if (aesExporterName || aesExporterEin || aesConsigneeName) {
      const filingData = {
        shipment_id: shipmentId,
        user_id: user.id,
        filing_type: "AES" as const,
        status: "draft" as const,
        exporter_name: aesExporterName || null,
        exporter_ein: aesExporterEin || null,
        consignee_name: aesConsigneeName || null,
        consignee_address: aesConsigneeAddress || null,
        country_of_destination: aesCountryOfDestination || null,
        broker_name: aesBrokerName || null,
        broker_email: aesBrokerEmail || null,
        aes_citation: aesAesCitation || null,
        port_of_export: shipment?.origin_port || null,
        port_of_unlading: shipment?.destination_port || null,
        mode_of_transport: shipment?.mode === "air" ? "air" : "vessel",
        vessel_name: shipment?.vessel || null,
        voyage_number: shipment?.voyage || null,
        export_date: shipment?.etd || null,
        hts_codes: cargo?.[0]?.hs_code ? [{ code: cargo[0].hs_code, description: cargo[0].commodity || "", quantity: cargo[0].num_packages, value: cargo[0].total_value }] : [],
      };

      if (aesFilingId) {
        const { status, filing_type, shipment_id: _sid, user_id: _uid, ...updateData } = filingData;
        await supabase.from("customs_filings").update(updateData).eq("id", aesFilingId);
      } else {
        const { data: newFiling } = await supabase.from("customs_filings").insert(filingData).select("id").single();
        if (newFiling) setAesFilingId(newFiling.id);
      }
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["book-cargo", shipmentId] }),
      queryClient.invalidateQueries({ queryKey: ["book-parties", shipmentId] }),
      queryClient.invalidateQueries({ queryKey: ["book-containers", shipmentId] }),
      queryClient.invalidateQueries({ queryKey: ["book-services", shipmentId] }),
      queryClient.invalidateQueries({ queryKey: ["book-shipment", shipmentId] }),
      queryClient.invalidateQueries({ queryKey: ["book-customs", shipmentId] }),
    ]);
  };

  /* ── Validate + advance ── */
  const validateAndAdvance = (nextStep: FlowStep) => {
    if (step === "cargo") {
      if (!commodity && !weight && !hsCode) { toast.error("Please provide cargo details."); return; }
      if (!shipperName) { toast.error("Shipper name is required."); return; }
      if (!consigneeName) { toast.error("Consignee name is required."); return; }
    }
    setStep(nextStep);
  };

  /* ── Save & Continue ── */
  const handleSaveAndContinue = async (nextStep: FlowStep) => {
    setSaving(true);
    try {
      await persistDraft();
      toast.success("Saved");
      validateAndAdvance(nextStep);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try { await persistDraft(); toast.success("Draft saved"); } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  /* ── Book Now, Pay Later ── */
  const handleBookLater = async () => {
    setBookingLater(true);
    try {
      await persistDraft();
      const transitionPath: Record<string, string> = {
        draft: "pending_pricing", pending_pricing: "quote_ready", quote_ready: "booked",
      };
      let stage = shipment?.lifecycle_stage || shipment?.status || "draft";
      while (stage !== "booked" && transitionPath[stage]) {
        const next = transitionPath[stage];
        await supabase.from("shipments").update({ lifecycle_stage: next, status: next }).eq("id", shipmentId);
        stage = next;
      }
      await queryClient.invalidateQueries({ queryKey: ["book-shipment", shipmentId] });
      toast.success("Booking confirmed!");
      setStep("confirmed");
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm booking");
    } finally {
      setBookingLater(false);
    }
  };

  const sellTotal = financials.filter(f => f.entry_type === "revenue").reduce((s, f) => s + (f.amount || 0), 0);

  /* ── Step content with two-column layout from step 3 ── */
  const renderStepContent = () => {
    switch (step) {
      case "search":
        return (
          <BookingSearchStep
            onSearch={handleSearch}
            isLoading={isLoading}
            defaultOrigin={urlParams.get("origin") || undefined}
            defaultDestination={urlParams.get("destination") || undefined}
          />
        );

      case "rates":
        return (
          <div className="space-y-4">
            {/* AI Intelligence Banner for this route */}
            {searchParams && (
              <BookingIntelligenceBanner
                origin={searchParams.origin}
                destination={searchParams.destination}
                mode={searchParams.mode}
                commodity={searchParams.commodity}
                containerType={searchParams.containerSize}
              />
            )}
            <SailingBoardStep
              options={sailingOptions}
              searchParams={searchParams!}
              onSelect={handleSelectSailing}
              onBack={() => setStep("search")}
            />
          </div>
        );

      case "details":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Anchor className="h-4 w-4 text-accent" /> Rate & Route Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-xs text-muted-foreground uppercase">Origin</p><p className="font-medium">{shipment?.origin_port || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">Destination</p><p className="font-medium">{shipment?.destination_port || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">Carrier</p><p className="font-medium">{shipment?.carrier || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">Mode</p><p className="font-medium">{shipment?.mode === "air" ? "Air Freight" : "Ocean FCL"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">ETD</p><p className="font-medium">{shipment?.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">ETA</p><p className="font-medium">{shipment?.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">Price</p><p className="font-bold text-accent">{sellTotal > 0 ? `$${sellTotal.toLocaleString()}` : "TBD"}</p></div>
                    <div><p className="text-xs text-muted-foreground uppercase">Ref</p><p className="font-medium">{shipment?.shipment_ref || "—"}</p></div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("search")}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> New Search
                </Button>
                <Button variant="electric" onClick={() => handleSaveAndContinue("cargo")}>
                  Continue to Cargo & Parties <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
            <BookingSummaryPanel shipment={shipment} financials={financials} cargo={cargo} parties={parties} documents={documents} services={shipmentServices} />
          </div>
        );

      case "cargo":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              <BookingSection title="Cargo Details" icon={Package} defaultOpen={true}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-xs text-muted-foreground">Commodity</Label><Input value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="e.g. Electronics" className="mt-1" /></div>
                    <div><Label className="text-xs text-muted-foreground">HS Code</Label><div className="mt-1"><HsCodeAutocomplete value={hsCode} commodity={commodity} onChange={setHsCode} placeholder="e.g. 8471.30.01.00" /></div></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label className="text-xs text-muted-foreground">Weight (kg)</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="18000" className="mt-1" /></div>
                    <div><Label className="text-xs text-muted-foreground">Volume (CBM)</Label><Input type="number" value={volume} onChange={e => setVolume(e.target.value)} placeholder="33" className="mt-1" /></div>
                    <div><Label className="text-xs text-muted-foreground">Packages</Label><Input type="number" value={numPackages} onChange={e => setNumPackages(e.target.value)} placeholder="50" className="mt-1" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-xs text-muted-foreground">Container Qty</Label><Input type="number" min="1" value={containerQty} onChange={e => setContainerQty(e.target.value)} className="mt-1" /></div>
                    <div className="flex items-center gap-3 pt-5"><Switch checked={dangerousGoods} onCheckedChange={setDangerousGoods} /><Label className="text-xs">Dangerous Goods</Label></div>
                  </div>
                </div>
              </BookingSection>

              <BookingSection title="Parties" icon={User} defaultOpen={true}>
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shipper / Exporter</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-xs text-muted-foreground">Name</Label><Input value={shipperName} onChange={e => setShipperName(e.target.value)} placeholder="Company name" className="mt-1" /></div>
                      <div><Label className="text-xs text-muted-foreground">Address</Label><div className="mt-1"><AddressAutocomplete value={shipperAddress} onChange={setShipperAddress} placeholder="Full address" /></div></div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Consignee</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-xs text-muted-foreground">Name</Label><Input value={consigneeName} onChange={e => setConsigneeName(e.target.value)} placeholder="Company name" className="mt-1" /></div>
                      <div><Label className="text-xs text-muted-foreground">Address</Label><div className="mt-1"><AddressAutocomplete value={consigneeAddress} onChange={setConsigneeAddress} placeholder="Full address" /></div></div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notify Party</p>
                    <Input value={notifyParty} onChange={e => setNotifyParty(e.target.value)} placeholder="Notify party name" />
                  </div>
                </div>
              </BookingSection>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("details")}><ArrowLeft className="h-4 w-4 mr-1.5" /> Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSaveDraft} disabled={saving}><Save className="h-4 w-4 mr-1.5" />{saving ? "Saving..." : "Save Draft"}</Button>
                  <Button variant="electric" onClick={() => handleSaveAndContinue("logistics")}><Send className="h-4 w-4 mr-1.5" />Save & Continue</Button>
                </div>
              </div>
            </div>
            <BookingSummaryPanel shipment={shipment} financials={financials} cargo={cargo} parties={parties} documents={documents} services={shipmentServices} />
          </div>
        );

      case "logistics":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <LogisticsSetupStep
              shipmentId={shipmentId!}
              originPort={shipment?.origin_port || ""}
              destinationPort={shipment?.destination_port || ""}
              shipment={shipment}
              needsTrucking={needsTrucking}
              setNeedsTrucking={setNeedsTrucking}
              needsWarehouse={needsWarehouse}
              setNeedsWarehouse={setNeedsWarehouse}
              onBack={() => setStep("cargo")}
              onContinue={() => handleSaveAndContinue("compliance")}
              onSaveDraft={handleSaveDraft}
              saving={saving}
            />
            <BookingSummaryPanel shipment={shipment} financials={financials} cargo={cargo} parties={parties} documents={documents} services={shipmentServices} />
          </div>
        );

      case "compliance":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              <BookingSection title="US Export Compliance (AES / EEI)" icon={Shield} defaultOpen={true}>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <Info className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Electronic Export Information (EEI)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Required for exports valued over $2,500 per Schedule B code. Complete the fields below to prepare your AES filing.</p>
                    </div>
                  </div>

                  {/* Exporter / USPPI */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Exporter / USPPI</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label className="text-xs">Exporter Name (USPPI) *</Label><Input value={aesExporterName} onChange={e => setAesExporterName(e.target.value)} placeholder="Company legal name" className="mt-1" /></div>
                      <div><Label className="text-xs">Exporter EIN *</Label><Input value={aesExporterEin} onChange={e => setAesExporterEin(e.target.value)} placeholder="XX-XXXXXXX" className="mt-1" /></div>
                    </div>
                  </div>

                  <Separator />

                  {/* Consignee */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ultimate Consignee</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label className="text-xs">Consignee Name *</Label><Input value={aesConsigneeName} onChange={e => setAesConsigneeName(e.target.value)} placeholder="Receiving company name" className="mt-1" /></div>
                      <div><Label className="text-xs">Country of Destination *</Label><Input value={aesCountryOfDestination} onChange={e => setAesCountryOfDestination(e.target.value)} placeholder="e.g. China" className="mt-1" /></div>
                      <div className="sm:col-span-2"><Label className="text-xs">Consignee Address</Label><Input value={aesConsigneeAddress} onChange={e => setAesConsigneeAddress(e.target.value)} placeholder="Full address" className="mt-1" /></div>
                    </div>
                  </div>

                  <Separator />

                  {/* Broker */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Customs Broker (Optional)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label className="text-xs">Broker Name</Label><Input value={aesBrokerName} onChange={e => setAesBrokerName(e.target.value)} placeholder="Broker company" className="mt-1" /></div>
                      <div><Label className="text-xs">Broker Email</Label><Input value={aesBrokerEmail} onChange={e => setAesBrokerEmail(e.target.value)} placeholder="broker@example.com" className="mt-1" /></div>
                    </div>
                  </div>

                  <Separator />

                  {/* Exemption */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Exemption Citation</p>
                    <div><Label className="text-xs">AES Exemption Citation</Label><Input value={aesAesCitation} onChange={e => setAesAesCitation(e.target.value)} placeholder="e.g. 30.37(a) — Under $2,500 per Schedule B" className="mt-1" /></div>
                    <p className="text-[10px] text-muted-foreground mt-1">Leave blank if filing is required. Enter 30.37(a) if shipment qualifies for low-value exemption.</p>
                  </div>

                  {/* Auto-filled route info */}
                  {shipment && (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Auto-filled from Shipment</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div><span className="text-muted-foreground">Port of Export</span><p className="font-medium">{shipment.origin_port || "—"}</p></div>
                        <div><span className="text-muted-foreground">Port of Unlading</span><p className="font-medium">{shipment.destination_port || "—"}</p></div>
                        <div><span className="text-muted-foreground">Mode</span><p className="font-medium">{shipment.mode === "air" ? "Air" : "Vessel"}</p></div>
                        <div><span className="text-muted-foreground">Export Date</span><p className="font-medium">{shipment.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "—"}</p></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Switch checked={needsCustoms} onCheckedChange={setNeedsCustoms} />
                    <div><Label className="text-sm">Request Customs Clearance Service</Label><p className="text-xs text-muted-foreground">We handle the full customs clearance process on your behalf</p></div>
                  </div>
                </div>
              </BookingSection>

              <BookingSection title="Additional Services" icon={Truck} defaultOpen={true}>
                <div className="space-y-4">
                  {[
                    { key: "trucking", label: "Origin Trucking", desc: "Pickup from shipper to port", state: needsTrucking, setter: setNeedsTrucking, icon: Truck },
                    { key: "warehouse", label: "Warehouse Services", desc: "Storage at origin or destination", state: needsWarehouse, setter: setNeedsWarehouse, icon: Container },
                    { key: "insurance", label: "Cargo Insurance", desc: "All-risk cargo insurance coverage", state: needsInsurance, setter: setNeedsInsurance, icon: Shield },
                  ].map(svc => (
                    <div key={svc.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center"><svc.icon className="h-4 w-4 text-accent" /></div>
                        <div><p className="text-sm font-medium">{svc.label}</p><p className="text-xs text-muted-foreground">{svc.desc}</p></div>
                      </div>
                      <Switch checked={svc.state} onCheckedChange={svc.setter} />
                    </div>
                  ))}
                  <div><Label className="text-xs text-muted-foreground">Special Instructions</Label><Textarea value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} placeholder="Any special requirements..." className="mt-1" rows={3} /></div>
                </div>
              </BookingSection>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("logistics")}><ArrowLeft className="h-4 w-4 mr-1.5" /> Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSaveDraft} disabled={saving}><Save className="h-4 w-4 mr-1.5" />{saving ? "Saving..." : "Save Draft"}</Button>
                  <Button variant="electric" onClick={() => handleSaveAndContinue("documents")}><Send className="h-4 w-4 mr-1.5" />Save & Continue</Button>
                </div>
              </div>
            </div>
            <BookingSummaryPanel shipment={shipment} financials={financials} cargo={cargo} parties={parties} documents={documents} services={shipmentServices} />
          </div>
        );

      case "documents":
        return (
          <BookingDocumentReviewStep
            shipment={shipment}
            documents={documents}
            services={shipmentServices}
            financials={financials}
            cargo={cargo}
            parties={parties}
            onBack={() => setStep("compliance")}
            onSaveDraft={handleSaveDraft}
            onContinue={() => handleSaveAndContinue("payment")}
            saving={saving}
          />
        );

      case "payment":
        return (
          <BookingPaymentStep
            shipment={shipment}
            financials={financials}
            shipmentId={shipmentId!}
            onBack={() => setStep("documents")}
            onBookLater={handleBookLater}
            bookingLater={bookingLater}
          />
        );

      case "confirmed":
        return <BookingConfirmationStep shipment={shipment} financials={financials} />;

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <SEO title="Book Shipment — Search, Price & Book" description="Complete your shipment booking in one unified flow." />

      <div className="max-w-6xl mx-auto px-4 py-2">
        <BookingProgressBar currentStep={step} steps={STEPS} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky bottom price bar for middle steps */}
      {["details", "cargo", "logistics", "compliance"].includes(step) && (
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-3 z-20">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="text-lg font-bold text-accent">{sellTotal > 0 ? `$${sellTotal.toLocaleString()}` : "TBD"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Ship className="h-3.5 w-3.5" />
              {shipment?.origin_port || "—"} → {shipment?.destination_port || "—"}
              {shipment?.carrier && <> · {shipment.carrier}</>}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default UnifiedBookingFlow;
