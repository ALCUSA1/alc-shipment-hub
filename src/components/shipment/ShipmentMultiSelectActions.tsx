import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Loader2, Receipt, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";

interface ShipmentMultiSelectActionsProps {
  selectedIds: Set<string>;
  shipments: any[];
  onClearSelection: () => void;
}

export function ShipmentMultiSelectActions({ selectedIds, shipments, onClearSelection }: ShipmentMultiSelectActionsProps) {
  const { user } = useAuth();
  const [generatingSOA, setGeneratingSOA] = useState(false);
  const [generatingPack, setGeneratingPack] = useState(false);

  const selectedShipments = shipments.filter(s => selectedIds.has(s.id));

  const handleGenerateSOA = useCallback(async () => {
    if (!user || selectedShipments.length === 0) return;
    setGeneratingSOA(true);

    try {
      // Fetch financials for selected shipments
      const { data: financials, error } = await supabase
        .from("shipment_financials")
        .select("*, shipments(shipment_ref, status, origin_port, destination_port)")
        .in("shipment_id", selectedShipments.map(s => s.id))
        .eq("entry_type", "revenue");

      if (error) throw error;

      // Get user profile for customer name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, company_name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      const customerName = profile?.company_name || profile?.full_name || "Customer";
      const today = new Date();

      // Build aging data
      const invoiceRows = (financials || []).map(f => {
        const shipRef = (f.shipments as any)?.shipment_ref || "—";
        const dueDate = f.date ? new Date(new Date(f.date).getTime() + 30 * 86400000) : today;
        const agingDays = Math.max(0, differenceInDays(today, dueDate));
        const bucket = agingDays <= 30 ? "Current" : agingDays <= 60 ? "31–60" : agingDays <= 90 ? "61–90" : "Over 90";
        return {
          shipmentRef: shipRef,
          invoiceRef: f.invoice_ref || `INV-${f.id.slice(0, 8).toUpperCase()}`,
          description: f.description || f.category || "Charge",
          date: f.date ? format(new Date(f.date), "MMM dd, yyyy") : "—",
          dueDate: format(dueDate, "MMM dd, yyyy"),
          amount: Number(f.amount || 0),
          currency: f.currency || "USD",
          agingDays,
          bucket,
          status: agingDays > 30 ? "overdue" : "unpaid",
        };
      });

      const totalOutstanding = invoiceRows.reduce((s, r) => s + r.amount, 0);
      const bucketTotals = {
        current: invoiceRows.filter(r => r.bucket === "Current").reduce((s, r) => s + r.amount, 0),
        b3160: invoiceRows.filter(r => r.bucket === "31–60").reduce((s, r) => s + r.amount, 0),
        b6190: invoiceRows.filter(r => r.bucket === "61–90").reduce((s, r) => s + r.amount, 0),
        over90: invoiceRows.filter(r => r.bucket === "Over 90").reduce((s, r) => s + r.amount, 0),
      };

      const html = renderSOAHtml({
        customerName,
        dateGenerated: format(today, "MMMM dd, yyyy"),
        shipmentCount: selectedShipments.length,
        totalOutstanding,
        bucketTotals,
        invoiceRows,
      });

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({ title: "Pop-up blocked", description: "Please allow pop-ups to download the SOA.", variant: "destructive" });
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 600);

      toast({ title: "SOA Generated", description: `Statement of Account for ${selectedShipments.length} shipments ready.` });
    } catch (err: any) {
      toast({ title: "SOA generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingSOA(false);
    }
  }, [user, selectedShipments]);

  const handleDownloadPack = useCallback(async () => {
    if (selectedShipments.length === 0) return;
    setGeneratingPack(true);

    try {
      // Generate documents for each shipment sequentially and open print windows
      for (const shipment of selectedShipments) {
        const { data, error } = await supabase.functions.invoke("generate-documents", {
          body: { shipment_id: shipment.id },
        });
        if (error || data?.error) continue;

        const docs = data.documents || {};
        const allHtml = Object.entries(docs).map(([key, doc]: [string, any]) => {
          const label = key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
          return `<div style="page-break-before:always;">
            <h2 style="text-align:center;margin-bottom:20px;font-size:18px;text-transform:uppercase;letter-spacing:2px;">${label}</h2>
            <p style="text-align:center;font-size:12px;color:#666;margin-bottom:30px;">${shipment.shipment_ref || "Shipment"}</p>
          </div>`;
        }).join("");

        // For simplicity, open one print window per shipment
        if (Object.keys(docs).length > 0) {
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.write(renderPackHtml(docs, shipment.shipment_ref || "Shipment"));
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 600);
          }
        }
      }

      toast({ title: "Document packs ready", description: "Print dialog opened for each shipment." });
    } catch (err: any) {
      toast({ title: "Pack generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingPack(false);
    }
  }, [selectedShipments]);

  if (selectedIds.size === 0) return null;

  return (
    <div className="bg-accent/5 border border-accent/20 rounded-lg px-4 py-3 flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-accent text-accent-foreground">
          {selectedIds.size} selected
        </Badge>
        <Separator orientation="vertical" className="h-5" />
        <span className="text-sm text-muted-foreground">
          {selectedShipments.map(s => s.shipment_ref).filter(Boolean).slice(0, 3).join(", ")}
          {selectedIds.size > 3 && ` +${selectedIds.size - 3} more`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleGenerateSOA} disabled={generatingSOA}>
          {generatingSOA ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Receipt className="mr-2 h-3.5 w-3.5" />}
          Generate SOA
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadPack} disabled={generatingPack}>
          {generatingPack ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Package className="mr-2 h-3.5 w-3.5" />}
          Download Pack
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear
        </Button>
      </div>
    </div>
  );
}

