import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowRight, Ship, Plane } from "lucide-react";
import { PortSelector } from "@/components/shipment/PortSelector";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CONTAINER_SIZES = [
  { value: "20gp", label: "20' Standard" },
  { value: "40gp", label: "40' Standard" },
  { value: "40hc", label: "40' High Cube" },
  { value: "45hc", label: "45' High Cube" },
];

const CONTAINER_TYPES = [
  { value: "dry", label: "Standard / Dry" },
  { value: "reefer", label: "Reefer" },
  { value: "open_top", label: "Open Top" },
  { value: "flat_rack", label: "Flat Rack" },
  { value: "iso_tank", label: "ISO Tank" },
];

interface RateSearchFormProps {
  onSearch: (params: {
    origin: string;
    destination: string;
    containerSize: string;
    containerType: string;
    mode: "ocean" | "air";
  }) => void;
  isLoading?: boolean;
}

export function RateSearchForm({ onSearch, isLoading }: RateSearchFormProps) {
  const [mode, setMode] = useState<"ocean" | "air">("ocean");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [containerSize, setContainerSize] = useState("40hc");
  const [containerType, setContainerType] = useState("dry");

  const { data: ports = [] } = useQuery({
    queryKey: ["ports-rate-search"],
    queryFn: async () => {
      const { data } = await supabase.from("ports").select("code, name, country").order("name");
      return data || [];
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    onSearch({ origin, destination, containerSize, containerType, mode });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* Mode tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-secondary rounded-lg w-fit">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Origin */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">
            {mode === "ocean" ? "Origin Port" : "Origin Airport"}
          </label>
          <PortSelector
            ports={ports}
            value={origin}
            onValueChange={setOrigin}
            placeholder={mode === "ocean" ? "Select origin port..." : "Select origin airport..."}
            mode={mode}
          />
        </div>

        {/* Destination */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">
            {mode === "ocean" ? "Destination Port" : "Destination Airport"}
          </label>
          <PortSelector
            ports={ports}
            value={destination}
            onValueChange={setDestination}
            placeholder={mode === "ocean" ? "Select destination port..." : "Select destination airport..."}
            mode={mode}
          />
        </div>

        {/* Container Size */}
        {mode === "ocean" && (
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Container Size</label>
            <Select value={containerSize} onValueChange={setContainerSize}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Container Type */}
        {mode === "ocean" && (
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Container Type</label>
            <Select value={containerType} onValueChange={setContainerType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Button
        type="submit"
        variant="electric"
        size="lg"
        className="mt-6 px-8 h-12 text-base"
        disabled={!origin || !destination || isLoading}
      >
        <Search className="h-4 w-4 mr-2" />
        {isLoading ? "Searching..." : "Search Rates"}
        {!isLoading && <ArrowRight className="h-4 w-4 ml-2" />}
      </Button>
    </form>
  );
}
