import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Loader2, Printer, Ship, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DocumentGeneratorProps {
  shipmentId: string;
  shipmentRef: string;
  mode: "ocean" | "air";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentGenerator({ shipmentId, shipmentRef, mode, open, onOpenChange }: DocumentGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Record<string, any> | null>(null);
  const [activeTab, setActiveTab] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-documents", {
        body: { shipment_id: shipmentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDocuments(data.documents);
      const firstKey = Object.keys(data.documents)[0];
      if (firstKey) setActiveTab(firstKey);
      toast({ title: "Documents Generated", description: `${Object.keys(data.documents).length} documents ready for review.` });
    } catch (err: any) {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (docKey: string) => {
    const doc = documents?.[docKey];
    if (!doc) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(renderDocumentHTML(doc, docKey));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const DOC_LABELS: Record<string, string> = {
    bill_of_lading: "Bill of Lading",
    hawb: "HAWB",
    mawb: "MAWB",
    commercial_invoice: "Commercial Invoice",
    packing_list: "Packing List",
    shipper_letter_of_instruction: "SLI",
    certificate_of_origin: "Certificate of Origin",
    dock_receipt: "Dock Receipt",
    known_shipper_declaration: "Known Shipper",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Document Generator — {shipmentRef}
            <Badge variant="outline" className="text-[10px] gap-0.5">
              {mode === "air" ? <Plane className="h-2.5 w-2.5" /> : <Ship className="h-2.5 w-2.5" />}
              {mode === "air" ? "Air" : "Ocean"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {!documents ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Generate all trade documents from your shipment data. Documents include{" "}
              {mode === "air"
                ? "HAWB, Commercial Invoice, Packing List, SLI, and Known Shipper Declaration"
                : "Bill of Lading, Commercial Invoice, Packing List, SLI, Certificate of Origin, and Dock Receipt"}.
            </p>
            <Button variant="electric" onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {loading ? "Generating..." : "Generate All Documents"}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start overflow-x-auto flex-shrink-0">
                {Object.keys(documents).map((key) => (
                  <TabsTrigger key={key} value={key} className="text-xs whitespace-nowrap">
                    {DOC_LABELS[key] || key}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(documents).map(([key, doc]) => (
                <TabsContent key={key} value={key} className="flex-1 overflow-auto mt-0">
                  <div className="flex items-center justify-end gap-2 py-2 px-1 sticky top-0 bg-background z-10 border-b">
                    <Button variant="outline" size="sm" onClick={() => handlePrint(key)}>
                      <Printer className="mr-2 h-3.5 w-3.5" />
                      Print / Save PDF
                    </Button>
                  </div>
                  <DocumentPreview doc={doc as Record<string, any>} docType={key} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DocumentPreview({ doc, docType }: { doc: Record<string, any>; docType: string }) {
  return (
    <div className="p-6 space-y-5 text-sm">
      {/* Title */}
      <div className="text-center border-b pb-4">
        <h2 className="text-lg font-bold text-foreground tracking-wide">{doc.title}</h2>
        {doc.subtitle && <p className="text-xs text-muted-foreground mt-1">{doc.subtitle}</p>}
        {doc.ref && <p className="text-xs font-mono text-muted-foreground mt-1">Ref: {doc.ref}</p>}
        {doc.hawb_number && <p className="text-xs font-mono text-muted-foreground mt-1">HAWB: {doc.hawb_number}</p>}
        {doc.mawb_number && <p className="text-xs font-mono text-muted-foreground mt-1">MAWB: {doc.mawb_number}</p>}
        {doc.invoice_number && <p className="text-xs font-mono text-muted-foreground mt-1">{doc.invoice_number}</p>}
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4">
        {doc.shipper && <PartyCard label="Shipper / Exporter" party={doc.shipper} />}
        {doc.exporter && <PartyCard label="Exporter" party={doc.exporter} />}
        {doc.consignee && <PartyCard label="Consignee" party={doc.consignee} />}
        {doc.notify_party && <PartyCard label="Notify Party" party={doc.notify_party} />}
      </div>

      {/* Transport details */}
      {(doc.vessel || doc.airline || doc.port_of_loading || doc.airport_of_departure) && (
        <>
          <Separator />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {doc.port_of_loading && <Field label="Port of Loading" value={doc.port_of_loading} />}
            {doc.port_of_discharge && <Field label="Port of Discharge" value={doc.port_of_discharge} />}
            {doc.airport_of_departure && <Field label="Airport of Departure" value={doc.airport_of_departure} />}
            {doc.airport_of_destination && <Field label="Airport of Destination" value={doc.airport_of_destination} />}
            {doc.vessel && <Field label="Vessel" value={doc.vessel} />}
            {doc.voyage && <Field label="Voyage" value={doc.voyage} />}
            {doc.airline && <Field label="Airline" value={doc.airline} />}
            {doc.flight_number && <Field label="Flight" value={doc.flight_number} />}
            {doc.flight_date && <Field label="Flight Date" value={doc.flight_date} />}
            {doc.booking_ref && <Field label="Booking Ref" value={doc.booking_ref} />}
            {doc.freight_terms && <Field label="Freight Terms" value={doc.freight_terms} />}
            {doc.date && <Field label="Date" value={doc.date} />}
            {doc.date_of_issue && <Field label="Date of Issue" value={doc.date_of_issue} />}
            {doc.invoice_date && <Field label="Invoice Date" value={doc.invoice_date} />}
          </div>
        </>
      )}

      {/* Weight totals for air */}
      {doc.pieces !== undefined && (
        <>
          <Separator />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Pieces" value={String(doc.pieces)} />
            <Field label="Gross Weight (kg)" value={String(doc.gross_weight_kg)} />
            <Field label="Chargeable Weight (kg)" value={String(doc.chargeable_weight_kg)} />
          </div>
        </>
      )}

      {/* Cargo / Line Items */}
      {(doc.cargo_description || doc.cargo_items || doc.line_items || doc.items || doc.cargo) && (
        <>
          <Separator />
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {doc.line_items ? "Line Items" : "Cargo Description"}
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Weight (kg)</th>
                  {doc.line_items && <th className="text-right px-3 py-2 font-medium text-muted-foreground">Value</th>}
                </tr>
              </thead>
              <tbody>
                {(doc.cargo_description || doc.cargo_items || doc.line_items || doc.items || doc.cargo || []).map((item: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{item.line || idx + 1}</td>
                    <td className="px-3 py-2 text-foreground">
                      {item.commodity || item.commodity || "—"}
                      {(item.hs_code && item.hs_code !== "—") && (
                        <span className="text-muted-foreground ml-2 font-mono text-[10px]">HS: {item.hs_code}</span>
                      )}
                    </td>
                    <td className="text-right px-3 py-2">{item.packages || item.quantity || item.pieces || 0}</td>
                    <td className="text-right px-3 py-2">{item.gross_weight_kg || item.gross_weight || 0}</td>
                    {doc.line_items && <td className="text-right px-3 py-2 font-medium">${item.total_value?.toLocaleString() || 0}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {doc.grand_total !== undefined && (
            <div className="flex justify-end">
              <div className="border rounded-lg px-4 py-2 bg-muted/30">
                <span className="text-xs text-muted-foreground mr-3">Grand Total:</span>
                <span className="text-sm font-bold text-foreground">${doc.grand_total?.toLocaleString()} {doc.currency}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Containers */}
      {doc.containers && doc.containers.length > 0 && (
        <>
          <Separator />
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Containers</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {doc.containers.map((c: any, i: number) => (
              <div key={i} className="border rounded-lg px-3 py-2 text-xs">
                <p className="font-mono font-medium text-foreground">{c.number}</p>
                <p className="text-muted-foreground">{c.type} {c.size && `/ ${c.size}`}</p>
                {c.seal && c.seal !== "—" && <p className="text-muted-foreground">Seal: {c.seal}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Declaration / Certification */}
      {(doc.declaration || doc.certification) && (
        <>
          <Separator />
          <div className="bg-muted/30 rounded-lg p-4 border">
            <p className="text-xs text-muted-foreground italic">{doc.declaration || doc.certification}</p>
          </div>
        </>
      )}

      {/* Handling / Special info */}
      {doc.handling_information && doc.handling_information !== "—" && (
        <>
          <Separator />
          <Field label="Handling Information" value={doc.handling_information} />
        </>
      )}
      {doc.screening_method && (
        <Field label="Screening Method" value={doc.screening_method} />
      )}
    </div>
  );
}

function PartyCard({ label, party }: { label: string; party: any }) {
  return (
    <div className="border rounded-lg p-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground">{party.name}</p>
      {party.address !== "—" && <p className="text-xs text-muted-foreground">{party.address}</p>}
      {party.contact !== "—" && <p className="text-xs text-muted-foreground">Attn: {party.contact}</p>}
      {party.email !== "—" && <p className="text-xs text-muted-foreground">{party.email}</p>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function renderDocumentHTML(doc: any, docType: string): string {
  const partyHTML = (label: string, p: any) => p ? `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px">
      <p style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:600;margin:0 0 4px">${label}</p>
      <p style="font-size:14px;font-weight:600;margin:0">${p.name}</p>
      ${p.address !== "—" ? `<p style="font-size:12px;color:#6b7280;margin:2px 0">${p.address}</p>` : ""}
      ${p.contact !== "—" ? `<p style="font-size:12px;color:#6b7280;margin:2px 0">Attn: ${p.contact}</p>` : ""}
      ${p.email !== "—" ? `<p style="font-size:12px;color:#6b7280;margin:2px 0">${p.email}</p>` : ""}
    </div>
  ` : "";

  return `<!DOCTYPE html><html><head><title>${doc.title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; font-size: 13px; }
      h1 { text-align: center; font-size: 20px; letter-spacing: 2px; margin-bottom: 4px; }
      .subtitle { text-align: center; font-size: 11px; color: #6b7280; margin-bottom: 24px; }
      .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th { background: #f3f4f6; text-align: left; padding: 6px 10px; font-size: 11px; color: #6b7280; border: 1px solid #e5e7eb; }
      td { padding: 6px 10px; border: 1px solid #e5e7eb; }
      .field { margin-bottom: 8px; }
      .field-label { font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
      .field-value { font-size: 13px; margin-top: 2px; }
      .declaration { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 20px; font-style: italic; font-size: 12px; color: #6b7280; }
      @media print { body { margin: 20px; } }
    </style>
  </head><body>
    <h1>${doc.title}</h1>
    ${doc.subtitle ? `<p class="subtitle">${doc.subtitle}</p>` : ""}
    ${doc.ref ? `<p class="subtitle">Ref: ${doc.ref}</p>` : ""}
    ${doc.invoice_number ? `<p class="subtitle">${doc.invoice_number} — ${doc.invoice_date || ""}</p>` : ""}
    ${doc.hawb_number ? `<p class="subtitle">HAWB: ${doc.hawb_number}</p>` : ""}
    ${doc.mawb_number ? `<p class="subtitle">MAWB: ${doc.mawb_number}</p>` : ""}
    <div class="parties">
      ${partyHTML("Shipper / Exporter", doc.shipper || doc.exporter)}
      ${partyHTML("Consignee", doc.consignee)}
      ${doc.notify_party ? partyHTML("Notify Party", doc.notify_party) : ""}
    </div>
    ${(doc.declaration || doc.certification) ? `<div class="declaration">${doc.declaration || doc.certification}</div>` : ""}
  </body></html>`;
}
