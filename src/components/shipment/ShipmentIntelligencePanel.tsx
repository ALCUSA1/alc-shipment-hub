import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, AlertTriangle, Clock, TrendingUp, Shield, Anchor,
  ChevronDown, ChevronUp, CheckCircle2, Lightbulb, Target,
  CloudRain, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  shipment: any;
  documents?: any[];
  customsFilings?: any[];
  className?: string;
}

interface IntelAlert {
  type: "warning" | "info" | "success";
  title: string;
  message: string;
  category: string;
}

interface IntelRecommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

interface Intelligence {
  alerts: IntelAlert[];
  recommendations: IntelRecommendation[];
  routeInsight: string;
  detentionRisk: string;
  detentionNote?: string;
  complianceChecklist: string[];
  nextActions: string[];
}

const categoryIcons: Record<string, React.ElementType> = {
  route_risk: AlertTriangle,
  rate_change: TrendingUp,
  detention: Clock,
  compliance: Shield,
  schedule: Anchor,
  weather: CloudRain,
};

const alertStyles: Record<string, string> = {
  warning: "border-yellow-500/30 bg-yellow-500/5",
  info: "border-accent/20 bg-accent/5",
  success: "border-emerald-500/30 bg-emerald-500/5",
};

export function ShipmentIntelligencePanel({ shipment, documents, customsFilings, className }: Props) {
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!shipment?.origin_port || !shipment?.destination_port) return;
    // Don't fetch for closed/delivered/cancelled
    if (["closed", "cancelled"].includes(shipment.lifecycle_stage || shipment.status)) return;

    const fetchIntel = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("booking-intelligence", {
          body: {
            origin: shipment.origin_port,
            destination: shipment.destination_port,
            mode: shipment.mode || "ocean",
            carrier: shipment.carrier,
            commodity: shipment.commodity,
            shipmentId: shipment.id,
          },
        });
        if (error) throw error;

        // Enhance with shipment-specific next actions
        const intel = data as Intelligence;
        intel.nextActions = generateNextActions(shipment, documents, customsFilings);
        setIntelligence(intel);
      } catch (err) {
        console.error("Workspace intelligence error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchIntel();
  }, [shipment?.id, shipment?.lifecycle_stage]);

  if (loading) {
    return (
      <Card className={`border-accent/20 ${className}`}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground">Loading shipment intelligence...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!intelligence) return null;

  const warningCount = intelligence.alerts.filter(a => a.type === "warning").length;

  return (
    <Card className={`border-accent/20 overflow-hidden ${className}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Shipment Intelligence
            {warningCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {warningCount} Alert{warningCount > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Next Actions */}
              {intelligence.nextActions && intelligence.nextActions.length > 0 && (
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <p className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Suggested Next Actions
                  </p>
                  <div className="space-y-1.5">
                    {intelligence.nextActions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <ArrowRight className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alerts */}
              {intelligence.alerts.slice(0, 3).map((alert, i) => {
                const Icon = categoryIcons[alert.category] || AlertTriangle;
                return (
                  <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${alertStyles[alert.type]}`}>
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                );
              })}

              {/* Route insight */}
              <p className="text-xs text-muted-foreground leading-relaxed">{intelligence.routeInsight}</p>

              {/* Detention + Compliance row */}
              <div className="flex items-center gap-4 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Detention:</span>
                  <Badge variant="outline" className={
                    intelligence.detentionRisk === "high" ? "border-destructive/40 text-destructive" :
                    intelligence.detentionRisk === "medium" ? "border-yellow-500/40 text-yellow-700" :
                    "border-emerald-500/40 text-emerald-700"
                  }>
                    {intelligence.detentionRisk?.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Compliance:</span>
                  <span className="font-medium">{intelligence.complianceChecklist.length} items</span>
                </div>
              </div>

              {/* Recommendations */}
              {intelligence.recommendations.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Recommendations
                  </p>
                  {intelligence.recommendations.slice(0, 2).map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/30">
                      <CheckCircle2 className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{rec.title}:</span>{" "}
                        <span className="text-muted-foreground">{rec.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function generateNextActions(shipment: any, documents?: any[], customsFilings?: any[]): string[] {
  const actions: string[] = [];
  const stage = shipment?.lifecycle_stage || shipment?.status;

  if (stage === "booked") {
    // Check documents
    const pendingDocs = (documents || []).filter(d => d.status === "pending");
    if (pendingDocs.length > 0) {
      actions.push(`Upload ${pendingDocs.length} pending document${pendingDocs.length > 1 ? "s" : ""} (${pendingDocs.map((d: any) => d.doc_type?.replace(/_/g, " ")).join(", ")})`);
    }
    // Check customs
    const hasFiling = (customsFilings || []).some(f => ["submitted", "approved", "filed"].includes(f.status));
    if (!hasFiling) {
      actions.push("Complete AES/EEI filing before cargo cutoff");
    }
    // Check ETD proximity
    if (shipment.etd) {
      const daysToETD = Math.ceil((new Date(shipment.etd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToETD <= 7 && daysToETD > 0) {
        actions.push(`ETD in ${daysToETD} day${daysToETD > 1 ? "s" : ""} — confirm all cargo ready`);
      }
    }
    actions.push("Confirm trucking pickup schedule with provider");
  } else if (stage === "in_transit") {
    actions.push("Monitor tracking events for delays");
    actions.push("Prepare destination documentation for clearance");
    if (shipment.eta) {
      const daysToETA = Math.ceil((new Date(shipment.eta).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToETA <= 5 && daysToETA > 0) {
        actions.push(`Arriving in ${daysToETA} days — arrange delivery trucking`);
      }
    }
  } else if (stage === "delivered") {
    actions.push("Review final charges and close out shipment");
    actions.push("Confirm all documents received");
  } else if (stage === "quote_ready") {
    actions.push("Review and confirm booking to lock in rate");
  }

  return actions;
}
