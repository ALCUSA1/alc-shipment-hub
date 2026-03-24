import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Ship, Plane, Package, ArrowRight, Sparkles } from "lucide-react";
import { PortSelector } from "@/components/shipment/PortSelector";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SearchParams } from "@/pages/BookingFlow";

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
];

interface BookingSearchStepProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
  defaultOrigin?: string;
  defaultDestination?: string;
}

export function BookingSearchStep({ onSearch, isLoading, defaultOrigin, defaultDestination }: BookingSearchStepProps) {
  const [mode, setMode] = useState<"ocean" | "air">("ocean");
  const [origin, setOrigin] = useState(defaultOrigin || "");
  const [destination, setDestination] = useState(defaultDestination || "");
  const [containerSize, setContainerSize] = useState("40hc");
  const [containerType, setContainerType] = useState("dry");
  const [commodity, setCommodity] = useState("");
  const [weight, setWeight] = useState("");
  const [containers, setContainers] = useState("1");

  const { data: ports = [] } = useQuery({
    queryKey: ["ports-booking-flow"],
    queryFn: async () => {
      const { data } = await supabase.from("ports").select("code, name, country").order("name");
      return data || [];
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) return;
    onSearch({ origin, destination, mode, containerSize, containerType, commodity, weight, containers: Number(containers) });
  };

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" />
          AI-Powered Booking
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Search, price & book in minutes
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Find the best sailing options with real-time carrier rates and AI recommendations.
        </p>
      </div>

      <Card className="border-2 border-accent/10">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode tabs */}
            <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setMode("ocean")}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-md transition-all ${
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
                className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-md transition-all ${
                  mode === "air"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Plane className="h-4 w-4" />
                Air Freight
              </button>
            </div>

            {/* Route */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1 block">
                  {mode === "ocean" ? "Origin Port" : "Origin Airport"}
                </Label>
                <PortSelector ports={ports} value={origin} onValueChange={setOrigin} placeholder="Select origin..." mode={mode} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">
                  {mode === "ocean" ? "Destination Port" : "Destination Airport"}
                </Label>
                <PortSelector ports={ports} value={destination} onValueChange={setDestination} placeholder="Select destination..." mode={mode} />
              </div>
            </div>

            {/* Container & Cargo */}
            {mode === "ocean" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1 block">Container Size</Label>
                  <Select value={containerSize} onValueChange={setContainerSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTAINER_SIZES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Container Type</Label>
                  <Select value={containerType} onValueChange={setContainerType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTAINER_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Qty</Label>
                  <Select value={containers} onValueChange={setContainers}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} container{n>1?"s":""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Weight (kg)</Label>
                  <Input type="number" placeholder="e.g. 18000" value={weight} onChange={e => setWeight(e.target.value)} />
                </div>
              </div>
            )}

            {/* Commodity */}
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-1 block">
                  <Package className="inline h-3.5 w-3.5 mr-1" />
                  Commodity
                </Label>
                <Input placeholder="e.g. Electronics, Furniture, Auto Parts" value={commodity} onChange={e => setCommodity(e.target.value)} />
              </div>
              <Button
                type="submit"
                variant="electric"
                size="lg"
                className="h-10 px-8"
                disabled={!origin || !destination || isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-accent-foreground border-t-transparent animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Searching..." : "Search Options"}
                {!isLoading && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
