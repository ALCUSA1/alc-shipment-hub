import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SEO } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { BookingSearchStep } from "@/components/booking-flow/BookingSearchStep";
import { SailingBoardStep } from "@/components/booking-flow/SailingBoardStep";
import { BookingProgressBar } from "@/components/booking-flow/BookingProgressBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createShipmentDraft, type RateSelection } from "@/lib/create-shipment-draft";

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
  // computed
  total_rate: number;
  ai_label?: string;
  ai_reason?: string;
  etd?: string;
  eta?: string;
  availability?: string;
  hlag_offer_id?: string;
}

export interface QuoteData {
  sailing: SailingOption;
  search: SearchParams;
  costBreakdown: {
    oceanFreight: number;
    surcharges: number;
    thc: number;
    documentation: number;
    totalCost: number;
    sellPrice: number;
    validUntil: string;
  };
  aiInsight: string;
}

type FlowStep = "search" | "sailings";

const STEPS: FlowStep[] = ["search", "sailings"];

const BookingFlow = () => {
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const [step, setStep] = useState<FlowStep>("search");
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [sailingOptions, setSailingOptions] = useState<SailingOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);

    try {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase
        .from("carrier_rates")
        .select("*")
        .eq("origin_port", params.origin)
        .eq("destination_port", params.destination)
        .eq("mode", params.mode)
        .gte("valid_until", today)
        .order("base_rate", { ascending: true });

      if (params.mode === "ocean") {
        query = query.eq("container_type", params.containerSize);
      }

      // Fetch in parallel: stored carrier_rates + live HLAG schedules + HLAG quick quotes
      const hlagPromise = params.mode === "ocean"
        ? supabase.functions.invoke("hapag-schedules", {
            body: {
              query_type: "point_to_point",
              placeOfReceipt: params.origin,
              placeOfDelivery: params.destination,
              limit: 5,
            },
          }).catch((e) => { console.warn("HLAG sailings unavailable:", e); return { data: null }; })
        : Promise.resolve({ data: null });

      const isoEquip = params.containerSize === "20gp" ? "22GP"
        : params.containerSize === "40gp" ? "42GP"
        : params.containerSize === "40hc" ? "45GP" : "22GP";

      const quickQuotesPromise = params.mode === "ocean"
        ? supabase.functions.invoke("hapag-quick-quotes", {
            body: {
              action: "prices",
              placeOfReceipt: params.origin,
              placeOfDelivery: params.destination,
              isoEquipmentCode: isoEquip,
              units: params.containers || 1,
              weightPerUnitKg: Number(params.weight) || 10000,
            },
          }).catch((e) => { console.warn("HLAG quick quotes unavailable:", e); return { data: null }; })
        : Promise.resolve({ data: null });

      const [{ data, error }, hlagRes, quickRes] = await Promise.all([query, hlagPromise, quickQuotesPromise]);
      if (error) throw error;

      const options: SailingOption[] = (data || []).map((r: any, idx: number) => {
        const surcharges = Array.isArray(r.surcharges) ? r.surcharges : [];
        const surchargeTotal = surcharges.reduce((s: number, sc: any) => s + (Number(sc.amount) || 0), 0);
        const total = r.base_rate + surchargeTotal;

        // Generate ETD/ETA from valid_from + transit_days
        const etd = new Date(r.valid_from);
        etd.setDate(etd.getDate() + Math.floor(Math.random() * 7));
        const eta = new Date(etd);
        eta.setDate(eta.getDate() + (r.transit_days || 28));

        // AI labels
        let ai_label: string | undefined;
        let ai_reason: string | undefined;
        if (idx === 0) {
          ai_label = "Best Value";
          ai_reason = "Lowest total cost with reliable transit time";
        } else if (r.transit_days && r.transit_days <= 20) {
          ai_label = "Fastest";
          ai_reason = "Shortest transit time on this lane";
        } else if (r.service_level === "premium" || r.free_time_days && r.free_time_days >= 14) {
          ai_label = "Premium Service";
          ai_reason = "Extended free time and premium service level";
        }

        return {
          ...r,
          total_rate: total,
          ai_label,
          ai_reason,
          etd: etd.toISOString(),
          eta: eta.toISOString(),
          availability: total < 2000 ? "High" : total < 3000 ? "Medium" : "Limited",
        };
      });

      // Append live Hapag-Lloyd sailings (indicative pricing) so users see real schedules
      const hlagSailings: any[] = (hlagRes as any)?.data?.sailings || [];
      const hlagOptions: SailingOption[] = hlagSailings.map((s: any, i: number) => {
        const indicativeRate = params.containerSize === "20gp" ? 1850 : 2950;
        return {
          id: `hlag-${s.schedule_id || i}`,
          carrier: "Hapag-Lloyd",
          origin_port: params.origin,
          destination_port: params.destination,
          container_type: params.containerSize,
          base_rate: indicativeRate,
          currency: "USD",
          transit_days: s.transit_days,
          valid_from: new Date().toISOString().split("T")[0],
          valid_until: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
          surcharges: [],
          notes: `Live HLAG sailing · Service ${s.service_code || "—"}${s.is_direct ? " · Direct" : ` · ${s.leg_count} legs`}`,
          service_level: s.service_name || null,
          free_time_days: 14,
          total_rate: indicativeRate,
          ai_label: i === 0 && options.length === 0 ? "Live Sailing" : undefined,
          ai_reason: "Real-time schedule from Hapag-Lloyd",
          etd: s.etd || undefined,
          eta: s.eta || undefined,
          availability: "High",
        };
      });

      // HLAG Quick Quotes — instant live pricing offers
      const quickOffers: any[] = (quickRes as any)?.data?.offers || [];
      const quickOptions: SailingOption[] = quickOffers.map((o: any, i: number) => ({
        id: `hlag-quote-${o.offerId}`,
        carrier: "Hapag-Lloyd (Quick Quote)",
        origin_port: params.origin,
        destination_port: params.destination,
        container_type: params.containerSize,
        base_rate: Number(o.totalPrice) || 0,
        currency: o.currency || "USD",
        transit_days: o.transitDays ?? null,
        valid_from: new Date().toISOString().split("T")[0],
        valid_until: o.validUntil ? o.validUntil.split("T")[0] : new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        surcharges: [],
        notes: `Live HLAG quick quote · ${o.productIdentifier || "QUICK_QUOTES"} · Locks on booking`,
        service_level: o.label || null,
        free_time_days: 14,
        total_rate: Number(o.totalPrice) || 0,
        ai_label: i === 0 ? "Live Quote" : undefined,
        ai_reason: "Instant binding price from Hapag-Lloyd",
        availability: "High",
        hlag_offer_id: o.offerId,
      }));

      setSailingOptions([...options, ...hlagOptions, ...quickOptions]);
      setStep("sailings");
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Failed to search rates. Please try again.");
      setSailingOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        hlagOfferId: sailing.hlag_offer_id,
      };

      const draft = await createShipmentDraft(rateSelection);
      toast.success(`Shipment ${draft.shipment_ref} created — complete your booking`);
      navigate(`/dashboard/shipments/${draft.id}/workspace`);
    } catch (err: any) {
      console.error("Draft creation error:", err);
      toast.error(err.message || "Failed to create shipment. Please log in.");
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, navigate]);

  // Note: handleBookShipment removed — sailing selection in handleSelectSailing
  // already creates draft via createShipmentDraft and redirects to workspace.
  // This is the unified booking flow: Rate Selection = Shipment Draft Creation.

  return (
    <DashboardLayout>
      <SEO
        title="Book Shipment — Search, Price & Book Instantly"
        description="Search sailing options, compare AI-powered pricing, and book your shipment in minutes."
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <BookingProgressBar currentStep={step} steps={STEPS} />

        <AnimatePresence mode="wait">
          {step === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <BookingSearchStep
                onSearch={handleSearch}
                isLoading={isLoading}
                defaultOrigin={urlParams.get("origin") || undefined}
                defaultDestination={urlParams.get("destination") || undefined}
              />
            </motion.div>
          )}

          {step === "sailings" && (
            <motion.div
              key="sailings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <SailingBoardStep
                options={sailingOptions}
                searchParams={searchParams!}
                onSelect={handleSelectSailing}
                onBack={() => setStep("search")}
              />
            </motion.div>
          )}

          {/* Quote and Confirm steps removed — sailing selection now creates
              shipment draft immediately and redirects to unified workspace.
              This eliminates the fragmented booking path. */}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default BookingFlow;
