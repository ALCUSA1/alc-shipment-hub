import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, AlertTriangle, CheckCircle2, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ShipmentReport {
  summary: string;
  risks: string[];
  next_actions: string[];
  health: "green" | "yellow" | "red";
}

interface Props {
  shipmentContext: Record<string, any>;
  shipmentId: string;
}

const healthConfig = {
  green: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: "On Track",
    labelClass: "text-emerald-600",
  },
  yellow: {
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    label: "Needs Attention",
    labelClass: "text-amber-600",
  },
  red: {
    bg: "bg-red-500/10 border-red-500/20",
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
    label: "Critical",
    labelClass: "text-red-600",
  },
};

export function AiShipmentSummary({ shipmentContext, shipmentId }: Props) {
  const { data: report, isLoading, refetch, isRefetching } = useQuery<ShipmentReport>({
    queryKey: ["ai-shipment-summary", shipmentId, shipmentContext.status],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("shipment-summary", {
        body: { shipment_context: shipmentContext },
      });
      if (error) throw error;
      return data as ShipmentReport;
    },
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1,
  });

  if (isLoading) {
    return (
      <Card className="border-accent/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">AI analyzing shipment…</p>
              <p className="text-xs text-muted-foreground">Generating intelligence report</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  const config = healthConfig[report.health] || healthConfig.yellow;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className={`border ${config.bg}`}>
        <CardContent className="py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              <span className="text-xs font-semibold text-foreground">AI Intelligence</span>
              <div className="flex items-center gap-1.5">
                {config.icon}
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.labelClass}`}>
                  {config.label}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-3 w-3 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Summary */}
          <p className="text-xs text-foreground leading-relaxed mb-3">{report.summary}</p>

          {/* Risks & Actions in compact layout */}
          <div className="grid grid-cols-2 gap-3">
            {report.risks.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Risks</p>
                <ul className="space-y-1">
                  {report.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.next_actions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Next Actions</p>
                <ul className="space-y-1">
                  {report.next_actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground">
                      <ArrowRight className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
