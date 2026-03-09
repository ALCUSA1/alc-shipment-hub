import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ShipmentDataset, PartyInfo } from "@/lib/shipment-dataset";

interface Props {
  data: ShipmentDataset["parties"];
  onChange: (d: ShipmentDataset["parties"]) => void;
  autoFilledShipper?: boolean;
}

function PartyCard({ label, description, party, onChange, autoFilled, collapsible, defaultOpen = true }: {
  label: string;
  description?: string;
  party: PartyInfo;
  onChange: (p: PartyInfo) => void;
  autoFilled?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const set = (f: keyof PartyInfo, v: string) => onChange({ ...party, [f]: v });
  const filled = party.companyName || party.contactName;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <button
        type="button"
        className="w-full flex items-center justify-between"
        onClick={() => collapsible && setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">{label}</h4>
          {autoFilled && (
            <Badge variant="outline" className="text-[9px] gap-1 text-accent border-accent/30">
              <Zap className="h-2.5 w-2.5" /> Auto-filled
            </Badge>
          )}
          {!open && filled && (
            <span className="text-[10px] text-muted-foreground ml-1">{party.companyName}</span>
          )}
        </div>
        {collapsible && (open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
      </button>
      {description && open && <p className="text-[10px] text-muted-foreground -mt-1">{description}</p>}

      {open && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Company Name</Label><Input className="mt-1 h-9 text-sm" value={party.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Company name" /></div>
            <div><Label className="text-xs">Contact Person</Label><Input className="mt-1 h-9 text-sm" value={party.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Full name" /></div>
          </div>
          <div><Label className="text-xs">Address</Label><Input className="mt-1 h-9 text-sm" value={party.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address" /></div>
          <div className="grid grid-cols-4 gap-3">
            <div><Label className="text-xs">City</Label><Input className="mt-1 h-9 text-sm" value={party.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div><Label className="text-xs">State</Label><Input className="mt-1 h-9 text-sm" value={party.state} onChange={(e) => set("state", e.target.value)} /></div>
            <div><Label className="text-xs">Postal Code</Label><Input className="mt-1 h-9 text-sm" value={party.postalCode} onChange={(e) => set("postalCode", e.target.value)} /></div>
            <div><Label className="text-xs">Country</Label><Input className="mt-1 h-9 text-sm" value={party.country} onChange={(e) => set("country", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Email</Label><Input className="mt-1 h-9 text-sm" value={party.email} onChange={(e) => set("email", e.target.value)} placeholder="email@company.com" /></div>
            <div><Label className="text-xs">Phone</Label><Input className="mt-1 h-9 text-sm" value={party.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" /></div>
            <div><Label className="text-xs">Tax ID / EIN</Label><Input className="mt-1 h-9 text-sm" value={party.taxId} onChange={(e) => set("taxId", e.target.value)} placeholder="XX-XXXXXXX" /></div>
          </div>
        </>
      )}
    </div>
  );
}

export function PartiesSection({ data, onChange, autoFilledShipper }: Props) {
  const setParty = (key: keyof typeof data, p: PartyInfo) => onChange({ ...data, [key]: p } as any);

  return (
    <section id="parties" className="scroll-mt-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Trade Parties</h2>
        <p className="text-xs text-muted-foreground mt-1">All involved parties — powers B/L, Invoice, SLI, and Dock Receipt automatically.</p>
      </div>

      {/* Core */}
      <PartyCard label="Shipper / Exporter" description="The party shipping the goods" party={data.shipper} onChange={(p) => setParty("shipper", p)} autoFilled={autoFilledShipper} />
      <PartyCard label="Consignee / Buyer" description="The party receiving the goods" party={data.consignee} onChange={(p) => setParty("consignee", p)} />

      <div className="flex items-center gap-2 px-1">
        <Checkbox id="notify-same" checked={data.notifyPartySameAsConsignee} onCheckedChange={(c) => onChange({ ...data, notifyPartySameAsConsignee: !!c, notifyParty: c ? { ...data.consignee } : data.notifyParty })} />
        <Label htmlFor="notify-same" className="text-sm cursor-pointer">Notify Party same as Consignee</Label>
      </div>
      {!data.notifyPartySameAsConsignee && (
        <PartyCard label="Notify Party" party={data.notifyParty} onChange={(p) => setParty("notifyParty", p)} />
      )}

      {/* Extended parties — collapsible */}
      <p className="text-xs text-muted-foreground font-medium pt-2">Additional Parties (Optional)</p>

      <div className="flex items-center gap-2 px-1">
        <Checkbox id="booking-same" checked={data.bookingPartySameAsShipper} onCheckedChange={(c) => onChange({ ...data, bookingPartySameAsShipper: !!c, bookingParty: c ? { ...data.shipper } : data.bookingParty })} />
        <Label htmlFor="booking-same" className="text-sm cursor-pointer">Booking Party same as Shipper</Label>
      </div>
      {!data.bookingPartySameAsShipper && (
        <PartyCard label="Booking Party" party={data.bookingParty} onChange={(p) => setParty("bookingParty", p)} collapsible defaultOpen={false} />
      )}

      <div className="flex items-center gap-2 px-1">
        <Checkbox id="billing-same" checked={data.billingPartySameAsShipper} onCheckedChange={(c) => onChange({ ...data, billingPartySameAsShipper: !!c, billingParty: c ? { ...data.shipper } : data.billingParty })} />
        <Label htmlFor="billing-same" className="text-sm cursor-pointer">Billing Party same as Shipper</Label>
      </div>
      {!data.billingPartySameAsShipper && (
        <PartyCard label="Billing Party" party={data.billingParty} onChange={(p) => setParty("billingParty", p)} collapsible defaultOpen={false} />
      )}

      <PartyCard label="Customs Broker" party={data.customsBroker} onChange={(p) => setParty("customsBroker", p)} collapsible defaultOpen={false} />
      <PartyCard label="Trucking Partner" party={data.truckingPartner} onChange={(p) => setParty("truckingPartner", p)} collapsible defaultOpen={false} />
      <PartyCard label="Warehouse Partner" party={data.warehousePartner} onChange={(p) => setParty("warehousePartner", p)} collapsible defaultOpen={false} />
    </section>
  );
}
