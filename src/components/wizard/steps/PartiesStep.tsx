import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export interface PartyInfo {
  companyName: string;
  contactName: string;
  address: string;
  email: string;
  phone: string;
}

export interface PartiesData {
  shipper: PartyInfo;
  consignee: PartyInfo;
  notifyParty: PartyInfo;
  forwarder: PartyInfo;
  truckingCompany: PartyInfo;
  warehouse: PartyInfo;
}

export const emptyParty = (): PartyInfo => ({ companyName: "", contactName: "", address: "", email: "", phone: "" });

interface PartiesStepProps {
  data: PartiesData;
  onChange: (data: PartiesData) => void;
}

function PartyCard({ label, party, onChange }: { label: string; party: PartyInfo; onChange: (p: PartyInfo) => void }) {
  const set = (field: keyof PartyInfo, val: string) => onChange({ ...party, [field]: val });
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <h4 className="text-sm font-semibold text-foreground">{label}</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Company Name</Label>
          <Input placeholder="Company name" className="mt-1 h-9 text-sm" value={party.companyName} onChange={(e) => set("companyName", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Contact Person</Label>
          <Input placeholder="Full name" className="mt-1 h-9 text-sm" value={party.contactName} onChange={(e) => set("contactName", e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Address</Label>
        <Input placeholder="Full address" className="mt-1 h-9 text-sm" value={party.address} onChange={(e) => set("address", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Email</Label>
          <Input placeholder="email@company.com" className="mt-1 h-9 text-sm" value={party.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input placeholder="+1 (555) 000-0000" className="mt-1 h-9 text-sm" value={party.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

export function PartiesStep({ data, onChange }: PartiesStepProps) {
  const setParty = (key: keyof PartiesData, party: PartyInfo) =>
    onChange({ ...data, [key]: party });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Complete party details to auto-populate your Bill of Lading, Commercial Invoice, Shipper's Letter of Instruction, and other trade documents.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PartyCard label="Shipper / Exporter" party={data.shipper} onChange={(p) => setParty("shipper", p)} />
        <PartyCard label="Consignee / Buyer" party={data.consignee} onChange={(p) => setParty("consignee", p)} />
      </div>
      <PartyCard label="Notify Party" party={data.notifyParty} onChange={(p) => setParty("notifyParty", p)} />
      <Separator />
      <p className="text-xs text-muted-foreground font-medium">Service Providers (optional)</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PartyCard label="Forwarder" party={data.forwarder} onChange={(p) => setParty("forwarder", p)} />
        <PartyCard label="Trucking Company" party={data.truckingCompany} onChange={(p) => setParty("truckingCompany", p)} />
        <PartyCard label="Warehouse" party={data.warehouse} onChange={(p) => setParty("warehouse", p)} />
      </div>
    </div>
  );
}
