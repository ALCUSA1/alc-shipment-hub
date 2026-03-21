import { Button } from "@/components/ui/button";
import { Globe, Search, Ship, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { PortSelector } from "@/components/shipment/PortSelector";
import { RateResultsPanel } from "@/components/rate-search/RateResultsPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function HeroSection() {
  const [mode, setMode] = useState<"ocean" | "air">("ocean");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const { data: ports = [] } = useQuery({
    queryKey: ["ports-hero"],
    queryFn: async () => {
      const { data } = await supabase.from("ports").select("code, name, country").order("name");
      return data || [];
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    setIsLoading(true);
    setSearchDone(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase
        .from("carrier_rates")
        .select("*")
        .eq("origin_port", origin)
        .eq("destination_port", destination)
        .eq("mode", mode)
        .gte("valid_until", today)
        .order("base_rate", { ascending: true });

      if (mode === "ocean") {
        query = query.eq("container_type", "40hc");
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

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-light">
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1200 800">
          <path d="M100,400 Q300,200 500,350 T900,300" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
          <path d="M50,500 Q250,350 450,450 T850,400" fill="none" stroke="hsl(var(--accent))" strokeWidth="1" />
          <path d="M200,300 Q400,150 600,280 T1000,250" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" />
          <circle cx="150" cy="400" r="3" fill="hsl(var(--accent))" opacity="0.4" />
          <circle cx="500" cy="350" r="3" fill="hsl(var(--accent))" opacity="0.4" />
          <circle cx="850" cy="300" r="3" fill="hsl(var(--accent))" opacity="0.4" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto px-6 pt-24 md:pt-36 pb-16 md:pb-24">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8"
          >
            <Globe className="h-4 w-4" />
            Shipment Coordination Workspace
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-foreground mb-6"
          >
            Coordinate freight, trucking,
            <br />
            <span className="text-gradient">and warehouses in one workspace.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed mb-10"
          >
            Search rates, book shipments, and track cargo — all from one platform.
          </motion.p>
        </div>

        {/* Embedded Rate Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-background rounded-2xl border shadow-lg p-5 md:p-6 max-w-4xl mx-auto"
        >
          {/* Mode tabs */}
          <div className="flex gap-1 mb-5 p-1 bg-secondary rounded-lg w-fit mx-auto">
            <button
              type="button"
              onClick={() => setMode("ocean")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                mode === "ocean"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ship className="h-4 w-4" />
              FCL Ocean
            </button>
            <button
              type="button"
              onClick={() => setMode("air")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                mode === "air"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plane className="h-4 w-4" />
              Air Freight
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full text-left">
              <label className="text-sm font-medium text-foreground mb-1 block">
                {mode === "ocean" ? "Origin Port" : "Origin Airport"}
              </label>
              <PortSelector
                ports={ports}
                value={origin}
                onValueChange={setOrigin}
                placeholder={mode === "ocean" ? "Select origin..." : "Select airport..."}
                mode={mode}
              />
            </div>
            <div className="flex-1 w-full text-left">
              <label className="text-sm font-medium text-foreground mb-1 block">
                {mode === "ocean" ? "Destination Port" : "Destination Airport"}
              </label>
              <PortSelector
                ports={ports}
                value={destination}
                onValueChange={setDestination}
                placeholder={mode === "ocean" ? "Select destination..." : "Select airport..."}
                mode={mode}
              />
            </div>
            <Button
              type="submit"
              variant="electric"
              size="lg"
              className="h-10 px-6 text-sm whitespace-nowrap w-full sm:w-auto"
              disabled={!origin || !destination || isLoading}
            >
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? "Searching..." : "Search Rates"}
            </Button>
          </form>
        </motion.div>

        {/* Inline Results */}
        <AnimatePresence>
          {searchDone && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto mt-8"
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 bg-background rounded-2xl border">
                  <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
                  <p className="text-sm text-muted-foreground">Searching carrier rates...</p>
                </div>
              ) : results ? (
                <div className="bg-background rounded-2xl border shadow-lg p-6">
                  <RateResultsPanel
                    rates={results}
                    origin={origin}
                    destination={destination}
                    containerSize="40hc"
                  />
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
