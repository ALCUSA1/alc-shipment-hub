import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Wallet, CreditCard, Building2, ArrowRight, DollarSign,
  CheckCircle2, Clock, Copy, Info, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  shipmentId?: string;
  onPayShipment?: (shipmentId: string) => void;
}

export function CustomerFundingPanel({ shipmentId, onPayShipment }: Props) {
  const { user } = useAuth();

  // Fetch all customer payments to calculate balance
  const { data: allPayments = [] } = useQuery({
    queryKey: ["customer-all-payments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, amount, currency, status, payment_method, created_at, shipment_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch total charges across all shipments
  const { data: allCharges = [] } = useQuery({
    queryKey: ["customer-all-charges", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shipment_charges")
        .select("amount, shipment_id, payment_status")
        .eq("who_pays", "shipper");
      return data || [];
    },
    enabled: !!user,
  });

  const totalFunded = allPayments
    .filter(p => p.status === "completed" || p.status === "succeeded")
    .reduce((s, p) => s + (p.amount || 0), 0);

  const totalCharged = allCharges.reduce((s, c) => s + (c.amount || 0), 0);
  const pendingFunds = allPayments
    .filter(p => p.status === "pending" || p.status === "processing")
    .reduce((s, p) => s + (p.amount || 0), 0);

  const availableBalance = Math.max(0, totalFunded - totalCharged);

  // Current shipment charges if viewing a specific shipment
  const shipmentCharges = shipmentId
    ? allCharges.filter(c => c.shipment_id === shipmentId).reduce((s, c) => s + (c.amount || 0), 0)
    : 0;

  const shipmentPaid = shipmentId
    ? allPayments.filter(p => p.shipment_id === shipmentId && (p.status === "completed" || p.status === "succeeded")).reduce((s, p) => s + (p.amount || 0), 0)
    : 0;

  const shipmentOutstanding = Math.max(0, shipmentCharges - shipmentPaid);
  const canPayFromBalance = availableBalance >= shipmentOutstanding && shipmentOutstanding > 0;

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-4">
      {/* Balance Overview */}
      <Card className="border-accent/20 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-accent to-emerald-500" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" />
            Account Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-accent/5 border border-accent/20 p-4 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Available</p>
              <p className="text-2xl font-bold text-accent tabular-nums mt-1">{fmt(availableBalance)}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 border border-border p-4 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{fmt(pendingFunds)}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 border border-border p-4 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Funded</p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-1">{fmt(totalFunded)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipment Payment - if viewing specific shipment */}
      {shipmentId && shipmentOutstanding > 0 && (
        <Card className="border-orange-200 dark:border-orange-800/40">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Payment Due</p>
                  <p className="text-xs text-muted-foreground">
                    {canPayFromBalance ? "Sufficient balance available" : "Fund your account to pay"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold tabular-nums text-orange-600">{fmt(shipmentOutstanding)}</p>
                {canPayFromBalance && onPayShipment && (
                  <Button variant="electric" size="sm" className="mt-2" onClick={() => onPayShipment(shipmentId)}>
                    Pay from Balance
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funding Methods */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-accent" />
            Add Funds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Credit Card */}
          <div className="rounded-xl border border-border p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Credit / Debit Card</p>
                  <p className="text-xs text-muted-foreground">Instant — processed via secure payment gateway</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Pay Now <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Wire Transfer */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Wire Transfer / ACH</p>
                <p className="text-xs text-muted-foreground">1–3 business days processing</p>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/50 border border-border p-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bank Instructions</p>
              {[
                { label: "Bank Name", value: "First National Bank" },
                { label: "Account Name", value: "ALC Logistics LLC" },
                { label: "Routing Number", value: "021000021" },
                { label: "Account Number", value: "****7890" },
                { label: "SWIFT Code", value: "FNBOUS33" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-xs font-mono font-medium text-foreground">{item.value}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.value)}
                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
              <Separator />
              <div className="flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground">
                  Include your company name and account email as payment reference. Funds will be credited within 1–3 business days after receipt.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {allPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {allPayments.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                      p.status === "completed" || p.status === "succeeded" ? "bg-emerald-500/10" :
                      p.status === "pending" ? "bg-amber-500/10" : "bg-muted"
                    }`}>
                      {p.status === "completed" || p.status === "succeeded"
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        : <Clock className="h-3.5 w-3.5 text-amber-500" />
                      }
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{fmt(p.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(p.created_at), "MMM d, yyyy")}
                        {p.payment_method && ` • ${p.payment_method.replace(/_/g, " ")}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${
                    p.status === "completed" || p.status === "succeeded" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                    p.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
