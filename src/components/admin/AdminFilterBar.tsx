import { useState } from "react";
import { Search, Filter, CalendarIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface FilterConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface AdminFilterBarProps {
  searchPlaceholder?: string;
  search: string;
  onSearchChange: (value: string) => void;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  dateRange?: { from?: Date; to?: Date };
  onDateRangeChange?: (range: { from?: Date; to?: Date }) => void;
  showDateRange?: boolean;
  resultCount?: number;
  resultLabel?: string;
}

export function AdminFilterBar({
  searchPlaceholder = "Search…",
  search,
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  dateRange,
  onDateRangeChange,
  showDateRange = false,
  resultCount,
  resultLabel = "results",
}: AdminFilterBarProps) {
  const [datePickerField, setDatePickerField] = useState<"from" | "to" | null>(null);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    Object.values(filterValues).filter((v) => v && v !== "all").length +
    (dateRange?.from || dateRange?.to ? 1 : 0);

  const clearAll = () => {
    onSearchChange("");
    filters.forEach((f) => onFilterChange?.(f.key, "all"));
    onDateRangeChange?.({});
  };

  return (
    <div className="space-y-3 mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(220,10%,35%)]" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-[hsl(220,18%,10%)] border-[hsl(220,15%,16%)] text-white placeholder:text-[hsl(220,10%,35%)] focus-visible:ring-blue-500/50 h-10"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(220,10%,40%)] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-[hsl(220,10%,40%)] shrink-0" />

          {filters.map((f) => (
            <Select
              key={f.key}
              value={filterValues[f.key] || "all"}
              onValueChange={(val) => onFilterChange?.(f.key, val)}
            >
              <SelectTrigger className="w-[150px] bg-[hsl(220,18%,10%)] border-[hsl(220,15%,16%)] text-white h-9 text-xs">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,18%,12%)] border-[hsl(220,15%,16%)]">
                {f.options.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-white focus:bg-[hsl(220,15%,18%)] focus:text-white text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {/* Date Range */}
          {showDateRange && (
            <div className="flex items-center gap-1.5">
              <Popover
                open={datePickerField === "from"}
                onOpenChange={(open) => setDatePickerField(open ? "from" : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 px-3 text-xs bg-[hsl(220,18%,10%)] border-[hsl(220,15%,16%)] text-white hover:bg-[hsl(220,15%,15%)] hover:text-white",
                      !dateRange?.from && "text-[hsl(220,10%,40%)]"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {dateRange?.from ? format(dateRange.from, "MMM d") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-[hsl(220,18%,12%)] border-[hsl(220,15%,16%)]"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={dateRange?.from}
                    onSelect={(d) => {
                      onDateRangeChange?.({ ...dateRange, from: d || undefined });
                      setDatePickerField(null);
                    }}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <span className="text-[hsl(220,10%,30%)] text-xs">→</span>

              <Popover
                open={datePickerField === "to"}
                onOpenChange={(open) => setDatePickerField(open ? "to" : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 px-3 text-xs bg-[hsl(220,18%,10%)] border-[hsl(220,15%,16%)] text-white hover:bg-[hsl(220,15%,15%)] hover:text-white",
                      !dateRange?.to && "text-[hsl(220,10%,40%)]"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {dateRange?.to ? format(dateRange.to, "MMM d") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-[hsl(220,18%,12%)] border-[hsl(220,15%,16%)]"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={dateRange?.to}
                    onSelect={(d) => {
                      onDateRangeChange?.({ ...dateRange, to: d || undefined });
                      setDatePickerField(null);
                    }}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      {/* Active filters & count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {resultCount !== undefined && (
            <p className="text-xs text-[hsl(220,10%,40%)]">
              {resultCount} {resultLabel}
            </p>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        {/* Active filter badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.map((f) => {
            const val = filterValues[f.key];
            if (!val || val === "all") return null;
            const opt = f.options.find((o) => o.value === val);
            return (
              <Badge
                key={f.key}
                variant="outline"
                className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20"
                onClick={() => onFilterChange?.(f.key, "all")}
              >
                {f.label}: {opt?.label || val}
                <X className="h-2.5 w-2.5 ml-1" />
              </Badge>
            );
          })}
          {dateRange?.from && (
            <Badge
              variant="outline"
              className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20 cursor-pointer hover:bg-indigo-500/20"
              onClick={() => onDateRangeChange?.({})}
            >
              {format(dateRange.from, "MMM d")}
              {dateRange.to ? ` — ${format(dateRange.to, "MMM d")}` : "+"}
              <X className="h-2.5 w-2.5 ml-1" />
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
