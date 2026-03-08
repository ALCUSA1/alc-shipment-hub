import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CreditCard, Loader2, DollarSign, Plus, ArrowRightLeft, Copy, ExternalLink, Check, Ship } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuoteRow {
  id: string;
  shipment_id: string | null;
  amount: number | null;
  currency: string | null;
  status: string;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  origin_port: string | null;
  destination_port: string | null;
  container_type: string | null;
  carrier: string | null;
  carrier_cost: number | null;
  customer_price: number | null;
  margin_value: number | null;
  margin_type: string | null;
  transit_days: number | null;
  customer_name: string | null;
  approval_token: string | null;
  approved_at: string | null;
  company_id: string | null;
  converted_from_quote_id?: string | null;
  shipments?: { shipment_ref: string; origin_port: string | null; destination_port: string | null } | null;
}

const statusStyle: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-destructive/10 text-destructive",
  expired: "bg-secondary text-muted-foreground",
  converted: "bg-accent/10 text-accent",
};

const Quotes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertDialogQuote, setConvertDialogQuote] = useState<QuoteRow | null>(null);
  const [cutoffs, setCutoffs] = useState({ cy: "", si: "", vgm: "", doc: "" });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, shipments(shipment_ref, origin_port, destination_port)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as QuoteRow[];
    },
    enabled: !!user,
  });

  const copyApprovalLink = (token: string) => {
    const url = `${window.location.origin}/quote/approve?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast({ title: "Link copied", description: "Customer approval link copied to clipboard." });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleConvert = async () => {
    const quote = convertDialogQuote;
    if (!quote || !user) return;
    setConvertingId(quote.id);

    try {
      // 1. Create shipment from quote data
      const { data: shipment, error: shipErr } = await supabase
        .from("shipments")
        .insert({
          user_id: user.id,
          shipment_ref: "PENDING",
          shipment_type: "export",
          origin_port: quote.origin_port,
          destination_port: quote.destination_port,
          company_id: quote.company_id,
          converted_from_quote_id: quote.id,
          cy_cutoff: cutoffs.cy || null,
          si_cutoff: cutoffs.si || null,
          vgm_cutoff: cutoffs.vgm || null,
          doc_cutoff: cutoffs.doc || null,
        })
        .select("id")
        .single();

      if (shipErr) throw shipErr;

      // 2. Create container from quote data
      if (quote.container_type) {
        await supabase.from("containers").insert({
          shipment_id: shipment.id,
          container_type: quote.container_type,
          quantity: 1,
        });
      }

      // 3. Create initial financial entry (revenue from customer price)
      if (quote.customer_price) {
        await supabase.from("shipment_financials").insert({
          shipment_id: shipment.id,
          user_id: user.id,
          description: `Freight revenue — ${quote.carrier}`,
          entry_type: "revenue",
          category: "freight",
          amount: quote.customer_price,
          vendor: quote.customer_name || null,
        });
      }

      // 4. Create cost entry (carrier cost)
      if (quote.carrier_cost) {
        await supabase.from("shipment_financials").insert({
          shipment_id: shipment.id,
          user_id: user.id,
          description: `Carrier cost — ${quote.carrier}`,
          entry_type: "cost",
          category: "freight",
          amount: quote.carrier_cost,
          vendor: quote.carrier || null,
        });
      }

      // 5. Auto-generate document checklist based on shipment type
      const requiredDocs = [
        "bill_of_lading",
        "commercial_invoice",
        "packing_list",
        "shipper_letter_of_instruction",
        "dock_receipt",
        "certificate_of_origin",
        "insurance_certificate",
        "aes_filing",
      ];
      await supabase.from("documents").insert(
        requiredDocs.map((docType) => ({
          shipment_id: shipment.id,
          user_id: user.id,
          doc_type: docType,
          status: "pending",
        }))
      );

      // 6. Update quote status to converted and link shipment
      await supabase.from("quotes").update({
        status: "converted",
        shipment_id: shipment.id,
      }).eq("id", quote.id);

      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Shipment Created", description: "Quote has been converted to a shipment with pre-filled details." });
      setConvertDialogQuote(null);
      navigate(`/dashboard/shipments/${shipment.id}`);
    } catch (err: any) {
      toast({ title: "Conversion failed", description: err.message, variant: "destructive" });
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
          <p className="text-sm text-muted-foreground">Build quotes with carrier rates and margin markup</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/quotes/new">
            <Plus className="h-4 w-4 mr-2" />
            New Quote
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No quotes yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Create a new quote to get started.</p>
              <Button asChild className="mt-4">
                <Link to="/dashboard/quotes/new">
                  <Plus className="h-4 w-4 mr-2" /> Create Quote
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground p-4">Route</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Customer</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Carrier</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Customer Price</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Margin</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Created</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => {
                    const marginAmt = q.margin_type === "flat"
                      ? (q.margin_value || 0)
                      : (q.carrier_cost || 0) * ((q.margin_value || 0) / 100);
                    const isExpired = q.valid_until && new Date(q.valid_until) < new Date() && q.status === "pending";

                    return (
                      <tr key={q.id} className="border-b last:border-0 hover:bg-secondary/50">
                        <td className="p-4 font-medium text-foreground">
                          {q.origin_port && q.destination_port
                            ? `${q.origin_port} → ${q.destination_port}`
                            : q.shipments?.origin_port && q.shipments?.destination_port
                              ? `${q.shipments.origin_port} → ${q.shipments.destination_port}`
                              : "—"}
                          {q.container_type && (
                            <span className="text-xs text-muted-foreground ml-2">{q.container_type.toUpperCase()}</span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">{q.customer_name || "—"}</td>
                        <td className="p-4 text-muted-foreground">{q.carrier || "—"}</td>
                        <td className="p-4 font-medium text-foreground">
                          {q.customer_price ? `$${q.customer_price.toLocaleString()}` : q.amount ? `$${q.amount.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-4">
                          {marginAmt > 0 ? (
                            <span className="text-xs font-medium text-green-600">+${marginAmt.toLocaleString()}</span>
                          ) : "—"}
                        </td>
                        <td className="p-4">
                          <Badge className={statusStyle[isExpired ? "expired" : q.status] || "bg-secondary text-muted-foreground"} variant="secondary">
                            {isExpired ? "expired" : q.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {format(new Date(q.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {q.status === "accepted" && (
                              <Button size="sm" variant="electric" onClick={() => { setConvertDialogQuote(q); setCutoffs({ cy: "", si: "", vgm: "", doc: "" }); }}>
                                <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                                Convert
                              </Button>
                            )}
                            {q.approval_token && q.status === "pending" && !isExpired && (
                              <Button size="sm" variant="outline"
                                onClick={() => copyApprovalLink(q.approval_token!)}>
                                {copiedToken === q.approval_token ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                            {q.shipment_id && (
                              <Button size="sm" variant="ghost" asChild>
                                <Link to={`/dashboard/shipments/${q.shipment_id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convert to Shipment Dialog */}
      <Dialog open={!!convertDialogQuote} onOpenChange={(open) => { if (!open) setConvertDialogQuote(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-accent" />
              Convert Quote to Shipment
            </DialogTitle>
            <DialogDescription>
              This will create a new shipment with route, container, and financial data pre-filled from the approved quote.
              Set carrier cutoff dates to enable deadline tracking.
            </DialogDescription>
          </DialogHeader>
          {convertDialogQuote && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route</span>
                  <span className="font-medium text-foreground">{convertDialogQuote.origin_port} → {convertDialogQuote.destination_port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carrier</span>
                  <span className="font-medium text-foreground">{convertDialogQuote.carrier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer Price</span>
                  <span className="font-mono font-semibold text-foreground">${convertDialogQuote.customer_price?.toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-foreground">Cutoff Dates (optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">CY Cutoff</Label>
                    <Input type="datetime-local" className="mt-1" value={cutoffs.cy}
                      onChange={(e) => setCutoffs({ ...cutoffs, cy: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">SI Cutoff</Label>
                    <Input type="datetime-local" className="mt-1" value={cutoffs.si}
                      onChange={(e) => setCutoffs({ ...cutoffs, si: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">VGM Cutoff</Label>
                    <Input type="datetime-local" className="mt-1" value={cutoffs.vgm}
                      onChange={(e) => setCutoffs({ ...cutoffs, vgm: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Doc Cutoff</Label>
                    <Input type="datetime-local" className="mt-1" value={cutoffs.doc}
                      onChange={(e) => setCutoffs({ ...cutoffs, doc: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogQuote(null)}>Cancel</Button>
            <Button variant="electric" onClick={handleConvert} disabled={!!convertingId}>
              {convertingId && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Quotes;
