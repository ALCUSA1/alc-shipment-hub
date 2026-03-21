import { Badge } from "@/components/ui/badge";
import { Calendar, Ship, Clock } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SailingScheduleSelectorProps {
  avgTransitDays: number | null;
  onWeekSelect?: (weekStart: Date) => void;
}

function generateWeeks(count: number): Date[] {
  const today = new Date();
  const weeks: Date[] = [];
  for (let i = 0; i < count; i++) {
    weeks.push(startOfWeek(addDays(today, i * 7), { weekStartsOn: 1 }));
  }
  return weeks;
}

export function SailingScheduleSelector({ avgTransitDays, onWeekSelect }: SailingScheduleSelectorProps) {
  const weeks = generateWeeks(4);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    onWeekSelect?.(weeks[idx]);
  };

  const selectedWeekStart = weeks[selectedIdx];
  const selectedWeekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const arrivalStart = avgTransitDays ? addDays(selectedWeekStart, avgTransitDays) : null;
  const arrivalEnd = avgTransitDays ? addDays(selectedWeekEnd, avgTransitDays) : null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-accent" />
        <h4 className="text-sm font-semibold text-foreground">Select Sailing Week</h4>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {weeks.map((week, idx) => {
          const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
          const isSelected = idx === selectedIdx;
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all text-sm",
                isSelected
                  ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                  : "border-border hover:border-accent/40 hover:bg-muted/50"
              )}
            >
              <p className={cn("font-medium", isSelected ? "text-accent" : "text-foreground")}>
                Week {idx + 1}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(week, "MMM d")} – {format(weekEnd, "MMM d")}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Ship className="h-3.5 w-3.5 text-accent" />
          Sail by: <span className="font-medium text-foreground">{format(selectedWeekEnd, "MMM d, yyyy")}</span>
        </span>
        {avgTransitDays && arrivalStart && arrivalEnd && (
          <>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Transit: <span className="font-medium text-foreground">{avgTransitDays} days</span>
            </span>
            <span>
              Arrival week: <span className="font-medium text-foreground">{format(arrivalStart, "MMM d")} – {format(arrivalEnd, "MMM d")}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
