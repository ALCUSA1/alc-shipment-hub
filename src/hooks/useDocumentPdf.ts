import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

/**
 * Calls the generate-documents edge function for a shipment,
 * then opens a new window with rendered HTML for print-to-PDF.
 */
export function useDocumentPdf() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);

  const generatePdf = async (shipmentId: string, docType: string, docLabel: string) => {
    setGenerating(docType + shipmentId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-documents", {
        body: { shipment_id: shipmentId, doc_types: [docType] },
      });

      if (error) throw error;
      if (!data?.documents?.[docType]) {
        toast({ title: "No data", description: "Document data could not be generated for this shipment.", variant: "destructive" });
        return;
      }

      const docData = data.documents[docType];
      const shipRef = data.shipment_ref || "Shipment";
      const html = renderDocumentHtml(docData, docLabel, shipRef);

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({ title: "Pop-up blocked", description: "Please allow pop-ups to download the PDF.", variant: "destructive" });
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      // Give the browser a moment to parse the HTML before triggering print
      setTimeout(() => printWindow.print(), 600);
    } catch (err: any) {
      toast({ title: "Error generating document", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  return { generatePdf, generating };
}

function renderDocumentHtml(doc: Record<string, any>, label: string, shipRef: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${label} — ${shipRef}</title>
  <style>
    @media print { @page { margin: 0.75in; } body { -webkit-print-color-adjust: exact; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; padding: 40px; }
    .doc-header { text-align: center; border-bottom: 3px double #333; padding-bottom: 16px; margin-bottom: 24px; }
    .doc-header h1 { font-size: 22px; letter-spacing: 2px; margin-bottom: 4px; text-transform: uppercase; }
    .doc-header .subtitle { font-size: 11px; color: #666; }
    .doc-header .ref { font-size: 12px; margin-top: 8px; font-weight: 600; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
    .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .party-grid.three { grid-template-columns: 1fr 1fr 1fr; }
    .party-box { border: 1px solid #ddd; padding: 10px; border-radius: 4px; }
    .party-box .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; font-weight: 600; }
    .party-box .name { font-weight: 700; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
    th { background: #f5f5f5; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 9px; }
    .totals-row { font-weight: 700; background: #fafafa; }
    .kv-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .kv { }
    .kv .k { font-size: 9px; text-transform: uppercase; color: #888; font-weight: 600; }
    .kv .v { font-size: 11px; font-weight: 500; }
    .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 16px; }
    .sig-line { margin-top: 40px; display: flex; justify-content: space-between; }
    .sig-box { width: 45%; border-top: 1px solid #333; padding-top: 4px; font-size: 10px; color: #666; }
    .declaration { font-style: italic; font-size: 10px; color: #555; margin-top: 12px; padding: 10px; background: #fafafa; border-left: 3px solid #ccc; }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1>${doc.title || label}</h1>
    ${doc.subtitle ? `<div class="subtitle">${doc.subtitle}</div>` : ""}
    <div class="ref">${doc.ref || doc.invoice_number || doc.hawb_number || doc.mawb_number || shipRef}</div>
    ${doc.date || doc.invoice_date || doc.date_of_issue ? `<div class="subtitle">Date: ${doc.date || doc.invoice_date || doc.date_of_issue}</div>` : ""}
  </div>

  ${renderParties(doc)}
  ${renderKeyValues(doc)}
  ${renderCargoTable(doc)}
  ${renderContainers(doc)}
  ${renderLineItems(doc)}
  ${renderTotals(doc)}
  ${renderDeclaration(doc)}

  <div class="footer">
    <div class="sig-line">
      <div class="sig-box">Authorized Signature</div>
      <div class="sig-box">Date</div>
    </div>
  </div>
</body>
</html>`;
}

function renderParties(doc: Record<string, any>): string {
  const partyKeys = ["shipper", "consignee", "notify_party", "exporter"];
  const parties = partyKeys.filter((k) => doc[k] && typeof doc[k] === "object");
  if (parties.length === 0) return "";

  const cols = parties.length >= 3 ? "three" : "";
  return `<div class="section">
    <div class="section-title">Parties</div>
    <div class="party-grid ${cols}">
      ${parties.map((k) => {
        const p = doc[k];
        const label = k.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        return `<div class="party-box">
          <div class="label">${label}</div>
          <div class="name">${p.name || "—"}</div>
          <div>${p.address || ""}</div>
          <div>${[p.contact, p.phone, p.email].filter(Boolean).join(" · ")}</div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

function renderKeyValues(doc: Record<string, any>): string {
  const skipKeys = new Set(["title", "subtitle", "ref", "date", "date_of_issue", "invoice_date", "invoice_number",
    "hawb_number", "mawb_number", "shipper", "consignee", "notify_party", "exporter", "forwarding_agent",
    "issuing_agent", "issuing_carrier_agent", "forwarder", "cargo_description", "cargo_items", "items",
    "line_items", "containers", "totals", "declaration", "certification", "cargo", "cargo_summary",
    "number_of_originals", "grand_total", "currency"]);

  const kvs = Object.entries(doc).filter(
    ([k, v]) => !skipKeys.has(k) && typeof v !== "object" && v !== null && v !== "—" && v !== ""
  );
  if (kvs.length === 0) return "";

  return `<div class="section">
    <div class="section-title">Details</div>
    <div class="kv-grid">
      ${kvs.map(([k, v]) => `<div class="kv"><div class="k">${k.replace(/_/g, " ")}</div><div class="v">${v}</div></div>`).join("")}
    </div>
  </div>`;
}

function renderCargoTable(doc: Record<string, any>): string {
  const items = doc.cargo_description || doc.cargo_items || doc.items || doc.cargo_summary || doc.cargo;
  if (!Array.isArray(items) || items.length === 0) return "";

  const first = items[0];
  const cols = Object.keys(first);
  return `<div class="section">
    <div class="section-title">Cargo</div>
    <table>
      <thead><tr>${cols.map((c) => `<th>${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead>
      <tbody>${items.map((row: any) => `<tr>${cols.map((c) => `<td>${row[c] ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function renderLineItems(doc: Record<string, any>): string {
  const items = doc.line_items;
  if (!Array.isArray(items) || items.length === 0) return "";

  const cols = Object.keys(items[0]);
  return `<div class="section">
    <div class="section-title">Line Items</div>
    <table>
      <thead><tr>${cols.map((c) => `<th>${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead>
      <tbody>${items.map((row: any) => `<tr>${cols.map((c) => `<td>${row[c] ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
    ${doc.grand_total ? `<div style="text-align:right;margin-top:8px;font-weight:700;font-size:13px;">Grand Total: $${Number(doc.grand_total).toLocaleString()} ${doc.currency || "USD"}</div>` : ""}
  </div>`;
}

function renderContainers(doc: Record<string, any>): string {
  const containers = doc.containers;
  if (!Array.isArray(containers) || containers.length === 0) return "";

  const cols = Object.keys(containers[0]);
  return `<div class="section">
    <div class="section-title">Containers</div>
    <table>
      <thead><tr>${cols.map((c) => `<th>${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead>
      <tbody>${containers.map((row: any) => `<tr>${cols.map((c) => `<td>${row[c] ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function renderTotals(doc: Record<string, any>): string {
  if (!doc.totals || typeof doc.totals !== "object") return "";
  const entries = Object.entries(doc.totals);
  return `<div class="section">
    <div class="section-title">Totals</div>
    <div class="kv-grid">
      ${entries.map(([k, v]) => `<div class="kv"><div class="k">${k.replace(/_/g, " ")}</div><div class="v">${v}</div></div>`).join("")}
    </div>
  </div>`;
}

function renderDeclaration(doc: Record<string, any>): string {
  const text = doc.declaration || doc.certification;
  if (!text) return "";
  return `<div class="declaration">${text}</div>`;
}
