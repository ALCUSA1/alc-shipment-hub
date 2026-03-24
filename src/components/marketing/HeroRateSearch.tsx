import { Button } from "@/components/ui/button";
import { Search, Ship, Plane } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { PortSelector } from "@/components/shipment/PortSelector";
import { RateResultsPanel } from "@/components/rate-search/RateResultsPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function HeroRateSearch() {
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
      if (mode === "ocean") query = query.eq("container_type", "40hc");
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-background rounded-2xl border shadow-lg p-5 md:p-6 max-w-4xl mx-auto"
      >
        <div className="flex gap-1 mb-5 p-1 bg-secondary rounded-lg w-fit mx-auto">
          <button type="button" onClick={() => setMode("ocean")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === "ocean" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Ship className="h-4 w-4" /> FCL Ocean
          </button>
          <button type="button" onClick={() => setMode("air")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === "air" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Plane className="h-4 w-4" /> Air Freight
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full text-left">
            <label className="text-sm font-medium text-foreground mb-1 block">{mode === "ocean" ? "Origin Port" : "Origin Airport"}</label>
            <PortSelector ports={ports} value={origin} onValueChange={setOrigin} placeholder={mode === "ocean" ? "Select origin..." : "Select airport..."} mode={mode} />
          </div>
          <div className="flex-1 w-full text-left">
            <label className="text-sm font-medium text-foreground mb-1 block">{mode === "ocean" ? "Destination Port" : "Destination Airport"}</label>
            <PortSelector ports={ports} value={destination} onValueChange={setDestination} placeholder={mode === "ocean" ? "Select destination..." : "Select airport..."} mode={mode} />
          </div>
          <Button type="submit" variant="electric" size="lg" className="h-10 px-6 text-sm whitespace-nowrap w-full sm:w-auto" disabled={!origin || !destination || isLoading}>
            <Search className="h-4 w-4 mr-2" /> {isLoading ? "Searching..." : "Search Rates"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Rates are automatically converted into cost and sell price using your margin rules.
        </p>
      </motion.div>

      <AnimatePresence>
        {searchDone && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="max-w-4xl mx-auto mt-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-background rounded-2xl border">
                <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Searching carrier rates...</p>
              </div>
            ) : results ? (
              <div className="bg-background rounded-2xl border shadow-lg p-6">
                <RateResultsPanel rates={results} origin={origin} destination={destination} containerSize="40hc" />
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