function renderSOAHtml(data: {
  customerName: string;
  dateGenerated: string;
  shipmentCount: number;
  totalOutstanding: number;
  bucketTotals: { current: number; b3160: number; b6190: number; over90: number };
  invoiceRows: any[];
}): string {
  const { customerName, dateGenerated, shipmentCount, totalOutstanding, bucketTotals, invoiceRows } = data;
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Statement of Account — ${customerName}</title>
  <style>
    @media print { @page { margin: 0.6in; } body { -webkit-print-color-adjust: exact; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px double #333; }
    .header h1 { font-size: 24px; letter-spacing: 2px; text-transform: uppercase; }
    .header .meta { text-align: right; font-size: 11px; color: #666; }
    .header .meta strong { color: #333; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 30px; }
    .summary-card { border: 1px solid #ddd; border-radius: 6px; padding: 12px; text-align: center; }
    .summary-card.total { background: #1a365d; color: white; }
    .summary-card .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: inherit; opacity: 0.7; margin-bottom: 4px; }
    .summary-card .value { font-size: 18px; font-weight: 700; }
    .summary-card.total .label { color: rgba(255,255,255,0.7); }
    .summary-card.total .value { color: white; }
    .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 12px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f5f5f5; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 9px; border: 1px solid #ddd; padding: 8px; text-align: left; }
    td { border: 1px solid #ddd; padding: 6px 8px; font-size: 10px; }
    tr:nth-child(even) { background: #fafafa; }
    .amount { text-align: right; font-weight: 600; }
    .bucket-current { color: #059669; }
    .bucket-3160 { color: #d97706; }
    .bucket-6190 { color: #ea580c; }
    .bucket-over90 { color: #dc2626; font-weight: 700; }
    .total-row { font-weight: 700; background: #f0f0f0 !important; }
    .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 16px; font-size: 10px; color: #888; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Statement of Account</h1>
      <div style="margin-top:8px;font-size:12px;">All Logistics Cargo</div>
    </div>
    <div class="meta">
      <div><strong>Customer:</strong> ${customerName}</div>
      <div><strong>Date:</strong> ${dateGenerated}</div>
      <div><strong>Shipments:</strong> ${shipmentCount}</div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-card total">
      <div class="label">Total Outstanding</div>
      <div class="value">${fmt(totalOutstanding)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Current (0–30)</div>
      <div class="value bucket-current">${fmt(bucketTotals.current)}</div>
    </div>
    <div class="summary-card">
      <div class="label">31–60 Days</div>
      <div class="value bucket-3160">${fmt(bucketTotals.b3160)}</div>
    </div>
    <div class="summary-card">
      <div class="label">61–90 Days</div>
      <div class="value bucket-6190">${fmt(bucketTotals.b6190)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Over 90 Days</div>
      <div class="value bucket-over90">${fmt(bucketTotals.over90)}</div>
    </div>
  </div>

  <div class="section-title">Invoice Detail</div>
  <table>
    <thead>
      <tr>
        <th>Shipment</th>
        <th>Invoice #</th>
        <th>Description</th>
        <th>Invoice Date</th>
        <th>Due Date</th>
        <th>Aging</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceRows.map(r => `
        <tr>
          <td>${r.shipmentRef}</td>
          <td>${r.invoiceRef}</td>
          <td>${r.description}</td>
          <td>${r.date}</td>
          <td>${r.dueDate}</td>
          <td class="${r.bucket === "Current" ? "bucket-current" : r.bucket === "31–60" ? "bucket-3160" : r.bucket === "61–90" ? "bucket-6190" : "bucket-over90"}">${r.bucket}</td>
          <td class="amount">${fmt(r.amount)} ${r.currency}</td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="6">Total Outstanding</td>
        <td class="amount">${fmt(totalOutstanding)} USD</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>This statement was generated by All Logistics Cargo on ${dateGenerated}.</p>
    <p>For questions, contact billing@alllogisticscargo.com</p>
  </div>
</body>
</html>`;
}

function renderPackHtml(docs: Record<string, any>, shipRef: string): string {
  const docEntries = Object.entries(docs);
  
  const renderDoc = ([key, doc]: [string, any], idx: number) => {
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const pageBreak = idx > 0 ? 'style="page-break-before:always;"' : '';
    
    const parties = ["shipper", "consignee", "notify_party"].filter(k => doc[k] && typeof doc[k] === "object");
    const partyHtml = parties.length > 0 ? `<div style="display:grid;grid-template-columns:${parties.length >= 3 ? "1fr 1fr 1fr" : "1fr 1fr"};gap:12px;margin-bottom:16px;">
      ${parties.map(k => {
        const p = doc[k];
        return `<div style="border:1px solid #ddd;padding:8px;border-radius:4px;">
          <div style="font-size:9px;text-transform:uppercase;color:#888;font-weight:600;">${k.replace(/_/g, " ")}</div>
          <div style="font-weight:700;">${p.name || "—"}</div>
          <div style="font-size:10px;">${p.address || ""}</div>
        </div>`;
      }).join("")}
    </div>` : "";

    const cargo = doc.cargo_description || doc.cargo_items || doc.items || [];
    const cargoHtml = Array.isArray(cargo) && cargo.length > 0 ? `
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead><tr>${Object.keys(cargo[0]).map(c => `<th style="background:#f5f5f5;font-weight:700;text-transform:uppercase;font-size:9px;border:1px solid #ddd;padding:6px;">${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead>
        <tbody>${cargo.map((row: any) => `<tr>${Object.values(row).map(v => `<td style="border:1px solid #ddd;padding:5px;font-size:10px;">${v ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>` : "";

    return `<div ${pageBreak}>
      <div style="text-align:center;border-bottom:3px double #333;padding-bottom:16px;margin-bottom:24px;">
        <h1 style="font-size:20px;letter-spacing:2px;text-transform:uppercase;">${doc.title || label}</h1>
        <div style="font-size:12px;margin-top:6px;font-weight:600;">${doc.ref || shipRef}</div>
        ${doc.date ? `<div style="font-size:11px;color:#666;">Date: ${doc.date}</div>` : ""}
      </div>
      ${partyHtml}
      ${cargoHtml}
    </div>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Document Pack — ${shipRef}</title>
  <style>
    @media print { @page { margin: 0.6in; } body { -webkit-print-color-adjust: exact; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; padding: 40px; }
  </style>
</head>
<body>
  ${docEntries.map((entry, idx) => renderDoc(entry, idx)).join("")}
</body>
</html>`;
}
