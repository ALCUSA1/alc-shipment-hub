import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Receipt, CreditCard, Ship, Check, Clock, Lock,
  Circle, ChevronDown, AlertTriangle, Anchor,
} from "lucide-react";

interface Props {
  shipmentId: string;
}

interface Stage {
  key: string;
  label: string;
  icon: React.ElementType;
  status: "completed" | "active" | "locked" | "pending";
  timestamp?: string;
  notes?: string;
}

export function DocumentLifecycleTimeline({ shipmentId }: Props) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const { data: documents } = useQuery({
    queryKey: ["doc-lifecycle-docs", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("doc_type, status, created_at, updated_at")
        .eq("shipment_id", shipmentId);
      return data || [];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["doc-lifecycle-payments", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("status, amount, currency, created_at, payment_method")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: shipment } = useQuery({
    queryKey: ["doc-lifecycle-shipment", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipments")
        .select("status, lifecycle_stage, etd, eta")
        .eq("id", shipmentId)
        .single();
      return data;
    },
  });

  const docMap = new Map((documents || []).map(d => [d.doc_type, d]));
  const customerPaid = (payments || []).some(p => p.status === "completed" || p.status === "succeeded");
  const isDelivered = shipment?.status === "delivered" || shipment?.status === "completed" || shipment?.status === "closed";

  const hasSI = !!docMap.get("shipping_instructions");
  const hasHBL = !!docMap.get("house_bill_of_lading");
  const hasMBL = !!docMap.get("master_bill_of_lading");
  const hasInvoice = !!docMap.get("commercial_invoice");
  const hasSWB = !!docMap.get("seaway_bill");

  const stages: Stage[] = [
    {
      key: "si_created",
      label: "SI Created",
      icon: FileText,
      status: hasSI ? "completed" : "pending",
      timestamp: docMap.get("shipping_instructions")?.created_at,
      notes: hasSI ? "Shipping Instructions submitted" : "Awaiting Shipping Instructions",
    },
    {
      key: "hbl_issued",
      label: "HBL Issued",
      icon: FileText,
      status: hasHBL ? "completed" : hasSI ? "active" : "pending",
      timestamp: docMap.get("house_bill_of_lading")?.created_at,
      notes: hasHBL ? "House Bill of Lading issued" : "Pending issuance",
    },
    {
      key: "mbl_issued",
      label: "MBL Issued",
      icon: Anchor,
      status: hasMBL ? "completed" : hasHBL ? "active" : "pending",
      timestamp: docMap.get("master_bill_of_lading")?.created_at,
      notes: hasMBL ? "Master Bill of Lading issued by carrier" : "Awaiting carrier issuance",
    },
    {
      key: "invoice_generated",
      label: "Invoice Generated",
      icon: Receipt,
      status: hasInvoice ? "completed" : hasMBL ? "active" : "pending",
      timestamp: docMap.get("commercial_invoice")?.created_at,
      notes: hasInvoice ? "Commercial invoice generated" : "Invoice pending",
    },
    {
      key: "customer_payment",
      label: "Customer Payment",
      icon: CreditCard,
      status: customerPaid ? "completed" : hasInvoice ? "active" : "pending",
      timestamp: customerPaid ? (payments || [])[0]?.created_at : undefined,
      notes: customerPaid ? `Payment received via ${(payments || [])[0]?.payment_method?.replace(/_/g, " ") || "transfer"}` : "Awaiting customer payment",
    },
    {
      key: "carrier_payment",
      label: "Carrier Payment",
      icon: CreditCard,
      status: customerPaid ? "completed" : "locked",
      notes: customerPaid ? "Carrier payment processed" : "Locked until customer payment received",
    },
    {
      key: "swb_released",
      label: "SWB Released",
      icon: Ship,
      status: hasSWB ? "completed" : customerPaid ? "active" : "locked",
      timestamp: docMap.get("seaway_bill")?.created_at,
      notes: hasSWB ? "Seaway Bill released" : customerPaid ? "Ready for release" : "Blocked — carrier payment pending",
    },
    {
      key: "delivered",
      label: "Delivered",
      icon: Check,
      status: isDelivered ? "completed" : "pending",
      notes: isDelivered ? "Shipment delivered successfully" : "Awaiting delivery",
    },
  ];

  const completedCount = stages.filter(s => s.status === "completed").length;
  const progress = (completedCount / stages.length) * 100;

  const statusIcon = (status: Stage["status"]) => {
    switch (status) {
      case "completed": return <Check className="h-3.5 w-3.5 stroke-[3]" />;
      case "active": return <Clock className="h-3.5 w-3.5 animate-pulse" />;
      case "locked": return <Lock className="h-3.5 w-3.5" />;
      default: return <Circle className="h-3 w-3" />;
    }
  };

  const statusStyles = (status: Stage["status"]) => {
    switch (status) {
      case "completed": return "bg-emerald-500 text-white";
      case "active": return "bg-accent text-accent-foreground ring-4 ring-accent/20";
      case "locked": return "bg-destructive/15 text-destructive border border-destructive/30";
      default: return "bg-secondary border-2 border-border text-muted-foreground";
    }
  };

  const lineColor = (idx: number) => {
    if (stages[idx]?.status === "completed") return "bg-emerald-500";
    return "bg-border";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4 text-accent" />
            Document & Payment Lifecycle
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {completedCount}/{stages.length} Complete
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Timeline */}
        <div className="relative">
          {/* Horizontal connector line (desktop) */}
          <div className="hidden lg:block absolute top-5 left-8 right-8 h-0.5 bg-border" />
          <div
            className="hidden lg:block absolute top-5 left-8 h-0.5 bg-emerald-500 transition-all duration-700"
            style={{ width: `${Math.max(0, ((completedCount - 1) / (stages.length - 1)) * 100)}%`, maxWidth: "calc(100% - 4rem)" }}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {stages.map((stage, i) => (
              <Collapsible
                key={stage.key}
                open={expandedStage === stage.key}
                onOpenChange={(open) => setExpandedStage(open ? stage.key : null)}
              >
                <CollapsibleTrigger className="w-full text-left group">
                  <div className="flex flex-col items-center text-center relative cursor-pointer">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 mb-2 transition-all ${statusStyles(stage.status)} group-hover:scale-110`}>
                      {statusIcon(stage.status)}
                    </div>
                    <p className={`text-[11px] font-medium leading-tight mb-0.5 ${stage.status === "completed" ? "text-foreground" : stage.status === "locked" ? "text-destructive/70" : "text-muted-foreground"}`}>
                      {stage.label}
                    </p>
                    {stage.timestamp && (
                      <p className="text-[9px] text-muted-foreground">
                        {format(new Date(stage.timestamp), "MMM d")}
                      </p>
                    )}
                    <ChevronDown className={`h-3 w-3 text-muted-foreground mt-1 transition-transform ${expandedStage === stage.key ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-3 rounded-lg border border-border bg-secondary/50 text-left"
                    >
                      <p className="text-xs text-foreground font-medium mb-1">{stage.label}</p>
                      <p className="text-[11px] text-muted-foreground">{stage.notes}</p>
                      {stage.timestamp && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {format(new Date(stage.timestamp), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      )}
                      {stage.status === "locked" && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Blocked by prerequisite
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
