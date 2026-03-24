import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Receipt, Download, Printer, CreditCard, CheckCircle2,
  AlertTriangle, Clock, FileText, DollarSign,
} from "lucide-react";

interface Props {
  shipmentId: string;
  shipmentRef: string;
  customerName?: string;
}

const CUSTOMER_CHARGE_LABELS: Record<string, string> = {
  freight: "Ocean / Air Freight",
  amendment_fee: "Amendment Fee",
  demurrage: "Demurrage",
  detention: "Detention",
  per_diem: "Per Diem",
  terminal: "Terminal Handling",
  documentation: "Documentation Fee",
  customs: "Customs Clearance",
  inspection: "Inspection Fee",
  late_fee: "Late Fee",
  storage: "Storage",
  trucking: "Trucking",
  insurance: "Insurance",
  other: "Other Charges",
};

export function CustomerFinancialsTab({ shipmentId, shipmentRef, customerName }: Props) {
  const [showInvoice, setShowInvoice] = useState(false);

  // Fetch charges (customer-safe — no buy rates or margins)
  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ["customer-charges", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_charges")
        .select("id, charge_type, description, amount, currency, payment_status, created_at")
        .eq("shipment_id", shipmentId)
        .eq("who_pays", "shipper")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch quotes for total amount and payment terms
  const { data: quotes = [] } = useQuery({
    queryKey: ["customer-quote-amount", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, amount, status, payment_status, currency, created_at")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ["customer-payments", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, currency, status, payment_method, created_at")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const totalCharges = charges.reduce((sum, c) => sum + (c.amount || 0), 0);
  const quoteAmount = quotes.length > 0 ? (quotes[0].amount || 0) : 0;
  const totalAmount = quoteAmount > 0 ? quoteAmount : totalCharges;
  const currency = charges[0]?.currency || quotes[0]?.currency || "USD";

  const paidAmount = payments
    .filter(p => p.status === "completed" || p.status === "succeeded")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const outstanding = Math.max(0, totalAmount - paidAmount);

  const isPaid = outstanding <= 0 && totalAmount > 0;
  const isOverdue = !isPaid && totalAmount > 0; // simplified
  const latestPayment = payments.find(p => p.status === "completed" || p.status === "succeeded");

  const handlePrint = () => {
    setShowInvoice(true);
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="space-y-6">
      {/* Payment Status Banner */}
      <Card className={`${isPaid ? "border-emerald-200 dark:border-emerald-800/40" : outstanding > 0 ? "border-orange-200 dark:border-orange-800/40" : "border-border"}`}>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isPaid ? "bg-emerald-500/10" : "bg-orange-500/10"}`}>
                {isPaid ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Clock className="h-5 w-5 text-orange-500" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Payment Status</h3>
                  <Badge variant="secondary" className={`text-[10px] ${isPaid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"}`}>
                    {isPaid ? "Paid" : totalAmount === 0 ? "Pending" : "Unpaid"}
                  </Badge>
                </div>
                {latestPayment && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last payment: {format(new Date(latestPayment.created_at), "MMM d, yyyy")}
                    {latestPayment.payment_method && ` • ${latestPayment.payment_method.replace(/_/g, " ")}`}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className={`text-lg font-bold tabular-nums ${outstanding > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                ${outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })} {currency}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charges Breakdown — Invoice Style */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-accent" />
              Charges & Invoice
            </CardTitle>
            <CardDescription>Detailed breakdown for {shipmentRef}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />Print
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="h-3.5 w-3.5 mr-1.5" />Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Invoice Header */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Invoice For</p>
                <p className="text-sm font-semibold text-foreground">{customerName || "Customer"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Reference</p>
                <p className="text-sm font-mono font-semibold text-foreground">{shipmentRef}</p>
              </div>
            </div>
          </div>

          {/* Charges Table */}
          {chargesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : charges.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Charge</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((charge, i) => (
                    <tr key={charge.id} className={`border-t ${i % 2 === 0 ? "" : "bg-secondary/20"}`}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {CUSTOMER_CHARGE_LABELS[charge.charge_type] || charge.charge_type}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {charge.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                        ${(charge.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="secondary" className={`text-[10px] ${
                          charge.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" :
                          charge.payment_status === "processing" ? "bg-blue-100 text-blue-700" :
                          "bg-orange-100 text-orange-700"
                        }`}>
                          {charge.payment_status || "unpaid"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Row */}
              <div className="border-t-2 border-foreground/20 bg-secondary/40 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Total Shipment Cost</span>
                <span className="text-lg font-bold tabular-nums text-foreground">
                  ${totalCharges.toLocaleString("en-US", { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>
            </div>
          ) : quoteAmount > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Charge</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 font-medium text-foreground">Shipment Total (as quoted)</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      ${quoteAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="border-t-2 border-foreground/20 bg-secondary/40 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-bold tabular-nums text-foreground">
                  ${quoteAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No charges have been applied yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-accent" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      p.status === "completed" || p.status === "succeeded" ? "bg-emerald-500/10" : "bg-muted"
                    }`}>
                      <DollarSign className={`h-4 w-4 ${
                        p.status === "completed" || p.status === "succeeded" ? "text-emerald-500" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        ${(p.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} {p.currency}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(p.created_at), "MMM d, yyyy 'at' h:mm a")}
                        {p.payment_method && ` • ${p.payment_method.replace(/_/g, " ")}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${
                    p.status === "completed" || p.status === "succeeded" ? "bg-emerald-100 text-emerald-700" :
                    p.status === "failed" ? "bg-destructive/10 text-destructive" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            Financial Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <button
              onClick={handlePrint}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/60 transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Invoice — {shipmentRef}</p>
                <p className="text-[10px] text-muted-foreground">Charges breakdown and payment summary</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
