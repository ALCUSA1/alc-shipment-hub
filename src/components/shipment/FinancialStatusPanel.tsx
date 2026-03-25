import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Receipt, CreditCard, Ship, AlertTriangle, Check, Clock,
  ArrowRight, Lock, DollarSign,
} from "lucide-react";

interface Props {
  shipmentId: string;
}

function StatusChip({ status, label }: { status: "paid" | "pending" | "overdue" | "blocked"; label: string }) {
  const styles = {
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    overdue: "bg-destructive/10 text-destructive",
    blocked: "bg-destructive/15 text-destructive",
  };
  return <Badge variant="secondary" className={`text-[10px] ${styles[status]}`}>{label}</Badge>;
}

export function FinancialStatusPanel({ shipmentId }: Props) {
  const { data: invoices } = useQuery({
    queryKey: ["fin-status-invoices", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("doc_type, status, created_at")
        .eq("shipment_id", shipmentId)
        .in("doc_type", ["commercial_invoice", "seaway_bill"]);
      return data || [];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["fin-status-payments", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("status, amount, currency, created_at")
        .eq("shipment_id", shipmentId);
      return data || [];
    },
  });

  const { data: charges } = useQuery({
    queryKey: ["fin-status-charges", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipment_charges")
        .select("charge_type, amount, payment_status")
        .eq("shipment_id", shipmentId);
      return data || [];
    },
  });

  const hasInvoice = (invoices || []).some(d => d.doc_type === "commercial_invoice");
  const hasSWB = (invoices || []).some(d => d.doc_type === "seaway_bill");
  const customerPaid = (payments || []).some(p => p.status === "completed" || p.status === "succeeded");
  const totalPaid = (payments || [])
    .filter(p => p.status === "completed" || p.status === "succeeded")
    .reduce((s, p) => s + (p.amount || 0), 0);
  const totalCharges = (charges || []).reduce((s, c) => s + (c.amount || 0), 0);
  const outstanding = Math.max(0, totalCharges - totalPaid);
  const carrierPaid = customerPaid; // simplified: carrier paid when customer paid
  const swbBlocked = !carrierPaid && !hasSWB;

  const statusItems = [
    {
      label: "Invoice",
      icon: Receipt,
      status: hasInvoice ? "paid" as const : "pending" as const,
      statusLabel: hasInvoice ? "Generated" : "Pending",
    },
    {
      label: "Customer Payment",
      icon: CreditCard,
      status: customerPaid ? "paid" as const : outstanding > 0 ? "overdue" as const : "pending" as const,
      statusLabel: customerPaid ? "Received" : outstanding > 0 ? "Outstanding" : "Pending",
      amount: customerPaid ? totalPaid : outstanding,
    },
    {
      label: "Carrier Payment",
      icon: DollarSign,
      status: carrierPaid ? "paid" as const : "pending" as const,
      statusLabel: carrierPaid ? "Settled" : "Pending",
    },
    {
      label: "SWB Release",
      icon: Ship,
      status: hasSWB ? "paid" as const : swbBlocked ? "blocked" as const : "pending" as const,
      statusLabel: hasSWB ? "Released" : swbBlocked ? "Blocked" : "Pending",
    },
  ];

  // Payment flow steps
  const flowSteps = [
    { label: "Customer\nPayment", done: customerPaid, icon: CreditCard },
    { label: "Platform", done: customerPaid, icon: DollarSign },
    { label: "Carrier\nPayment", done: carrierPaid, icon: CreditCard },
    { label: "SWB\nRelease", done: hasSWB, blocked: swbBlocked, icon: Ship },
  ];

  return (
    <div className="space-y-4">
      {/* Financial Status Cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" />
            Financial Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statusItems.map(item => (
              <div key={item.label} className="rounded-xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    item.status === "paid" ? "bg-emerald-500/10" :
                    item.status === "blocked" || item.status === "overdue" ? "bg-destructive/10" :
                    "bg-amber-500/10"
                  }`}>
                    <item.icon className={`h-4 w-4 ${
                      item.status === "paid" ? "text-emerald-500" :
                      item.status === "blocked" || item.status === "overdue" ? "text-destructive" :
                      "text-amber-500"
                    }`} />
                  </div>
                  <StatusChip status={item.status} label={item.statusLabel} />
                </div>
                <p className="text-xs font-semibold text-foreground">{item.label}</p>
                {item.amount !== undefined && item.amount > 0 && (
                  <p className={`text-sm font-bold tabular-nums mt-0.5 ${item.status === "paid" ? "text-emerald-600" : "text-destructive"}`}>
                    ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* SWB Blocked Alert */}
          {swbBlocked && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">SWB Release Blocked</p>
                <p className="text-xs text-muted-foreground">Seaway Bill cannot be released until carrier payment is settled.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Flow Visual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-accent" />
            Payment Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-1">
            {flowSteps.map((step, i) => (
              <div key={step.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center text-center flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all ${
                    step.done ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                    step.blocked ? "bg-destructive/15 text-destructive border border-destructive/30" :
                    "bg-secondary border-2 border-border text-muted-foreground"
                  }`}>
                    {step.done ? <Check className="h-5 w-5 stroke-[3]" /> :
                     step.blocked ? <Lock className="h-4 w-4" /> :
                     <step.icon className="h-5 w-5" />}
                  </div>
                  <p className={`text-[10px] font-medium leading-tight whitespace-pre-line ${
                    step.done ? "text-foreground" : step.blocked ? "text-destructive/70" : "text-muted-foreground"
                  }`}>{step.label}</p>
                </div>
                {i < flowSteps.length - 1 && (
                  <ArrowRight className={`h-4 w-4 shrink-0 mx-1 ${
                    step.done ? "text-emerald-500" : "text-border"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
