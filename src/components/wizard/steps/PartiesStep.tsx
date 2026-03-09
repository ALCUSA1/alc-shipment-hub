import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";

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
  notifyPartySameAsConsignee: boolean;
  truckingCompany: string;
  pickupWarehouse: PartyInfo;
}

export const emptyParty = (): PartyInfo => ({ companyName: "", contactName: "", address: "", email: "", phone: "" });

interface PartiesStepProps {
  data: PartiesData;
  onChange: (data: PartiesData) => void;
}

function PartyCard({ label, party, onChange, description }: { label: string; party: PartyInfo; onChange: (p: PartyInfo) => void; description?: string }) {
  const set = (field: keyof PartyInfo, val: string) => onChange({ ...party, [field]: val });
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
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
  const setParty = (key: keyof Pick<PartiesData, 'shipper' | 'consignee' | 'notifyParty' | 'pickupWarehouse'>, party: PartyInfo) =>
    onChange({ ...data, [key]: party });

  // Sync notify party with consignee when checkbox is checked
  useEffect(() => {
    if (data.notifyPartySameAsConsignee) {
      onChange({ ...data, notifyParty: { ...data.consignee } });
    }
  }, [data.consignee, data.notifyPartySameAsConsignee]);

  const handleNotifyToggle = (checked: boolean) => {
    onChange({
      ...data,
      notifyPartySameAsConsignee: checked,
      notifyParty: checked ? { ...data.consignee } : emptyParty(),
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Complete party details to auto-populate your Bill of Lading, Commercial Invoice, Shipper's Letter of Instruction, and other trade documents.
      </p>
      
      {/* Core Trade Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PartyCard 
          label="Shipper / Exporter" 
          description="The party shipping the goods"
          party={data.shipper} 
          onChange={(p) => setParty("shipper", p)} 
        />
        <PartyCard 
          label="Consignee / Buyer" 
          description="The party receiving the goods"
          party={data.consignee} 
          onChange={(p) => setParty("consignee", p)} 
        />
      </div>

      {/* Notify Party with toggle */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="notify-same" 
            checked={data.notifyPartySameAsConsignee} 
            onCheckedChange={handleNotifyToggle}
          />
          <Label htmlFor="notify-same" className="text-sm font-medium cursor-pointer">
            Notify Party same as Consignee
          </Label>
        </div>
        {!data.notifyPartySameAsConsignee && (
          <PartyCard 
            label="Notify Party" 
            description="Party to be notified upon cargo arrival (optional)"
            party={data.notifyParty} 
            onChange={(p) => setParty("notifyParty", p)} 
          />
        )}
      </div>

      <Separator />

      {/* Cargo Pickup Location */}
      <PartyCard 
        label="Cargo Pickup Location (Warehouse)" 
        description="Where the cargo will be picked up from"
        party={data.pickupWarehouse} 
        onChange={(p) => setParty("pickupWarehouse", p)} 
      />

      <Separator />

      {/* Trucking - simplified */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Trucking Company (Optional)</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">Enter a trucking company name to request a rate quote</p>
        </div>
        <div>
          <Label className="text-xs">Company Name</Label>
          <Input 
            placeholder="e.g. ABC Trucking Inc." 
            className="mt-1 h-9 text-sm" 
            value={data.truckingCompany} 
            onChange={(e) => onChange({ ...data, truckingCompany: e.target.value })} 
          />
        </div>
      </div>
    </div>
  );
}
