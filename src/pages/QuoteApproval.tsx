import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, Ship, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface QuoteData {
  id: string;
  customer_price: number;
  currency: string | null;
  origin_port: string | null;
  destination_port: string | null;
  container_type: string | null;
  carrier: string | null;
  transit_days: number | null;
  valid_until: string | null;
  status: string;
  customer_name: string | null;
  notes: string | null;
  approved_at: string | null;
}

const QuoteApproval = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError("Invalid approval link."); setLoading(false); return; }
    const fetchQuote = async () => {
      const { data, error: err } = await supabase
        .from("quotes")
        .select("id, customer_price, currency, origin_port, destination_port, container_type, carrier, transit_days, valid_until, status, customer_name, notes, approved_at")
        .eq("approval_token", token)
        .single();

      if (err || !data) { setError("Quote not found or link has expired."); }
      else { setQuote(data as QuoteData); }
      setLoading(false);
    };
    fetchQuote();
  }, [token]);

  const handleAction = async (action: "accepted" | "declined") => {
    if (!quote) return;
    setActing(true);
    const updateData: any = { status: action };
    if (action === "accepted") updateData.approved_at = new Date().toISOString();

    const { error: err } = await supabase
      .from("quotes")
      .update(updateData)
      .eq("id", quote.id);

    if (err) {
      setError("Failed to update quote. Please try again.");
    } else {
      // Notify the forwarder when customer approves
      if (action === "accepted") {
        try {
          const { data: quoteData } = await supabase
            .from("quotes")
            .select("user_id, origin_port, destination_port")
            .eq("id", quote.id)
            .single();

          if (quoteData?.user_id) {
            await supabase.from("notifications").insert({
              user_id: quoteData.user_id,
              title: "Quote Approved by Customer",
              message: `Your customer approved the quote for ${quoteData.origin_port || ""} → ${quoteData.destination_port || ""}. Book now to secure vessel space.`,
              type: "quote_approved",
            });
          }
        } catch {
          // Non-critical — don't block the approval
        }
      }
      setQuote({ ...quote, status: action, approved_at: action === "accepted" ? new Date().toISOString() : null });
    }
    setActing(false);
  };

  const isExpired = quote?.valid_until && new Date(quote.valid_until) < new Date();
  const canAct = quote?.status === "pending" && !isExpired;

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-secondary/50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 text-center">
            <X className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Quote Not Found</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <Ship className="h-6 w-6 text-accent" />
          </div>
          <CardTitle className="text-xl">Freight Quote</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {quote.customer_name ? `Prepared for ${quote.customer_name}` : "Review your freight quote"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Route</p>
                <p className="font-medium text-foreground">{quote.origin_port} → {quote.destination_port}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Container</p>
                <p className="font-medium text-foreground">{quote.container_type?.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Carrier</p>
                <p className="font-medium text-foreground">{quote.carrier}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transit Time</p>
                <p className="font-medium text-foreground">{quote.transit_days || "—"} days</p>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">All-in Rate</span>
              <span className="text-2xl font-bold text-foreground">
                ${quote.customer_price?.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{quote.currency}</span>
              </span>
            </div>
          </div>

          {quote.valid_until && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {isExpired
                  ? `This quote expired on ${format(new Date(quote.valid_until), "MMM d, yyyy")}`
                  : `Valid until ${format(new Date(quote.valid_until), "MMM d, yyyy")}`}
              </span>
            </div>
          )}

          {quote.status === "accepted" && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
              <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-800">Quote Approved</p>
              <p className="text-xs text-green-600 mt-1">
                Approved on {quote.approved_at ? format(new Date(quote.approved_at), "MMM d, yyyy 'at' h:mm a") : "—"}
              </p>
            </div>
          )}

          {quote.status === "declined" && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 text-center">
              <X className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm font-semibold text-destructive">Quote Declined</p>
            </div>
          )}

          {canAct && (
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => handleAction("declined")} disabled={acting}>
                <X className="h-4 w-4 mr-1" /> Decline
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction("accepted")} disabled={acting}>
                {acting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Approve Quote
              </Button>
            </div>
          )}

          {isExpired && quote.status === "pending" && (
            <p className="text-xs text-destructive text-center">This quote has expired. Please contact your freight forwarder for an updated quote.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteApproval;
