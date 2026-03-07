import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CreditCard, Loader2, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface QuoteRow {
  id: string;
  shipment_id: string;
  amount: number | null;
  currency: string | null;
  status: string;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  shipments?: { shipment_ref: string; origin_port: string | null; destination_port: string | null } | null;
}

const statusStyle: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-destructive/10 text-destructive",
  expired: "bg-secondary text-muted-foreground",
};

const Quotes = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchQuotes = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("quotes")
        .select("*, shipments(shipment_ref, origin_port, destination_port)")
        .order("created_at", { ascending: false });
      setQuotes((data as unknown as QuoteRow[]) ?? []);
      setLoading(false);
    };
    fetchQuotes();
  }, [user]);

  const handlePay = async (quote: QuoteRow) => {
    if (!quote.amount || quote.amount <= 0) {
      toast({ title: "No amount set", description: "This quote doesn't have an amount to pay.", variant: "destructive" });
      return;
    }
    setPayingId(quote.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          quote_id: quote.id,
          shipment_id: quote.shipment_id,
          amount: quote.amount,
          currency: quote.currency || "USD",
          shipment_ref: quote.shipments?.shipment_ref || "",
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Payment error", description: err.message || "Failed to create payment session", variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
        <p className="text-sm text-muted-foreground">Manage freight quote requests and payments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Freight Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No quotes yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Quotes are created when you submit a new shipment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground p-4">Shipment</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Route</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Amount</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Created</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-secondary/50">
                      <td className="p-4 font-mono font-medium text-foreground">
                        {q.shipments?.shipment_ref || "—"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {q.shipments?.origin_port && q.shipments?.destination_port
                          ? `${q.shipments.origin_port} → ${q.shipments.destination_port}`
                          : "—"}
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        {q.amount ? `${q.currency || "USD"} ${q.amount.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-4">
                        <Badge className={statusStyle[q.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                          {q.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(q.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="p-4">
                        {q.status === "pending" && q.amount && q.amount > 0 ? (
                          <Button
                            variant="electric"
                            size="sm"
                            onClick={() => handlePay(q)}
                            disabled={payingId === q.id}
                          >
                            {payingId === q.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                                Pay Now
                              </>
                            )}
                          </Button>
                        ) : q.status === "accepted" ? (
                          <span className="text-xs text-green-600 font-medium">Paid</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Quotes;
