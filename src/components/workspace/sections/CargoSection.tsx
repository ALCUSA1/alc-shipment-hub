import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, X, ChevronDown, Package } from "lucide-react";
import type { CargoLine, ContainerLine } from "@/lib/shipment-dataset";
import { emptyCargoLine, emptyContainerLine } from "@/lib/shipment-dataset";
import { ContainerCard } from "./cargo/ContainerCard";
import { CargoLineCard } from "./cargo/CargoLineCard";

const CONTAINER_TYPES = [
  { value: "20gp", label: "20' GP" }, { value: "40gp", label: "40' GP" },
  { value: "40hc", label: "40' HC" }, { value: "45hc", label: "45' HC" },
  { value: "20rf", label: "20' Reefer" }, { value: "40rf", label: "40' Reefer" },
  { value: "20ot", label: "20' Open Top" }, { value: "40ot", label: "40' Open Top" },
  { value: "20fr", label: "20' Flat Rack" }, { value: "40fr", label: "40' Flat Rack" },
];

export const PACKAGE_TYPES = ["Carton", "Pallet", "Crate", "Drum", "Bag", "Bundle", "Roll", "Bale"];

export const RATE_CLASSES = [
  { value: "M", label: "M — Minimum" },
  { value: "N", label: "N — Normal" },
  { value: "Q45", label: "Q — 45 kg+" },
  { value: "Q100", label: "Q — 100 kg+" },
  { value: "Q250", label: "Q — 250 kg+" },
  { value: "Q500", label: "Q — 500 kg+" },
  { value: "Q1000", label: "Q — 1000 kg+" },
  { value: "C", label: "C — Specific Commodity" },
  { value: "U", label: "U — ULD" },
];

interface Props {
  cargoLines: CargoLine[];
  containers: ContainerLine[];
  onCargoChange: (lines: CargoLine[]) => void;
  onContainerChange: (lines: ContainerLine[]) => void;
  mode?: string;
}

export function CargoSection({ cargoLines, containers, onCargoChange, onContainerChange, mode = "ocean" }: Props) {
  const isAir = mode === "air";

  const updateCargo = (idx: number, f: keyof CargoLine, v: any) => {
    const next = [...cargoLines];
    (next[idx] as any)[f] = v;

    // Auto-calculate chargeable weight for air
    if (isAir && (f === "grossWeight" || f === "volume" || f === "dimensions")) {
      const line = next[idx];
      const gross = parseFloat(line.grossWeight) || 0;
      let volumetric = 0;
      if (line.dimensions) {
        const parts = line.dimensions.toLowerCase().split(/[x×*]/).map(s => parseFloat(s.trim()));
        if (parts.length === 3 && parts.every(p => !isNaN(p))) {
          const pieces = parseInt(line.pieces) || 1;
          volumetric = (parts[0] * parts[1] * parts[2] * pieces) / 6000;
        }
      } else if (line.volume) {
        volumetric = (parseFloat(line.volume) || 0) * 166.67;
      }
      line.chargeableWeight = Math.max(gross, volumetric).toFixed(1);
    }

    onCargoChange(next);
  };

  const updateContainer = (idx: number, f: keyof ContainerLine, v: string) => {
    const next = [...containers];
    (next[idx] as any)[f] = v;
    onContainerChange(next);
  };

  // Get cargo lines assigned to a specific container
  const getContainerCargo = (containerId: string) =>
    cargoLines.filter(c => c.containerId === containerId);

  return (
    <section id="cargo" className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-foreground tracking-tight">
          {isAir ? "Cargo & Pieces" : "Cargo & Containers"}
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isAir
            ? "Cargo details for Air Waybill, packing list, and customs filing."
            : "Packing List, Invoice, Certificate of Origin, and B/L data."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Containers (Ocean only) */}
        {!isAir && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Equipment</span>
              <Button variant="ghost" size="sm" className="text-[11px] h-7 text-accent" onClick={() => onContainerChange([...containers, emptyContainerLine()])}>
                <Plus className="h-3 w-3 mr-1" /> Container
              </Button>
            </div>
            {containers.map((c, i) => (
              <ContainerCard
                key={c.id}
                container={c}
                index={i}
                canDelete={containers.length > 1}
                containerTypes={CONTAINER_TYPES}
                assignedCargo={getContainerCargo(c.id)}
                onUpdate={(f, v) => updateContainer(i, f, v)}
                onDelete={() => onContainerChange(containers.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        )}

        {/* Cargo Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Cargo Details</span>
            <Button variant="ghost" size="sm" className="text-[11px] h-7 text-accent" onClick={() => onCargoChange([...cargoLines, emptyCargoLine()])}>
              <Plus className="h-3 w-3 mr-1" /> Cargo Line
            </Button>
          </div>
          {cargoLines.map((c, i) => (
            <CargoLineCard
              key={c.id}
              cargo={c}
              index={i}
              isAir={isAir}
              canDelete={cargoLines.length > 1}
              containers={containers}
              onUpdate={(f, v) => updateCargo(i, f, v)}
              onDelete={() => onCargoChange(cargoLines.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
