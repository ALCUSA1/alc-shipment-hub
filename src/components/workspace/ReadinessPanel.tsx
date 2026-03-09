import { DocReadiness } from "@/lib/shipment-dataset";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadinessPanelProps {
  items: DocReadiness[];
}

export function ReadinessPanel({ items }: ReadinessPanelProps) {
  const overall = items.length > 0
    ? Math.round(items.reduce((s, i) => s + i.percent, 0) / items.length)
    : 0;

  return (
    <aside className="sticky top-4 space-y-5 w-full">
      {/* Overall */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Readiness</h3>
          <span className="text-2xl font-bold text-accent">{overall}%</span>
        </div>
        <Progress value={overall} className="h-2" />
        <p className="text-[10px] text-muted-foreground">
          Overall document readiness based on data entered
        </p>
      </div>

      {/* Per-document */}
      <div className="rounded-xl border bg-card divide-y divide-border">
        {items.map((item) => (
          <div key={item.label} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.percent === 100 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <AlertCircle className={cn("h-3.5 w-3.5", item.percent >= 60 ? "text-destructive" : "text-muted-foreground")} />
                )}
                <span className="text-xs font-medium text-foreground">{item.label}</span>
              </div>
              <span className={cn(
                "text-xs font-semibold",
                item.percent === 100 ? "text-accent" : item.percent >= 60 ? "text-destructive" : "text-muted-foreground"
              )}>
                {item.percent}%
              </span>
            </div>
            {item.missing.length > 0 && item.missing.length <= 4 && (
              <div className="flex flex-wrap gap-1">
                {item.missing.map((m) => (
                  <span key={m} className="text-[9px] bg-secondary text-muted-foreground rounded px-1.5 py-0.5">
                    {m}
                  </span>
                ))}
              </div>
            )}
            {item.missing.length > 4 && (
              <p className="text-[9px] text-muted-foreground">
                {item.missing.length} fields remaining
              </p>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
