import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle, Info, CheckCircle2, Shield, Clock, TrendingUp,
  CloudRain, Anchor, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Alert {
  type: "warning" | "info" | "success";
  title: string;
  message: string;
  category: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

interface Intelligence {
  alerts: Alert[];
  recommendations: Recommendation[];
  routeInsight: string;
  detentionRisk: string;
  detentionNote?: string;
  complianceChecklist: string[];
  estimatedTotalCost?: {
    freight: number;
    surcharges?: number;
    trucking_estimate?: number;
    documentation?: number;
    total_estimate: number;
    note: string;
  };
}

interface Props {
  origin: string;
  destination: string;
  mode: "ocean" | "air";
  carrier?: string;
  commodity?: string;
  containerType?: string;
  className?: string;
}

const alertIcon: Record<string, React.ElementType> = {
  route_risk: AlertTriangle,
  rate_change: TrendingUp,
  detention: Clock,
  compliance: Shield,
  schedule: Anchor,
  weather: CloudRain,
};

const alertColors: Record<string, string> = {
  warning: "border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-300",
  info: "border-accent/30 bg-accent/5 text-accent",
  success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
};

const priorityColor: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  low: "bg-muted text-muted-foreground border-border",
};

export function BookingIntelligenceBanner({ origin, destination, mode, carrier, commodity, containerType, className }: Props) {
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin || !destination) return;

    const fetchIntelligence = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("booking-intelligence", {
          body: { origin, destination, mode, carrier, commodity, containerType },
        });
        if (fnError) throw fnError;
        setIntelligence(data as Intelligence);
      } catch (err: any) {
        console.error("Intelligence fetch error:", err);
        setError("Intelligence unavailable");
      } finally {
        setLoading(false);
      }
    };

    fetchIntelligence();
  }, [origin, destination, mode, carrier]);

  if (loading) {
    return (
      <Card className={`border-accent/20 ${className}`}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground">Analyzing route intelligence...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !intelligence) return null;

  const criticalAlerts = intelligence.alerts.filter(a => a.type === "warning");
  const infoAlerts = intelligence.alerts.filter(a => a.type !== "warning");
  const hasAlerts = intelligence.alerts.length > 0;

  return (
    <Card className={`border-accent/20 overflow-hidden ${className}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            AI Route Intelligence
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {criticalAlerts.length} Alert{criticalAlerts.length > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Less" : "More"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Route insight - always visible */}
        <p className="text-xs text-muted-foreground leading-relaxed">{intelligence.routeInsight}</p>

        {/* Critical alerts - always visible */}
        {criticalAlerts.map((alert, i) => {
          const Icon = alertIcon[alert.category] || AlertTriangle;
          return (
            <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${alertColors[alert.type]}`}>
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold">{alert.title}</p>
                <p className="text-[11px] opacity-80">{alert.message}</p>
              </div>
            </div>
          );
        })}

        {/* Detention risk indicator */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Detention Risk:</span>
          <Badge variant="outline" className={
            intelligence.detentionRisk === "high" ? "border-destructive/40 text-destructive" :
            intelligence.detentionRisk === "medium" ? "border-yellow-500/40 text-yellow-700" :
            "border-emerald-500/40 text-emerald-700"
          }>
            {intelligence.detentionRisk?.toUpperCase() || "UNKNOWN"}
          </Badge>
          {intelligence.detentionNote && (
            <span className="text-muted-foreground">{intelligence.detentionNote}</span>
          )}
        </div>

        {/* Expandable section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 overflow-hidden"
            >
              {/* Info alerts */}
              {infoAlerts.map((alert, i) => {
                const Icon = alertIcon[alert.category] || Info;
                return (
                  <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${alertColors[alert.type]}`}>
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">{alert.title}</p>
                      <p className="text-[11px] opacity-80">{alert.message}</p>
                    </div>
                  </div>
                );
              })}

              {/* Recommendations */}
              {intelligence.recommendations.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recommendations</p>
                  <div className="space-y-1.5">
                    {intelligence.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 mt-0.5 ${priorityColor[rec.priority]}`}>
                          {rec.priority}
                        </Badge>
                        <div>
                          <span className="font-medium">{rec.title}:</span>{" "}
                          <span className="text-muted-foreground">{rec.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance checklist */}
              {intelligence.complianceChecklist.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Compliance Requirements</p>
                  <div className="space-y-1">
                    {intelligence.complianceChecklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost estimate */}
              {intelligence.estimatedTotalCost && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estimated Total Cost</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Freight</span><p className="font-medium">${intelligence.estimatedTotalCost.freight?.toLocaleString() || 0}</p></div>
                    <div><span className="text-muted-foreground">Surcharges</span><p className="font-medium">${intelligence.estimatedTotalCost.surcharges?.toLocaleString() || 0}</p></div>
                    <div><span className="text-muted-foreground">Trucking Est.</span><p className="font-medium">${intelligence.estimatedTotalCost.trucking_estimate?.toLocaleString() || 0}</p></div>
                    <div><span className="text-muted-foreground">Documentation</span><p className="font-medium">${intelligence.estimatedTotalCost.documentation?.toLocaleString() || 0}</p></div>
                    <div><span className="text-muted-foreground">Total</span><p className="font-bold text-accent">${intelligence.estimatedTotalCost.total_estimate?.toLocaleString() || 0}</p></div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{intelligence.estimatedTotalCost.note}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
