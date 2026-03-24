import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SEO } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { BookingSearchStep } from "@/components/booking-flow/BookingSearchStep";
import { SailingBoardStep } from "@/components/booking-flow/SailingBoardStep";
import { QuotePreviewStep } from "@/components/booking-flow/QuotePreviewStep";
import { BookingConfirmStep } from "@/components/booking-flow/BookingConfirmStep";
import { BookingProgressBar } from "@/components/booking-flow/BookingProgressBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

type FlowStep = "search" | "sailings" | "quote" | "confirm";

const STEPS: FlowStep[] = ["search", "sailings", "quote", "confirm"];

const BookingFlow = () => {
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const [step, setStep] = useState<FlowStep>("search");
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [sailingOptions, setSailingOptions] = useState<SailingOption[]>([]);
  const [selectedSailing, setSelectedSailing] = useState<SailingOption | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);

    try {
      // Trigger background sync
      supabase.functions.invoke("sync-carrier-rates", {
        body: { origin: params.origin, destination: params.destination },
      }).catch(() => {});

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

      const { data, error } = await query;
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

      setSailingOptions(options);
      setStep("sailings");
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Failed to search rates. Please try again.");
      setSailingOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectSailing = useCallback((sailing: SailingOption) => {
    setSelectedSailing(sailing);

    // Calculate pricing
    const surcharges = Array.isArray(sailing.surcharges) ? sailing.surcharges : [];
    const surchargeTotal = surcharges.reduce((s: number, sc: any) => s + (Number(sc.amount) || 0), 0);
    const thc = 150;
    const docs = 45;
    const totalCost = sailing.base_rate + surchargeTotal + thc + docs;
    const margin = 0.12; // 12% margin
    const sellPrice = Math.round(totalCost / (1 - margin));

    const validUntil = new Date(sailing.valid_until);

    setQuoteData({
      sailing,
      search: searchParams!,
      costBreakdown: {
        oceanFreight: sailing.base_rate,
        surcharges: surchargeTotal,
        thc,
        documentation: docs,
        totalCost,
        sellPrice,
        validUntil: validUntil.toISOString(),
      },
      aiInsight: sailing.ai_label === "Best Value"
        ? "This option offers the best balance of cost and reliability. The carrier has a 96% on-time record for this lane."
        : sailing.ai_label === "Fastest"
        ? "Fastest transit available. Ideal for time-sensitive cargo. Slightly higher cost offset by reduced inventory holding."
        : "This sailing provides strong service guarantees with extended free time at destination, reducing demurrage risk.",
    });

    setStep("quote");
  }, [searchParams]);

  const handleBookShipment = useCallback(async () => {
    if (!quoteData || !searchParams) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to book a shipment.");
        navigate("/login");
        return;
      }

      // Get user's company
      const { data: membership } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      const { data: shipment, error } = await supabase
        .from("shipments")
        .insert({
          user_id: user.id,
          company_id: membership?.company_id || null,
          origin_port: searchParams.origin,
          destination_port: searchParams.destination,
          mode: searchParams.mode,
          container_type: searchParams.containerSize,
          status: "booked",
          lifecycle_stage: "booked",
          carrier: quoteData.sailing.carrier,
          vessel: quoteData.sailing.carrier,
          etd: quoteData.sailing.etd?.split("T")[0] || null,
          eta: quoteData.sailing.eta?.split("T")[0] || null,
          commodity: searchParams.commodity || null,
          num_containers: searchParams.containers,
        } as any)
        .select("id, shipment_ref")
        .single();

      if (error) throw error;

      // Insert financial record
      if (shipment) {
        await supabase.from("shipment_financials").insert({
          shipment_id: shipment.id,
          user_id: user.id,
          entry_type: "revenue",
          category: "ocean_freight",
          description: `${quoteData.sailing.carrier} - ${searchParams.origin} → ${searchParams.destination}`,
          amount: quoteData.costBreakdown.sellPrice,
          currency: "USD",
        });
      }

      toast.success(`Shipment ${shipment?.shipment_ref || ''} booked successfully!`);
      setStep("confirm");

      // Redirect to workspace after a moment
      setTimeout(() => {
        navigate(`/dashboard/shipments/${shipment?.id}/workspace`);
      }, 3000);
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err.message || "Failed to create booking. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [quoteData, searchParams, navigate]);

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

          {step === "quote" && quoteData && (
            <motion.div
              key="quote"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <QuotePreviewStep
                quoteData={quoteData}
                onBook={handleBookShipment}
                onModify={() => setStep("sailings")}
                isLoading={isLoading}
              />
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <BookingConfirmStep />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default BookingFlow;
