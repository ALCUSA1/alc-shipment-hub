import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { CrmCompanySelector } from "@/components/shared/CrmCompanySelector";
import { Zap } from "lucide-react";

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

interface CrmCompany {
  id: string;
  company_name: string;
  company_type: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface PartiesStepProps {
  data: PartiesData;
  onChange: (data: PartiesData) => void;
  crmCompanies?: CrmCompany[];
  autoFilledShipper?: boolean;
}

function PartyCard({ label, party, onChange, description, autoFilled }: { label: string; party: PartyInfo; onChange: (p: PartyInfo) => void; description?: string; autoFilled?: boolean }) {
  const set = (field: keyof PartyInfo, val: string) => onChange({ ...party, [field]: val });
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{label}</h4>
          {description && <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {autoFilled && (
          <Badge variant="outline" className="text-[9px] gap-1 text-accent border-accent/30">
            <Zap className="h-2.5 w-2.5" /> Auto-filled
          </Badge>
        )}
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

export function PartiesStep({ data, onChange, crmCompanies = [], autoFilledShipper }: PartiesStepProps) {
  const [consigneeMode, setConsigneeMode] = useState<"crm" | "manual">(
    data.consignee.companyName ? "manual" : "crm"
  );
  const [truckingMode, setTruckingMode] = useState<"crm" | "manual">(
    data.truckingCompany ? "manual" : "crm"
  );

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

  const handleConsigneeCrmSelect = (company: CrmCompany | null) => {
    if (!company) {
      setParty("consignee", emptyParty());
      return;
    }
    const addr = [company.address, company.city, company.state, company.country].filter(Boolean).join(", ");
    setParty("consignee", {
      companyName: company.company_name,
      contactName: "",
      address: addr,
      email: company.email || "",
      phone: company.phone || "",
    });
    setConsigneeMode("manual");
  };

  const handleTruckingCrmSelect = (company: CrmCompany | null) => {
    if (!company) {
      onChange({ ...data, truckingCompany: "" });
      return;
    }
    onChange({ ...data, truckingCompany: company.company_name });
    setTruckingMode("manual");
  };

  const consigneeCompanies = crmCompanies.filter(
    (c) => c.company_type === "consignee" || c.company_type === "customer"
  );
  const truckingCompanies = crmCompanies.filter(
    (c) => c.company_type === "trucking" || c.company_type === "customer"
  );

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
          autoFilled={autoFilledShipper}
        />
        <div className="space-y-2">
          {crmCompanies.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Select from CRM</Label>
              <div className="mt-1">
                <CrmCompanySelector
                  companies={crmCompanies}
                  companyType="consignee"
                  onSelect={handleConsigneeCrmSelect}
                  onCreateNew={() => setConsigneeMode("manual")}
                  label="Select consignee from CRM..."
                />
              </div>
            </div>
          )}
          <PartyCard 
            label="Consignee / Buyer" 
            description="The party receiving the goods"
            party={data.consignee} 
            onChange={(p) => setParty("consignee", p)} 
          />
        </div>
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

      {/* Trucking - with CRM selector */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Trucking Company (Optional)</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">Select from CRM or enter manually</p>
        </div>
        {crmCompanies.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground">Select from CRM</Label>
            <div className="mt-1">
              <CrmCompanySelector
                companies={crmCompanies}
                companyType="trucking"
                onSelect={handleTruckingCrmSelect}
                onCreateNew={() => setTruckingMode("manual")}
                label="Select trucking company..."
              />
            </div>
          </div>
        )}
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
