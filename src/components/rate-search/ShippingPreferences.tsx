import { useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ShippingFilters {
  routing: "all" | "direct" | "transshipment";
  carrierType: "all" | "major" | "nvocc";
  rateType: "all" | "spot" | "contract";
}

interface ShippingPreferencesProps {
  filters: ShippingFilters;
  onChange: (filters: ShippingFilters) => void;
}

function ToggleGroup({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
              value === opt.value
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background text-muted-foreground border-border hover:border-accent/40"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ShippingPreferences({ filters, onChange }: ShippingPreferencesProps) {
  const [open, setOpen] = useState(false);

  const activeCount = [filters.routing, filters.carrierType, filters.rateType].filter((v) => v !== "all").length;

  return (
    <div className="rounded-xl border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-4 text-sm"
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          Shipping Preferences
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-1">
              {activeCount} active
            </Badge>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-wrap gap-6">
          <ToggleGroup
            label="Routing"
            options={[
              { value: "all", label: "All" },
              { value: "direct", label: "Direct" },
              { value: "transshipment", label: "Transshipment" },
            ]}
            value={filters.routing}
            onValueChange={(v) => onChange({ ...filters, routing: v as ShippingFilters["routing"] })}
          />
          <ToggleGroup
            label="Carrier Type"
            options={[
              { value: "all", label: "All" },
              { value: "major", label: "Major Lines" },
              { value: "nvocc", label: "NVOCC" },
            ]}
            value={filters.carrierType}
            onValueChange={(v) => onChange({ ...filters, carrierType: v as ShippingFilters["carrierType"] })}
          />
          <ToggleGroup
            label="Rate Type"
            options={[
              { value: "all", label: "All" },
              { value: "spot", label: "Spot" },
              { value: "contract", label: "Contract" },
            ]}
            value={filters.rateType}
            onValueChange={(v) => onChange({ ...filters, rateType: v as ShippingFilters["rateType"] })}
          />
        </div>
      )}
    </div>
  );
}
