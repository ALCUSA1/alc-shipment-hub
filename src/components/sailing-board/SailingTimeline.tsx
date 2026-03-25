import { useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ScoredSailing } from "./types";

const LABEL_COLORS: Record<string, string> = {
  Recommended: "bg-accent",
  "Best Price": "bg-emerald-500",
  Fastest: "bg-amber-500",
  "Best Value": "bg-sky-500",
  "Reliable Option": "bg-violet-500",
};

interface SailingTimelineProps {
  sailings: ScoredSailing[];
  onSelect: (s: ScoredSailing) => void;
}

export function SailingTimeline({ sailings, onSelect }: SailingTimelineProps) {
  const { startDate, totalDays } = useMemo(() => {
    const etds = sailings.map(s => new Date(s.etd || Date.now()).getTime());
    const etas = sailings.map(s => new Date(s.eta || Date.now()).getTime());
    const earliest = new Date(Math.min(...etds));
    const latest = new Date(Math.max(...etas));
    earliest.setDate(earliest.getDate() - 1);
    const total = differenceInDays(latest, earliest) + 2;
    return { startDate: earliest, totalDays: Math.max(total, 14) };
  }, [sailings]);

  if (sailings.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 overflow-x-auto">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sailing Timeline</p>
      <div className="relative min-w-[600px]" style={{ height: sailings.length * 40 + 28 }}>
        {/* Date axis */}
        <div className="flex justify-between text-[10px] text-muted-foreground mb-2 px-1">
          {Array.from({ length: Math.min(8, totalDays) }, (_, i) => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + Math.round((i / 7) * totalDays));
            return <span key={i}>{format(d, "MMM d")}</span>;
          })}
        </div>

        {/* Bars */}
        {sailings.map((s, idx) => {
          const etd = new Date(s.etd || Date.now());
          const eta = new Date(s.eta || Date.now());
          const left = (differenceInDays(etd, startDate) / totalDays) * 100;
          const width = Math.max((differenceInDays(eta, etd) / totalDays) * 100, 4);
          const barColor = LABEL_COLORS[s.ai_label || ""] || "bg-muted-foreground/30";

          return (
            <TooltipProvider key={s.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelect(s)}
                    className="absolute h-7 rounded-md flex items-center px-2 gap-1 text-[10px] font-medium text-white transition-all hover:brightness-110 hover:shadow-md cursor-pointer"
                    style={{ left: `${Math.max(left, 0)}%`, width: `${Math.min(width, 100 - left)}%`, top: idx * 40 + 24 }}
                  >
                    <span className={`absolute inset-0 rounded-md ${barColor} opacity-90`} />
                    <span className="relative truncate">{s.carrier}</span>
                    <span className="relative ml-auto whitespace-nowrap">{s.transit_days}d</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-semibold">{s.carrier}</p>
                  <p>{format(etd, "MMM d")} → {format(eta, "MMM d")} · {s.transit_days}d</p>
                  <p className="text-accent font-bold">${s.total_rate.toLocaleString()}</p>
                  {s.ai_label && <p className="text-accent">{s.ai_label}</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
