import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

export interface ComplianceData {
  exporterEin: string;
  exporterName: string;
  aesType: string;
  exportLicense: string;
  insuranceProvider: string;
  insurancePolicy: string;
  insuranceCoverage: string;
}

interface ComplianceStepProps {
  data: ComplianceData;
  onChange: (data: ComplianceData) => void;
  autoFilled?: boolean;
}

export function ComplianceStep({ data, onChange, autoFilled }: ComplianceStepProps) {
  const set = (field: keyof ComplianceData, value: string) =>
    onChange({ ...data, [field]: value });

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Export compliance and insurance details for AES filing, Shipper's Letter of Instruction, and Insurance Certificate.
      </p>

      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Export Compliance (AES / SLI)</h4>
          {autoFilled && (
            <Badge variant="outline" className="text-[9px] gap-1 text-accent border-accent/30">
              <Zap className="h-2.5 w-2.5" /> Auto-filled from profile
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Exporter Name (USPPI)</Label>
            <Input placeholder="Legal entity name" className="mt-1 h-9 text-sm" value={data.exporterName} onChange={(e) => set("exporterName", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Exporter EIN / Tax ID</Label>
            <Input placeholder="XX-XXXXXXX" className="mt-1 h-9 text-sm" value={data.exporterEin} onChange={(e) => set("exporterEin", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">AES Type / Citation</Label>
            <Input placeholder="e.g. NO EEI 30.37(a)" className="mt-1 h-9 text-sm" value={data.aesType} onChange={(e) => set("aesType", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Export License (if applicable)</Label>
            <Input placeholder="License number" className="mt-1 h-9 text-sm" value={data.exportLicense} onChange={(e) => set("exportLicense", e.target.value)} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Insurance Certificate</h4>
          {autoFilled && (
            <Badge variant="outline" className="text-[9px] gap-1 text-accent border-accent/30">
              <Zap className="h-2.5 w-2.5" /> Auto-filled from profile
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Insurance Provider</Label>
            <Input placeholder="Company name" className="mt-1 h-9 text-sm" value={data.insuranceProvider} onChange={(e) => set("insuranceProvider", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Policy Number</Label>
            <Input placeholder="Policy #" className="mt-1 h-9 text-sm" value={data.insurancePolicy} onChange={(e) => set("insurancePolicy", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Coverage Amount (USD)</Label>
            <Input type="number" placeholder="e.g. 50000" className="mt-1 h-9 text-sm" value={data.insuranceCoverage} onChange={(e) => set("insuranceCoverage", e.target.value)} />
          </div>
        </div>
      </div>
    </>
  );
}
