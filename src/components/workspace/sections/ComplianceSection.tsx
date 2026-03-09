import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import type { ShipmentDataset } from "@/lib/shipment-dataset";

interface Props {
  data: ShipmentDataset["compliance"];
  onChange: (d: ShipmentDataset["compliance"]) => void;
  autoFilled?: boolean;
}

export function ComplianceSection({ data, onChange, autoFilled }: Props) {
  const set = (f: keyof typeof data, v: string) => onChange({ ...data, [f]: v });

  return (
    <section id="compliance" className="scroll-mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Compliance & AES</h2>
        <p className="text-xs text-muted-foreground mt-1">Export filing support, insurance, and regulatory data for SLI, AES/ITN, and Insurance Certificate.</p>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Export Filing (AES / SLI)</h4>
          {autoFilled && (
            <Badge variant="outline" className="text-[9px] gap-1 text-accent border-accent/30">
              <Zap className="h-2.5 w-2.5" /> Auto-filled
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">USPPI / Exporter Name</Label><Input className="mt-1 h-9 text-sm" value={data.exporterName} onChange={(e) => set("exporterName", e.target.value)} /></div>
          <div><Label className="text-xs">USPPI EIN</Label><Input className="mt-1 h-9 text-sm" value={data.exporterEin} onChange={(e) => set("exporterEin", e.target.value)} placeholder="XX-XXXXXXX" /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">AES Citation / Type</Label><Input className="mt-1 h-9 text-sm" value={data.aesType} onChange={(e) => set("aesType", e.target.value)} placeholder="e.g. NO EEI 30.37(a)" /></div>
          <div><Label className="text-xs">ITN Number</Label><Input className="mt-1 h-9 text-sm" value={data.itn} onChange={(e) => set("itn", e.target.value)} /></div>
          <div><Label className="text-xs">Filing Status</Label><Input className="mt-1 h-9 text-sm" value={data.filingStatus} onChange={(e) => set("filingStatus", e.target.value)} placeholder="e.g. Filed, Pending" /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">Export License</Label><Input className="mt-1 h-9 text-sm" value={data.exportLicense} onChange={(e) => set("exportLicense", e.target.value)} /></div>
          <div><Label className="text-xs">ECCN</Label><Input className="mt-1 h-9 text-sm" value={data.eccn} onChange={(e) => set("eccn", e.target.value)} /></div>
          <div><Label className="text-xs">Country of Ultimate Destination</Label><Input className="mt-1 h-9 text-sm" value={data.countryOfUltimateDestination} onChange={(e) => set("countryOfUltimateDestination", e.target.value)} /></div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Insurance</h4>
          {autoFilled && (
            <Badge variant="outline" className="text-[9px] gap-1 text-accent border-accent/30">
              <Zap className="h-2.5 w-2.5" /> Auto-filled
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label className="text-xs">Insurance Provider</Label><Input className="mt-1 h-9 text-sm" value={data.insuranceProvider} onChange={(e) => set("insuranceProvider", e.target.value)} /></div>
          <div><Label className="text-xs">Policy Number</Label><Input className="mt-1 h-9 text-sm" value={data.insurancePolicy} onChange={(e) => set("insurancePolicy", e.target.value)} /></div>
          <div><Label className="text-xs">Coverage Amount</Label><Input type="number" className="mt-1 h-9 text-sm" value={data.insuranceCoverage} onChange={(e) => set("insuranceCoverage", e.target.value)} /></div>
        </div>
      </div>
    </section>
  );
}
