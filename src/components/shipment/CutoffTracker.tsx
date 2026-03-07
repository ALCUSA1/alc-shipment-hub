import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, AlertTriangle, CheckCircle2 } from "lucide-react";
import { differenceInHours, differenceInDays, format, isPast } from "date-fns";

interface CutoffDates {
  cy_cutoff: string | null;
  si_cutoff: string | null;
  vgm_cutoff: string | null;
  doc_cutoff: string | null;
}

interface CutoffItem {
  label: string;
  key: keyof CutoffDates;
  description: string;
}

const CUTOFFS: CutoffItem[] = [
  { label: "CY Cutoff", key: "cy_cutoff", description: "Container yard closing" },
  { label: "SI Cutoff", key: "si_cutoff", description: "Shipping instructions deadline" },
  { label: "VGM Cutoff", key: "vgm_cutoff", description: "Verified gross mass submission" },
  { label: "Doc Cutoff", key: "doc_cutoff", description: "Documentation deadline" },
];

function getTimeStatus(dateStr: string | null): { text: string; severity: "ok" | "warning" | "critical" | "passed" | "unset" } {
  if (!dateStr) return { text: "Not set", severity: "unset" };
  const date = new Date(dateStr);
  const now = new Date();
  if (isPast(date)) return { text: "Passed", severity: "passed" };
  const hoursLeft = differenceInHours(date, now);
  const daysLeft = differenceInDays(date, now);
  if (hoursLeft <= 24) return { text: `${hoursLeft}h remaining`, severity: "critical" };
  if (hoursLeft <= 48) return { text: `${hoursLeft}h remaining`, severity: "warning" };
  return { text: `${daysLeft}d remaining`, severity: "ok" };
}

export function CutoffTracker({ cutoffs }: { cutoffs: CutoffDates }) {
  const hasCutoffs = Object.values(cutoffs).some((v) => v !== null);

  if (!hasCutoffs) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4 text-accent" />
          Cutoff Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {CUTOFFS.map((cutoff) => {
            const dateStr = cutoffs[cutoff.key];
            const status = getTimeStatus(dateStr);
            if (status.severity === "unset") return null;

            const severityStyles = {
              ok: "bg-green-50 border-green-200 text-green-700",
              warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
              critical: "bg-destructive/5 border-destructive/20 text-destructive",
              passed: "bg-secondary border-border text-muted-foreground",
              unset: "",
            };

            const Icon = status.severity === "passed" ? CheckCircle2
              : status.severity === "critical" || status.severity === "warning" ? AlertTriangle
              : Timer;

            return (
              <div key={cutoff.key} className={`flex items-center justify-between rounded-lg border p-3 ${severityStyles[status.severity]}`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">{cutoff.label}</p>
                    <p className="text-[10px] opacity-70">{cutoff.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{status.text}</p>
                  {dateStr && (
                    <p className="text-[10px] opacity-70">
                      {format(new Date(dateStr), "MMM d, HH:mm")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
