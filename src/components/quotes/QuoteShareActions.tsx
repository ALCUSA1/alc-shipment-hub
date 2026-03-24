import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileDown, Share2, MessageCircle, Smartphone, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface QuoteData {
  id: string;
  origin_port?: string | null;
  destination_port?: string | null;
  carrier?: string | null;
  container_type?: string | null;
  customer_name?: string | null;
  customer_price?: number | null;
  amount?: number | null;
  currency?: string | null;
  status?: string;
  valid_until?: string | null;
  created_at?: string;
  transit_days?: number | null;
}

interface QuoteShareActionsProps {
  quote: QuoteData;
  onSparkShare?: (quote: QuoteData, message: string) => void;
}

function buildQuoteSummary(q: QuoteData): string {
  const route = q.origin_port && q.destination_port ? `${q.origin_port} → ${q.destination_port}` : "N/A";
  const price = q.customer_price || q.amount;
  const lines = [
    `📦 Freight Quote`,
    `Route: ${route}`,
    q.carrier ? `Carrier: ${q.carrier}` : null,
    q.container_type ? `Container: ${q.container_type.toUpperCase()}` : null,
    price ? `Price: $${price.toLocaleString()} ${q.currency || "USD"}` : null,
    q.transit_days ? `Transit: ${q.transit_days} days` : null,
    q.valid_until ? `Valid until: ${new Date(q.valid_until).toLocaleDateString()}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

function generateQuotePdfHtml(q: QuoteData): string {
  const route = q.origin_port && q.destination_port ? `${q.origin_port} → ${q.destination_port}` : "N/A";
  const price = q.customer_price || q.amount;
  const date = q.created_at ? new Date(q.created_at).toLocaleDateString() : "—";
  const validUntil = q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Freight Quote — ${route}</title>
  <style>
    @media print { @page { margin: 0.75in; } body { -webkit-print-color-adjust: exact; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #1a1a1a; line-height: 1.6; padding: 48px; }
    .header { text-align: center; border-bottom: 3px double #1a3a5c; padding-bottom: 20px; margin-bottom: 32px; }
    .header h1 { font-size: 26px; letter-spacing: 3px; text-transform: uppercase; color: #1a3a5c; margin-bottom: 4px; }
    .header .sub { font-size: 11px; color: #888; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-box { border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; }
    .info-box .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #999; font-weight: 700; margin-bottom: 6px; }
    .info-box .value { font-size: 14px; font-weight: 600; color: #1a1a1a; }
    .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .detail-table th { background: #f5f7fa; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: #555; text-align: left; padding: 10px 14px; border: 1px solid #e0e0e0; }
    .detail-table td { padding: 10px 14px; border: 1px solid #e0e0e0; font-size: 12px; }
    .price-row { background: #f0f7ff; }
    .price-row td { font-weight: 700; font-size: 16px; color: #1a3a5c; }
    .footer { margin-top: 48px; border-top: 1px solid #ddd; padding-top: 20px; }
    .footer p { font-size: 10px; color: #999; text-align: center; }
    .sig-line { margin-top: 48px; display: flex; justify-content: space-between; }
    .sig-box { width: 42%; border-top: 1px solid #333; padding-top: 6px; font-size: 10px; color: #666; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-accepted { background: #d1fae5; color: #065f46; }
    .badge-booked { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Freight Quote</h1>
    <div class="sub">Generated on ${new Date().toLocaleDateString()}</div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="label">Route</div>
      <div class="value">${route}</div>
    </div>
    <div class="info-box">
      <div class="label">Status</div>
      <div class="value"><span class="badge badge-${q.status || 'pending'}">${(q.status || 'pending').toUpperCase()}</span></div>
    </div>
    ${q.customer_name ? `<div class="info-box"><div class="label">Customer</div><div class="value">${q.customer_name}</div></div>` : ""}
    ${q.carrier ? `<div class="info-box"><div class="label">Carrier</div><div class="value">${q.carrier}</div></div>` : ""}
  </div>

  <table class="detail-table">
    <thead>
      <tr>
        <th>Detail</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      ${q.container_type ? `<tr><td>Container Type</td><td>${q.container_type.toUpperCase()}</td></tr>` : ""}
      ${q.transit_days ? `<tr><td>Transit Time</td><td>${q.transit_days} days</td></tr>` : ""}
      <tr><td>Quote Date</td><td>${date}</td></tr>
      <tr><td>Valid Until</td><td>${validUntil}</td></tr>
      ${price ? `<tr class="price-row"><td>Total Price</td><td>$${price.toLocaleString()} ${q.currency || "USD"}</td></tr>` : ""}
    </tbody>
  </table>

  <div class="footer">
    <div class="sig-line">
      <div class="sig-box">Authorized Signature</div>
      <div class="sig-box">Date</div>
    </div>
    <p style="margin-top: 24px;">This quote is subject to terms and conditions. Rates are valid until the expiry date shown above.</p>
  </div>
</body>
</html>`;
}

export function QuoteShareActions({ quote, onSparkShare }: QuoteShareActionsProps) {
  const { user } = useAuth();
  const [sparkDialogOpen, setSparkDialogOpen] = useState(false);
  const [sparkMessage, setSparkMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const handleDownloadPdf = () => {
    const html = generateQuotePdfHtml(quote);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Pop-up blocked", description: "Please allow pop-ups to download the PDF.", variant: "destructive" });
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 600);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(buildQuoteSummary(quote));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleSms = () => {
    const text = encodeURIComponent(buildQuoteSummary(quote));
    window.open(`sms:?body=${text}`, "_blank");
  };

  const handleSparkPost = async () => {
    if (!user || !sparkMessage.trim()) return;
    setPosting(true);
    try {
      // Get user's profile for the post
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      const route = quote.origin_port && quote.destination_port
        ? `${quote.origin_port} → ${quote.destination_port}`
        : "";
      const price = quote.customer_price || quote.amount;
      const quoteEmbed = [
        sparkMessage,
        "",
        `📦 Freight Quote${route ? `: ${route}` : ""}`,
        quote.carrier ? `🚢 ${quote.carrier}` : null,
        price ? `💰 $${price.toLocaleString()} ${quote.currency || "USD"}` : null,
        quote.transit_days ? `⏱ ${quote.transit_days} day transit` : null,
      ].filter(Boolean).join("\n");

      await supabase.from("spark_posts").insert({
        user_id: user.id,
        content: quoteEmbed,
        post_type: "promotion",
        author_name: profile?.full_name || "User",
        author_company: profile?.company_name || null,
        author_avatar: profile?.avatar_url || null,
      });

      toast({ title: "Shared on Spark!", description: "Your quote has been posted to the Spark feed." });
      setSparkDialogOpen(false);
      setSparkMessage("");
    } catch (err: any) {
      toast({ title: "Failed to share", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" title="Share / Download">
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuItem onClick={handleDownloadPdf} className="gap-2 text-xs">
            <FileDown className="h-3.5 w-3.5" /> Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleWhatsApp} className="gap-2 text-xs">
            <MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSms} className="gap-2 text-xs">
            <Smartphone className="h-3.5 w-3.5" /> Send as Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setSparkMessage(""); setSparkDialogOpen(true); }} className="gap-2 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Share on Spark
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Spark Share Dialog */}
      <Dialog open={sparkDialogOpen} onOpenChange={setSparkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Share Quote on Spark
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-medium text-foreground">
                {quote.origin_port && quote.destination_port
                  ? `${quote.origin_port} → ${quote.destination_port}`
                  : "Freight Quote"}
              </p>
              {quote.carrier && <p className="text-muted-foreground">Carrier: {quote.carrier}</p>}
              {(quote.customer_price || quote.amount) && (
                <p className="font-semibold text-foreground">
                  ${(quote.customer_price || quote.amount || 0).toLocaleString()} {quote.currency || "USD"}
                </p>
              )}
            </div>
            <Textarea
              placeholder="Add a message to your Spark post…"
              value={sparkMessage}
              onChange={(e) => setSparkMessage(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSparkDialogOpen(false)}>Cancel</Button>
            <Button variant="electric" onClick={handleSparkPost} disabled={posting || !sparkMessage.trim()}>
              {posting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Post to Spark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
