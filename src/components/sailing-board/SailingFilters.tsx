import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Zap, DollarSign, CalendarClock, LayoutList, ArrowUpDown } from "lucide-react";
import type { SortKey, FilterKey } from "./types";

const FILTERS: { key: FilterKey; label: string; icon: any }[] = [
  { key: "all", label: "All", icon: LayoutList },
  { key: "recommended", label: "Recommended", icon: Sparkles },
  { key: "fastest", label: "Fastest", icon: Zap },
  { key: "cheapest", label: "Cheapest", icon: DollarSign },
  { key: "earliest", label: "Earliest", icon: CalendarClock },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "AI Score" },
  { key: "price", label: "Price" },
  { key: "transit", label: "Transit Time" },
  { key: "departure", label: "Departure Date" },
];

interface SailingFiltersProps {
  filter: FilterKey;
  sort: SortKey;
  onFilterChange: (f: FilterKey) => void;
  onSortChange: (s: SortKey) => void;
  count: number;
}

export function SailingFilters({ filter, sort, onFilterChange, onSortChange, count }: SailingFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => {
          const Icon = f.icon;
          const active = filter === f.key;
          return (
            <Button
              key={f.key}
              variant={active ? "default" : "outline"}
              size="sm"
              className={`h-8 text-xs gap-1 ${active ? "bg-accent text-accent-foreground" : ""}`}
              onClick={() => onFilterChange(f.key)}
            >
              <Icon className="h-3 w-3" />
              {f.label}
            </Button>
          );
        })}
      </div>

      {/* Sort + count */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{count} option{count !== 1 ? "s" : ""}</span>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map(s => (
              <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
