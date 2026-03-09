import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortSelector } from "@/components/shipment/PortSelector";
import type { ShipmentDataset } from "@/lib/shipment-dataset";

const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

interface Props {
  data: ShipmentDataset["basics"];
  onChange: (d: ShipmentDataset["basics"]) => void;
  ports: { code: string; name: string; country: string }[];
  companies: { id: string; company_name: string }[];
}

export function BasicsSection({ data, onChange, ports, companies }: Props) {
  const set = (field: keyof typeof data, v: string) => onChange({ ...data, [field]: v });

  return (
    <section id="basics" className="scroll-mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Shipment Basics</h2>
        <p className="text-xs text-muted-foreground mt-1">Essential booking-level information to get started quickly.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Shipment Type</Label>
          <Select value={data.shipmentType} onValueChange={(v) => set("shipmentType", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="export">Export</SelectItem>
              <SelectItem value="import">Import</SelectItem>
              <SelectItem value="cross_trade">Cross Trade</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Mode</Label>
          <Select value={data.mode} onValueChange={(v) => set("mode", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ocean">Ocean / Vessel</SelectItem>
              <SelectItem value="air">Air</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Customer (CRM)</Label>
          <Select value={data.companyId || "none"} onValueChange={(v) => set("companyId", v === "none" ? "" : v)}>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Origin Port</Label>
          <div className="mt-1">
            <PortSelector ports={ports} value={data.originPort} onValueChange={(v) => set("originPort", v)} placeholder="Select origin port" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Destination Port</Label>
          <div className="mt-1">
            <PortSelector ports={ports} value={data.destinationPort} onValueChange={(v) => set("destinationPort", v)} placeholder="Select destination port" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Incoterms</Label>
          <Select value={data.incoterms} onValueChange={(v) => set("incoterms", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {INCOTERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Requested Ship Date</Label>
          <Input type="date" className="mt-1" value={data.requestedShipDate} onChange={(e) => set("requestedShipDate", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Customer Reference</Label>
          <Input placeholder="PO / Ref #" className="mt-1" value={data.customerReference} onChange={(e) => set("customerReference", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Place of Receipt</Label>
          <Input placeholder="City or address" className="mt-1" value={data.placeOfReceipt} onChange={(e) => set("placeOfReceipt", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Place of Delivery</Label>
          <Input placeholder="City or address" className="mt-1" value={data.placeOfDelivery} onChange={(e) => set("placeOfDelivery", e.target.value)} />
        </div>
      </div>
    </section>
  );
}
