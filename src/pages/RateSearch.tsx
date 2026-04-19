import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/SEO";
import { RateSearchForm } from "@/components/rate-search/RateSearchForm";
import { RateResultsPanel } from "@/components/rate-search/RateResultsPanel";
import { supabase } from "@/integrations/supabase/client";
import { createShipmentDraft, type RateSelection } from "@/lib/create-shipment-draft";
import { toast } from "sonner";
import { Ship } from "lucide-react";
import { motion } from "framer-motion";

interface SearchParams {
  origin: string;
  destination: string;
  containerSize: string;
  containerType: string;
  mode: "ocean" | "air";
}

const RateSearch = () => {
  const [urlParams] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [autoBooking, setAutoBooking] = useState(false);

  // Resume pending booking after login redirect
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingBooking");
    if (!pending) return;

    // Wait for auth session to be fully established before creating draft
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) return;
      
      // Only process once
      const stillPending = sessionStorage.getItem("pendingBooking");
      if (!stillPending) return;
      
      setAutoBooking(true);
      try {
        const rateSelection: RateSelection = JSON.parse(stillPending);
        sessionStorage.removeItem("pendingBooking");
        const draft = await createShipmentDraft(rateSelection);
        toast.success(`Shipment ${draft.shipment_ref} created!`);
        navigate(`/dashboard/shipments/${draft.id}/workspace`);
      } catch (err: any) {
        toast.error(err.message || "Failed to resume booking");
        sessionStorage.removeItem("pendingBooking");
        setAutoBooking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);

    try {
      await fetchRates(params);
    } catch (err) {
      console.error("Rate search error:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRates = async (params: SearchParams) => {
    const today = new Date().toISOString().split("T")[0];

    // 1) Local/contract rates from carrier_rates
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
    const { data: localRates, error } = await query;
    if (error) throw error;

    // 2) Live Evergreen sailings (ocean only) → mapped to rate cards
    let liveRates: any[] = [];
    if (params.mode === "ocean") {
      try {
        const fromDate = today;
        const toDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const { data: evg } = await supabase.functions.invoke("evergreen-commercial-schedules", {
          body: {
            query_type: "point-to-point",
            query_params: {
              placeOfReceipt: params.origin,
              placeOfDelivery: params.destination,
              departureDateFrom: fromDate,
              departureDateTo: toDate,
            },
          },
        });
        if (evg?.success && Array.isArray(evg.data)) {
          liveRates = evg.data.map((sail: any, idx: number) => {
            const firstLeg = sail.legs?.[0];
            const vessel = firstLeg?.transport?.vessel?.name || "Evergreen Vessel";
            const voyage = firstLeg?.transport?.servicePartners?.[0]?.carrierExportVoyageNumber || "";
            const etd = sail.placeOfReceipt?.dateTime || sail.legs?.[0]?.departure?.dateTime;
            const eta = sail.placeOfDelivery?.dateTime || sail.legs?.[sail.legs.length - 1]?.arrival?.dateTime;
            // Indicative pricing — Evergreen schedule API does not return rates; use placeholder until contract rates are configured.
            const baseRate = params.containerSize === "20gp" ? 1850 : params.containerSize === "40gp" ? 2950 : 3250;
            return {
              id: `evg-${idx}-${voyage || vessel}`,
              carrier: `Evergreen Line${vessel ? ` — ${vessel}` : ""}${voyage ? ` (${voyage})` : ""}`,
              origin_port: params.origin,
              destination_port: params.destination,
              container_type: params.containerSize,
              base_rate: baseRate,
              currency: "USD",
              transit_days: sail.transitTime ?? null,
              valid_from: etd ? etd.split("T")[0] : today,
              valid_until: eta ? eta.split("T")[0] : today,
              surcharges: [
                { code: "BAF", description: "Bunker Adjustment Factor", amount: 280 },
                { code: "THC_ORIGIN", description: "Origin Terminal Handling", amount: 195 },
                { code: "THC_DEST", description: "Destination Terminal Handling", amount: 215 },
                { code: "DOC", description: "Documentation Fee", amount: 75 },
              ],
              notes: `Live Evergreen sailing • ETD ${etd ? new Date(etd).toLocaleDateString() : "TBA"}`,
              rate_basis_type: "spot",
            };
          });
        }
      } catch (e) {
        console.warn("Evergreen live fetch failed:", e);
      }
    }

    // 3) HLAG Quick Quotes — instant live pricing (ocean only)
    let quickQuotes: any[] = [];
    if (params.mode === "ocean") {
      try {
        const isoEquip = params.containerSize === "20gp" ? "22GP"
          : params.containerSize === "40gp" ? "42GP"
          : params.containerSize === "40hc" ? "45GP" : "22GP";
        const { data: qq } = await supabase.functions.invoke("hapag-quick-quotes", {
          body: {
            action: "prices",
            placeOfReceipt: params.origin,
            placeOfDelivery: params.destination,
            isoEquipmentCode: isoEquip,
            units: 1,
          },
        });
        if (qq?.offers?.length) {
          quickQuotes = qq.offers.map((o: any, idx: number) => ({
            id: `hlag-quote-${o.offerId}`,
            carrier: "Hapag-Lloyd (Quick Quote)",
            origin_port: params.origin,
            destination_port: params.destination,
            container_type: params.containerSize,
            base_rate: Number(o.totalPrice) || 0,
            currency: o.currency || "USD",
            transit_days: o.transitDays ?? null,
            valid_from: today,
            valid_until: o.validUntil ? o.validUntil.split("T")[0] : today,
            surcharges: [],
            notes: `Live HLAG quick quote • ${o.productIdentifier || "QUICK_QUOTES"} • Binding on booking`,
            rate_basis_type: "live_quote",
            hlag_offer_id: o.offerId,
          }));
        }
      } catch (e) {
        console.warn("HLAG quick quotes failed:", e);
      }
    }

    setResults([...(localRates || []), ...liveRates, ...quickQuotes]);
  };

  // Auto-search when arriving from hero with URL params
  useEffect(() => {
    const origin = urlParams.get("origin");
    const destination = urlParams.get("destination");
    const mode = (urlParams.get("mode") as "ocean" | "air") || "ocean";
    if (origin && destination) {
      handleSearch({ origin, destination, containerSize: "40hc", containerType: "dry", mode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (autoBooking) {
    return (
      <MarketingLayout>
        <div className="flex flex-col items-center justify-center py-32">
          <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Resuming your booking...</p>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <SEO
        title="Instant Freight Rate Search — Compare Carrier Rates"
        description="Search and compare real-time ocean freight rates from top carriers. Get instant pricing for FCL shipments with full cost breakdowns."
        canonical="https://alcshipper.com/rates"
      />

      <section className="relative bg-gray-light overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" viewBox="0 0 1200 600">
            <path d="M0,300 Q300,100 600,250 T1200,200" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" />
            <path d="M0,400 Q300,250 600,350 T1200,300" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Ship className="h-4 w-4" />
              Instant Rate Search
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Compare freight rates instantly.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Search carrier rates for any route. Get real-time pricing with full cost breakdowns.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-background rounded-2xl border shadow-lg p-6 md:p-8"
          >
            <RateSearchForm
              onSearch={handleSearch}
              isLoading={isLoading}
              defaultOrigin={urlParams.get("origin") || undefined}
              defaultDestination={urlParams.get("destination") || undefined}
              defaultMode={(urlParams.get("mode") as "ocean" | "air") || undefined}
            />
          </motion.div>
        </div>
      </section>

      {(results !== null || isLoading) && (
        <section className="max-w-5xl mx-auto px-6 py-12">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Searching carrier rates...</p>
            </div>
          ) : results && searchParams ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <RateResultsPanel
                rates={results}
                origin={searchParams.origin}
                destination={searchParams.destination}
                containerSize={searchParams.containerSize}
                mode={searchParams.mode}
              />
            </motion.div>
          ) : null}
        </section>
      )}
    </MarketingLayout>
  );
};

export default RateSearch;
