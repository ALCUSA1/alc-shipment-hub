import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortSelector } from "@/components/shipment/PortSelector";
import { Separator } from "@/components/ui/separator";

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
}

const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

export function OverviewStep({ data, onChange, ports, companies }: OverviewStepProps) {
  const set = (field: keyof OverviewData, value: string) =>
    onChange({ ...data, [field]: value });

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Shipment Type</Label>
          <Select value={data.shipmentType} onValueChange={(v) => set("shipmentType", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="export">Export</SelectItem>
              <SelectItem value="import">Import</SelectItem>
              <SelectItem value="cross_trade">Cross Trade</SelectItem>
            </SelectContent>
          </Select>
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
          <Label>Origin Port</Label>
          <div className="mt-1">
            <PortSelector ports={ports} value={data.originPort} onValueChange={(v) => set("originPort", v)} placeholder="Select origin port" />
          </div>
        </div>
        <div>
          <Label>Destination Port</Label>
          <div className="mt-1">
            <PortSelector ports={ports} value={data.destinationPort} onValueChange={(v) => set("destinationPort", v)} placeholder="Select destination port" />
          </div>
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
          <Input placeholder="Full address" className="mt-1" value={data.pickupLocation} onChange={(e) => set("pickupLocation", e.target.value)} />
        </div>
        <div>
          <Label>Delivery Location</Label>
          <Input placeholder="Full address" className="mt-1" value={data.deliveryLocation} onChange={(e) => set("deliveryLocation", e.target.value)} />
        </div>
      </div>
    </>
  );
}
