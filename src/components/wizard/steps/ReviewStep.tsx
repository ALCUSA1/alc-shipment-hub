import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, CheckCircle2 } from "lucide-react";
import type { OverviewData } from "./OverviewStep";
import type { PartiesData } from "./PartiesStep";
import type { CargoData } from "./CargoStep";
import type { ComplianceData } from "./ComplianceStep";

interface ReviewStepProps {
  overview: OverviewData;
  parties: PartiesData;
  cargo: CargoData;
  compliance: ComplianceData;
  companies: { id: string; company_name: string }[];
}

const DOC_LABELS = [
  "Bill of Lading",
  "Commercial Invoice",
  "Packing List",
  "Certificate of Origin",
  "Shipper's Letter of Instruction",
  "Dock Receipt",
  "Insurance Certificate",
  "AES Filing / ITN",
];

function Row({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

export function ReviewStep({ overview, parties, cargo, compliance, companies }: ReviewStepProps) {
  const company = companies.find((c) => c.id === overview.companyId);
  const filledParties = [
    parties.shipper.companyName && "Shipper",
    parties.consignee.companyName && "Consignee",
    parties.notifyParty.companyName && "Notify Party",
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Shipment summary */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Shipment Overview</h4>
        <Row label="Type" value={overview.shipmentType || "Export"} />
        <Row label="Route" value={overview.originPort && overview.destinationPort ? `${overview.originPort} → ${overview.destinationPort}` : undefined} />
        <Row label="Incoterms" value={overview.incoterms} />
        <Row label="Customer" value={company?.company_name} />
        <Row label="Pickup" value={overview.pickupLocation} />
        <Row label="Delivery" value={overview.deliveryLocation} />
      </div>

      {/* Parties */}
      {filledParties.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Trade Parties</h4>
          <Row label="Shipper" value={parties.shipper.companyName} />
          <Row label="Consignee" value={parties.consignee.companyName} />
          <Row label="Notify Party" value={parties.notifyPartySameAsConsignee ? `Same as Consignee` : parties.notifyParty.companyName} />
          <Row label="Pickup Warehouse" value={parties.pickupWarehouse?.companyName} />
          <Row label="Trucking Company" value={typeof parties.truckingCompany === 'string' ? parties.truckingCompany : undefined} />
        </div>
      )}

      {/* Cargo */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Cargo & Container</h4>
        <Row label="Container" value={cargo.containerType ? `${cargo.containerType.toUpperCase()} × ${cargo.containerQuantity || 1}` : undefined} />
        <Row label="Commodity" value={cargo.commodity} />
        <Row label="HS Code" value={cargo.hsCode} />
        <Row label="Packages" value={cargo.numPackages ? `${cargo.numPackages} ${cargo.packageType || "units"}` : undefined} />
        <Row label="Weight" value={cargo.grossWeight ? `${cargo.grossWeight} kg` : undefined} />
        <Row label="Volume" value={cargo.volume ? `${cargo.volume} CBM` : undefined} />
        <Row label="Declared Value" value={cargo.totalValue ? `$${Number(cargo.totalValue).toLocaleString()}` : undefined} />
        <Row label="Country of Origin" value={cargo.countryOfOrigin} />
      </div>

      {/* Compliance */}
      {(compliance.exporterName || compliance.insuranceProvider) && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Compliance & Insurance</h4>
          <Row label="Exporter (USPPI)" value={compliance.exporterName} />
          <Row label="EIN" value={compliance.exporterEin} />
          <Row label="AES Citation" value={compliance.aesType} />
          <Row label="Insurance" value={compliance.insuranceProvider} />
          <Row label="Coverage" value={compliance.insuranceCoverage ? `$${Number(compliance.insuranceCoverage).toLocaleString()}` : undefined} />
        </div>
      )}

      <Separator />

      {/* Document generation preview */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-accent" />
          <h4 className="text-sm font-semibold text-foreground">Documents to Generate</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DOC_LABELS.map((doc) => (
            <div key={doc} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
              <span className="text-foreground">{doc}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          All 8 documents will be initialized with the details you've provided. You can finalize each on the shipment detail page.
        </p>
      </div>
    </div>
  );
}
