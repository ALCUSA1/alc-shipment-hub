import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle2, Circle, ArrowLeft, ArrowRight, Save, Shield, Truck, Package } from "lucide-react";

interface BookingDocumentReviewStepProps {
  shipment: any;
  documents: any[];
  services: any;
  financials: any[];
  cargo: any[];
  parties: any[];
  onBack: () => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  saving: boolean;
}

export function BookingDocumentReviewStep({
  shipment, documents, services, financials, cargo, parties, onBack, onSaveDraft, onContinue, saving,
}: BookingDocumentReviewStepProps) {
  const sellTotal = financials.filter(f => f.entry_type === "revenue").reduce((s, f) => s + (f.amount || 0), 0);
  const shipper = parties?.find(p => p.role === "shipper");
  const consignee = parties?.find(p => p.role === "consignee");

  const expectedDocs = [
    "Shipping Instruction (SI)",
    "House Bill of Lading (HBL)",
    "Commercial Invoice",
    "Packing List",
    ...(services?.customs_clearance ? ["AES Filing"] : []),
    ...(services?.insurance ? ["Insurance Certificate"] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left: Document preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" /> Document Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="si">
                <TabsList className="mb-4">
                  <TabsTrigger value="si" className="text-xs">SI</TabsTrigger>
                  <TabsTrigger value="hbl" className="text-xs">HBL</TabsTrigger>
                  <TabsTrigger value="invoice" className="text-xs">Invoice</TabsTrigger>
                </TabsList>
                <TabsContent value="si">
                  <div className="rounded-lg border bg-muted/30 p-6 min-h-[200px]">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Shipping Instruction Draft</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-xs text-muted-foreground">Shipper</p><p className="font-medium">{shipper?.company_name || "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Consignee</p><p className="font-medium">{consignee?.company_name || "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Origin</p><p className="font-medium">{shipment?.origin_port || "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Destination</p><p className="font-medium">{shipment?.destination_port || "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Commodity</p><p className="font-medium">{cargo?.[0]?.commodity || "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Weight</p><p className="font-medium">{cargo?.[0]?.gross_weight ? `${cargo[0].gross_weight} kg` : "—"}</p></div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="hbl">
                  <div className="rounded-lg border bg-muted/30 p-6 min-h-[200px]">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">House Bill of Lading Draft</p>
                    <p className="text-sm text-muted-foreground">HBL will be finalized after booking confirmation and carrier acknowledgment.</p>
                  </div>
                </TabsContent>
                <TabsContent value="invoice">
                  <div className="rounded-lg border bg-muted/30 p-6 min-h-[200px]">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Invoice Draft</p>
                    <div className="space-y-2">
                      {financials.filter(f => f.entry_type === "revenue").map(f => (
                        <div key={f.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{f.description}</span>
                          <span className="font-mono">${f.amount?.toLocaleString()}</span>
                        </div>
                      ))}
                      {financials.filter(f => f.entry_type === "revenue").length === 0 && (
                        <p className="text-sm text-muted-foreground">Pricing pending</p>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-sm">
                        <span>Total</span>
                        <span>${sellTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Expected Documents List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Expected Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expectedDocs.map(doc => (
                  <div key={doc} className="flex items-center gap-2 text-sm">
                    <Circle className="h-3 w-3 text-muted-foreground" />
                    <span>{doc}</span>
                    <Badge variant="secondary" className="ml-auto text-[9px]">Will generate</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-accent" /> Compliance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                {services?.customs_clearance ? <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                <span>Customs Clearance</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-accent" /> Services Selected
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {[
                { label: "Trucking", active: services?.trucking },
                { label: "Warehousing", active: services?.warehousing },
                { label: "Insurance", active: services?.insurance },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  {s.active ? <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className={s.active ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Due</span>
                <span className="text-accent">{sellTotal > 0 ? `$${sellTotal.toLocaleString()}` : "TBD"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onSaveDraft} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button variant="electric" onClick={onContinue}>
            Continue to Payment <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
