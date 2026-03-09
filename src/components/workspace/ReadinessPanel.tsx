import { DocReadiness } from "@/lib/shipment-dataset";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ReadinessPanelProps {
  items: DocReadiness[];
}

export function ReadinessPanel({ items }: ReadinessPanelProps) {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const overall = items.length > 0
    ? Math.round(items.reduce((s, i) => s + i.percent, 0) / items.length)
    : 0;

  return (
    <aside className="sticky top-6 space-y-4 w-full">
      {/* Overall score — hero card */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold",
            overall >= 80 ? "bg-accent/10 text-accent" : overall >= 40 ? "bg-secondary text-foreground" : "bg-secondary text-muted-foreground"
          )}>
            {overall}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Document Readiness</p>
            <p className="text-[11px] text-muted-foreground">
              {overall >= 80 ? "Nearly complete" : overall >= 40 ? "Good progress" : "Getting started"}
            </p>
          </div>
        </div>
        <Progress value={overall} className="h-1.5" />
      </div>

      {/* Per-document — compact expandable */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {items.map((item, idx) => {
          const isExpanded = expandedDoc === item.label;
          const isComplete = item.percent === 100;
          return (
            <div key={item.label} className={cn(idx > 0 && "border-t border-border/50")}>
              <button
                onClick={() => setExpandedDoc(isExpanded ? null : item.label)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-secondary/30 transition-colors"
              >
                {isComplete ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                )}
                <span className="text-xs font-medium text-foreground flex-1 text-left">{item.label}</span>
                <span className={cn(
                  "text-[11px] font-semibold tabular-nums",
                  isComplete ? "text-accent" : "text-muted-foreground"
                )}>
                  {item.percent}%
                </span>
                {item.missing.length > 0 && (
                  <ChevronDown className={cn("h-3 w-3 text-muted-foreground/50 transition-transform", isExpanded && "rotate-180")} />
                )}
              </button>
              <AnimatePresence>
                {isExpanded && item.missing.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-0.5">
                      <p className="text-[10px] text-muted-foreground mb-1.5">Missing fields:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.missing.map((m) => (
                          <span key={m} className="text-[9px] bg-secondary text-muted-foreground rounded-md px-1.5 py-0.5">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
