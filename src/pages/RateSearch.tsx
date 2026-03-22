import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/SEO";
import { RateSearchForm } from "@/components/rate-search/RateSearchForm";
import { RateResultsPanel } from "@/components/rate-search/RateResultsPanel";
import { supabase } from "@/integrations/supabase/client";
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
  const [results, setResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);

  const handleSearch = async (params: SearchParams) => {
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

      const { data, error } = await query;
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error("Rate search error:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
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
