import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Ship, Plane, ArrowRight, Clock, MapPin, DollarSign, FileText, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface BookingSummaryPanelProps {
  shipment: any;
  financials: any[];
  cargo: any[];
  parties: any[];
  documents: any[];
  services: any;
}

export function BookingSummaryPanel({ shipment, financials, cargo, parties, documents, services }: BookingSummaryPanelProps) {
  const sellTotal = financials.filter(f => f.entry_type === "revenue").reduce((s, f) => s + (f.amount || 0), 0);
  const isAir = shipment?.mode === "air";
  const shipper = parties?.find(p => p.role === "shipper");
  const consignee = parties?.find(p => p.role === "consignee");
  const firstCargo = cargo?.[0];

  const readinessChecks = [
    { label: "Route", done: !!shipment?.origin_port && !!shipment?.destination_port },
    { label: "Cargo details", done: !!(firstCargo?.commodity || firstCargo?.gross_weight) },
    { label: "Shipper", done: !!shipper?.company_name },
    { label: "Consignee", done: !!consignee?.company_name },
  ];

  const completedCount = readinessChecks.filter(c => c.done).length;
  const readinessPercent = Math.round((completedCount / readinessChecks.length) * 100);

  return (
    <div className="space-y-4">
      {/* Route & Carrier */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {isAir ? <Plane className="h-4 w-4 text-accent" /> : <Ship className="h-4 w-4 text-accent" />}
            Shipment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            {shipment?.origin_port || "—"} <ArrowRight className="h-3.5 w-3.5 text-accent" /> {shipment?.destination_port || "—"}
          </div>
          {shipment?.carrier && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Ship className="h-3.5 w-3.5" /> {shipment.carrier}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">ETD</p>
              <p className="font-medium">{shipment?.etd ? format(new Date(shipment.etd), "MMM d, yyyy") : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">ETA</p>
              <p className="font-medium">{shipment?.eta ? format(new Date(shipment.eta), "MMM d, yyyy") : "—"}</p>
            </div>
          </div>
          {shipment?.transit_days && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {shipment.transit_days} days transit
            </div>
          )}
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Locked Price</span>
            <span className="text-lg font-bold text-accent">{sellTotal > 0 ? `$${sellTotal.toLocaleString()}` : "TBD"}</span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {shipment?.lifecycle_stage === "draft" ? "Draft" : shipment?.lifecycle_stage?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Draft"}
          </Badge>
        </CardContent>
      </Card>

      {/* Readiness Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Readiness</span>
            <span className="text-xs font-normal text-muted-foreground">{readinessPercent}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-secondary rounded-full h-1.5 mb-3">
            <div className="bg-accent h-1.5 rounded-full transition-all" style={{ width: `${readinessPercent}%` }} />
          </div>
          <div className="space-y-1.5">
            {readinessChecks.map(check => (
              <div key={check.label} className="flex items-center gap-2 text-xs">
                {check.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className={check.done ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-accent" /> Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-1.5">
              {documents.slice(0, 5).map(doc => (
                <div key={doc.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{doc.doc_type?.replace(/_/g, " ")}</span>
                  <Badge variant={doc.status === "completed" ? "default" : "secondary"} className="text-[9px]">
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Documents will generate as you fill details</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
