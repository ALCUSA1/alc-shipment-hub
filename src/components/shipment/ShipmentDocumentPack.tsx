import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useDocumentPdf } from "@/hooks/useDocumentPdf";
import {
  FileText, Download, Loader2, Package, Check, Clock, Lock,
  Circle, Printer, Receipt, Ship, AlertTriangle,
} from "lucide-react";

interface Props {
  shipmentId: string;
  shipmentRef: string;
  mode: "ocean" | "air";
}

interface DocItem {
  key: string;
  label: string;
  icon: React.ElementType;
  status: "available" | "pending" | "not_applicable";
  date?: string;
}

export function ShipmentDocumentPack({ shipmentId, shipmentRef, mode }: Props) {
  const { generatePdf, generating } = useDocumentPdf();
  const [generatingPack, setGeneratingPack] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["doc-pack-docs", shipmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("doc_type, status, created_at")
        .eq("shipment_id", shipmentId);
      return data || [];
    },
  });

  const existingTypes = new Set((documents || []).map(d => d.doc_type));
  const docDateMap: Record<string, string> = {};
  (documents || []).forEach(d => { docDateMap[d.doc_type] = d.created_at; });

  const allDocs: DocItem[] = ([
    { key: "shipping_instruction", label: "Shipping Instruction (SI)", icon: FileText,
      status: existingTypes.has("shipping_instruction") || existingTypes.has("si") ? "available" as const : "pending" as const },
    { key: "bill_of_lading", label: mode === "air" ? "Air Waybill (AWB)" : "House Bill of Lading (HBL)", icon: Ship,
      status: existingTypes.has("bill_of_lading") || existingTypes.has("hbl") || existingTypes.has("hawb") ? "available" as const : "pending" as const },
    { key: "master_bill_of_lading", label: mode === "air" ? "Master AWB (MAWB)" : "Master Bill of Lading (MBL)", icon: Ship,
      status: existingTypes.has("master_bill_of_lading") || existingTypes.has("mbl") || existingTypes.has("mawb") ? "available" as const : "pending" as const },
    { key: "commercial_invoice", label: "Commercial Invoice", icon: Receipt,
      status: existingTypes.has("commercial_invoice") ? "available" as const : "pending" as const },
    { key: "packing_list", label: "Packing List", icon: Package,
      status: existingTypes.has("packing_list") ? "available" as const : "pending" as const },
    { key: "sea_waybill", label: "Sea Waybill (SWB)", icon: Ship,
      status: existingTypes.has("sea_waybill") || existingTypes.has("swb") ? "available" as const : mode === "air" ? "not_applicable" as const : "pending" as const },
    { key: "certificate_of_origin", label: "Certificate of Origin", icon: FileText,
      status: existingTypes.has("certificate_of_origin") ? "available" as const : "pending" as const },
  ] satisfies DocItem[]).filter(d => d.status !== "not_applicable");

  const handleDownloadAll = async () => {
    setGeneratingPack(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-documents", {
        body: { shipment_id: shipmentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const docs = data.documents || {};
      if (Object.keys(docs).length === 0) {
        toast({ title: "No documents", description: "No documents could be generated for this shipment.", variant: "destructive" });
        return;
      }

      // Open a single print window with all documents
      const html = renderPackHtml(docs, shipmentRef);
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({ title: "Pop-up blocked", description: "Please allow pop-ups.", variant: "destructive" });
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 600);

      toast({ title: "Document Pack Ready", description: `${Object.keys(docs).length} documents ready for print/download.` });
    } catch (err: any) {
      toast({ title: "Pack generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingPack(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "available") return <Check className="h-3.5 w-3.5 text-emerald-600" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const statusBadge = (status: string) => {
    if (status === "available") return <Badge variant="secondary" className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Available</Badge>;
    return <Badge variant="secondary" className="text-[9px]">Pending</Badge>;
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-accent" />
            Document Pack
          </CardTitle>
          <Button variant="electric" size="sm" onClick={handleDownloadAll} disabled={generatingPack}>
            {generatingPack ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
            Download All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {allDocs.map(doc => (
          <div key={doc.key} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              {statusIcon(doc.status)}
              <doc.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{doc.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(doc.status)}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => generatePdf(shipmentId, doc.key, doc.label)}
                disabled={generating === doc.key + shipmentId}
              >
                {generating === doc.key + shipmentId ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Printer className="h-3 w-3 mr-1" />
                    PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function renderPackHtml(docs: Record<string, any>, shipRef: string): string {
  const entries = Object.entries(docs);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Document Pack — ${shipRef}</title>
  <style>
    @media print { @page { margin: 0.6in; } body { -webkit-print-color-adjust: exact; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; padding: 40px; }
    .doc-header { text-align: center; border-bottom: 3px double #333; padding-bottom: 16px; margin-bottom: 24px; }
    .doc-header h1 { font-size: 20px; letter-spacing: 2px; text-transform: uppercase; }
    .doc-header .ref { font-size: 12px; margin-top: 6px; font-weight: 600; }
    .doc-header .date { font-size: 11px; color: #666; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; margin-top: 16px; }
    .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .party-box { border: 1px solid #ddd; padding: 8px; border-radius: 4px; }
    .party-box .label { font-size: 9px; text-transform: uppercase; color: #888; font-weight: 600; }
    .party-box .name { font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f5f5f5; font-weight: 700; text-transform: uppercase; font-size: 9px; border: 1px solid #ddd; padding: 6px; }
    td { border: 1px solid #ddd; padding: 5px 6px; font-size: 10px; }
    .kv-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    .kv .k { font-size: 9px; text-transform: uppercase; color: #888; font-weight: 600; }
    .kv .v { font-size: 11px; font-weight: 500; }
    .page-sep { page-break-before: always; }
  </style>
</head>
<body>
  ${entries.map(([key, doc], idx) => {
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const pageBreak = idx > 0 ? 'class="page-sep"' : '';
    
    const parties = ["shipper", "consignee", "notify_party"].filter(k => doc[k] && typeof doc[k] === "object");
    const partyHtml = parties.length > 0 ? `<div class="party-grid">
      ${parties.map(k => {
        const p = doc[k];
        return `<div class="party-box"><div class="label">${k.replace(/_/g, " ")}</div><div class="name">${p.name || "—"}</div><div>${p.address || ""}</div></div>`;
      }).join("")}
    </div>` : "";

    const skipKeys = new Set(["title","subtitle","ref","date","shipper","consignee","notify_party","exporter","cargo_description","cargo_items","items","line_items","containers","totals","declaration","certification","cargo","cargo_summary"]);
    const kvs = Object.entries(doc).filter(([k, v]) => !skipKeys.has(k) && typeof v !== "object" && v !== null && v !== "");
    const kvHtml = kvs.length > 0 ? `<div class="section-title">Details</div><div class="kv-grid">${kvs.map(([k, v]) => `<div class="kv"><div class="k">${k.replace(/_/g, " ")}</div><div class="v">${v}</div></div>`).join("")}</div>` : "";

    const cargo = doc.cargo_description || doc.cargo_items || doc.items || [];
    const cargoHtml = Array.isArray(cargo) && cargo.length > 0 ? `<div class="section-title">Cargo</div><table><thead><tr>${Object.keys(cargo[0]).map(c => `<th>${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead><tbody>${cargo.map((row: any) => `<tr>${Object.values(row).map(v => `<td>${v ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "";

    return `<div ${pageBreak}>
      <div class="doc-header">
        <h1>${doc.title || label}</h1>
        <div class="ref">${doc.ref || shipRef}</div>
        ${doc.date ? `<div class="date">Date: ${doc.date}</div>` : ""}
      </div>
      ${partyHtml}
      ${kvHtml}
      ${cargoHtml}
    </div>`;
  }).join("")}
</body>
</html>`;
}
