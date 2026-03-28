import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FileText, Ship, Receipt, Check, Circle, Clock, AlertTriangle,
  Shield, Package, CreditCard,
} from "lucide-react";

interface DocStatus {
  key: string;
  label: string;
  shortLabel: string;
  icon: any;
  status: "completed" | "in_progress" | "pending" | "blocked" | "not_required";
  date?: string;
}

interface Props {
  documents: Array<{ doc_type: string; status: string; created_at: string; file_url?: string | null }>;
  payments: Array<{ status: string; created_at: string }>;
  customsFilings?: Array<{ status: string; itn?: string | null }>;
  lifecycleStage?: string;
}

const DOC_STAGE_ORDER = [
  { key: "shipper_letter_of_instruction", label: "Shipping Instruction", shortLabel: "SI", icon: FileText },
  { key: "bill_of_lading", label: "House Bill of Lading", shortLabel: "HBL", icon: Ship },
  { key: "master_bl", label: "Master Bill of Lading", shortLabel: "MBL", icon: Ship },
  { key: "commercial_invoice", label: "Invoice Generated", shortLabel: "Invoice", icon: Receipt },
  { key: "aes_filing", label: "AES / Export Clearance", shortLabel: "AES", icon: Shield },
  { key: "customer_payment", label: "Customer Payment", shortLabel: "Payment", icon: CreditCard },
  { key: "seaway_bill", label: "Seaway Bill Released", shortLabel: "SWB", icon: Package },
];

export function DocumentLifecycleBar({ documents, payments, customsFilings, lifecycleStage }: Props) {
  const stages = useMemo<DocStatus[]>(() => {
    const docMap = new Map<string, { status: string; created_at: string }>();
    (documents || []).forEach(d => {
      const existing = docMap.get(d.doc_type);
      if (!existing || d.status === "completed") docMap.set(d.doc_type, d);
    });

    const customerPaid = (payments || []).some(p => p.status === "completed" || p.status === "succeeded");
    const hasAesFiling = (customsFilings || []).length > 0;
    const aesApproved = (customsFilings || []).some(f => f.status === "accepted" || f.status === "itn_received");

    return DOC_STAGE_ORDER.map(stage => {
      if (stage.key === "customer_payment") {
        return {
          ...stage,
          status: customerPaid ? "completed" as const : "pending" as const,
          date: customerPaid ? (payments || []).find(p => p.status === "completed" || p.status === "succeeded")?.created_at : undefined,
        };
      }
      if (stage.key === "aes_filing") {
        if (!hasAesFiling) return { ...stage, status: "not_required" as const };
        return { ...stage, status: aesApproved ? "completed" as const : "in_progress" as const };
      }
      if (stage.key === "seaway_bill") {
        const doc = docMap.get("seaway_bill");
        if (doc?.status === "completed") return { ...stage, status: "completed" as const, date: doc.created_at };
        if (!customerPaid) return { ...stage, status: "blocked" as const };
        return { ...stage, status: "pending" as const };
      }

      const doc = docMap.get(stage.key);
      if (!doc) return { ...stage, status: "pending" as const };
      return {
        ...stage,
        status: doc.status === "completed" ? "completed" as const : "in_progress" as const,
        date: doc.created_at,
      };
    });
  }, [documents, payments, customsFilings]);

  const completedCount = stages.filter(s => s.status === "completed").length;
  const totalRelevant = stages.filter(s => s.status !== "not_required").length;
  const progressPct = totalRelevant > 0 ? Math.round((completedCount / totalRelevant) * 100) : 0;

  const statusStyles = {
    completed: "bg-emerald-500 text-white",
    in_progress: "bg-accent/20 text-accent ring-2 ring-accent/40 animate-pulse",
    pending: "bg-secondary border-2 border-border text-muted-foreground",
    blocked: "bg-destructive/15 text-destructive border border-destructive/30",
    not_required: "bg-muted/50 text-muted-foreground/40",
  };

  const lineStyles = {
    completed: "bg-emerald-500",
    in_progress: "bg-accent/40",
    pending: "bg-border",
    blocked: "bg-destructive/20",
    not_required: "bg-border/50",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            Document Lifecycle
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] font-semibold">
            {completedCount}/{totalRelevant} complete • {progressPct}%
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-secondary mt-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-accent transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-1">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const isLast = i === stages.length - 1;
            return (
              <div key={stage.key} className="flex items-start flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center text-center flex-1 cursor-default">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5 transition-all ${statusStyles[stage.status]}`}>
                        {stage.status === "completed" ? (
                          <Check className="h-4 w-4 stroke-[3]" />
                        ) : stage.status === "blocked" ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : stage.status === "in_progress" ? (
                          <Clock className="h-3.5 w-3.5" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <p className={`text-[9px] font-medium leading-tight max-w-[56px] ${
                        stage.status === "completed" ? "text-foreground" :
                        stage.status === "blocked" ? "text-destructive/70" :
                        stage.status === "not_required" ? "text-muted-foreground/40" :
                        "text-muted-foreground"
                      }`}>
                        {stage.shortLabel}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[180px]">
                    <p className="font-semibold">{stage.label}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {stage.status === "completed" ? "✓ Completed" :
                       stage.status === "in_progress" ? "⏳ In Progress" :
                       stage.status === "blocked" ? "⚠ Blocked — payment required" :
                       stage.status === "not_required" ? "N/A" :
                       "Pending"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                {!isLast && (
                  <div className={`flex-1 h-0.5 mt-4 mx-0.5 rounded-full ${lineStyles[stage.status]}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Blocked alert */}
        {stages.some(s => s.status === "blocked") && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
            <p className="text-xs text-destructive">Seaway Bill release is blocked until customer payment is received.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
