import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortSelector } from "@/components/shipment/PortSelector";
import { Separator } from "@/components/ui/separator";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import type { ValidationErrors } from "@/lib/wizard-validation";

interface Port { code: string; name: string; country: string; }
interface Company { id: string; company_name: string; }

export interface OverviewData {
  shipmentType: string;
  originPort: string;
  destinationPort: string;
  pickupLocation: string;
  deliveryLocation: string;
  companyId: string;
  incoterms: string;
}

interface OverviewStepProps {
  data: OverviewData;
  onChange: (data: OverviewData) => void;
  ports: Port[];
  companies: Company[];
  errors?: ValidationErrors;
}

const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-[10px] text-destructive mt-0.5">{error}</p>;
}

export function OverviewStep({ data, onChange, ports, companies, errors = {} }: OverviewStepProps) {
  const set = (field: keyof OverviewData, value: string) =>
    onChange({ ...data, [field]: value });

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Shipment Type <span className="text-destructive">*</span></Label>
          <Select value={data.shipmentType} onValueChange={(v) => set("shipmentType", v)}>
            <SelectTrigger className={`mt-1 ${errors.shipmentType ? "border-destructive" : ""}`}><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="export">Export</SelectItem>
              <SelectItem value="import">Import</SelectItem>
              <SelectItem value="cross_trade">Cross Trade</SelectItem>
            </SelectContent>
          </Select>
          <FieldError error={errors.shipmentType} />
        </div>
        <div>
          <Label>Customer (CRM)</Label>
          <Select value={data.companyId} onValueChange={(v) => set("companyId", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Origin Port <span className="text-destructive">*</span></Label>
          <div className={`mt-1 ${errors.originPort ? "[&>button]:border-destructive" : ""}`}>
            <PortSelector ports={ports} value={data.originPort} onValueChange={(v) => set("originPort", v)} placeholder="Select origin port" />
          </div>
          <FieldError error={errors.originPort} />
        </div>
        <div>
          <Label>Destination Port <span className="text-destructive">*</span></Label>
          <div className={`mt-1 ${errors.destinationPort ? "[&>button]:border-destructive" : ""}`}>
            <PortSelector ports={ports} value={data.destinationPort} onValueChange={(v) => set("destinationPort", v)} placeholder="Select destination port" />
          </div>
          <FieldError error={errors.destinationPort} />
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Incoterms</Label>
          <Select value={data.incoterms} onValueChange={(v) => set("incoterms", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {INCOTERMS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Pickup Location</Label>
          <div className="mt-1">
            <AddressAutocomplete
              value={data.pickupLocation}
              onChange={(v) => set("pickupLocation", v)}
              placeholder="Search pickup address..."
            />
          </div>
        </div>
        <div>
          <Label>Delivery Location</Label>
          <div className="mt-1">
            <AddressAutocomplete
              value={data.deliveryLocation}
              onChange={(v) => set("deliveryLocation", v)}
              placeholder="Search delivery address..."
            />
          </div>
        </div>
      </div>
    </>
  );
}
