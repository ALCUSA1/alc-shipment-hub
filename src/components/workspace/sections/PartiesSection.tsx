import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, ChevronDown, Building2, Save } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CrmCompanySelector } from "@/components/shared/CrmCompanySelector";
import { CountrySelector } from "@/components/shared/CountrySelector";
import type { ShipmentDataset, PartyInfo } from "@/lib/shipment-dataset";

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
  ein?: string | null;
  zip?: string | null;
}

interface Props {
  data: ShipmentDataset["parties"];
  onChange: (d: ShipmentDataset["parties"]) => void;
  autoFilledShipper?: boolean;
  companies?: CrmCompany[];
  onSaveToCrm?: (party: PartyInfo, type: string) => void;
}

function CompactPartyCard({
  label, party, onChange, autoFilled, defaultOpen = true, optional,
  companies, companyType, onCrmSelect, onSaveToCrm,
}: {
  label: string;
  party: PartyInfo;
  onChange: (p: PartyInfo) => void;
  autoFilled?: boolean;
  defaultOpen?: boolean;
  optional?: boolean;
  companies?: CrmCompany[];
  companyType?: "consignee" | "trucking";
  onCrmSelect?: (company: CrmCompany) => void;
  onSaveToCrm?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const set = (f: keyof PartyInfo, v: string) => onChange({ ...party, [f]: v });
  const hasSomeData = party.companyName || party.contactName;

  const handleCrmSelect = (company: CrmCompany | null) => {
    if (!company) return;
    onChange({
      companyName: company.company_name,
      contactName: "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      postalCode: company.zip || "",
      country: company.country || "",
      email: company.email || "",
      phone: company.phone || "",
      taxId: company.ein || "",
    });
    onCrmSelect?.(company);
  };

  return (
    <div className={cn("rounded-xl border transition-all", open ? "bg-card" : "bg-secondary/20")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">{label}</span>
          {optional && <span className="text-[9px] text-muted-foreground">Optional</span>}
          {autoFilled && (
            <Badge variant="outline" className="text-[9px] gap-0.5 text-accent border-accent/20 py-0 h-4">
              <Zap className="h-2 w-2" /> Profile
            </Badge>
          )}
          {!open && hasSomeData && (
            <span className="text-[11px] text-muted-foreground">· {party.companyName}</span>
          )}
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* CRM selector for applicable party types */}
              {companies && companyType && (
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">Select from CRM</Label>
                  <CrmCompanySelector
                    companies={companies}
                    companyType={companyType}
                    onSelect={handleCrmSelect}
                    label={`Search ${label} in CRM...`}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[11px] text-muted-foreground">Company</Label><Input className="mt-1 h-9 text-sm" value={party.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Company name" /></div>
                <div><Label className="text-[11px] text-muted-foreground">Contact</Label><Input className="mt-1 h-9 text-sm" value={party.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Full name" /></div>
              </div>
              <div><Label className="text-[11px] text-muted-foreground">Address</Label><Input className="mt-1 h-9 text-sm" value={party.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address" /></div>
              <div className="grid grid-cols-4 gap-2">
                <div><Label className="text-[10px] text-muted-foreground">City</Label><Input className="mt-1 h-8 text-xs" value={party.city} onChange={(e) => set("city", e.target.value)} /></div>
                <div><Label className="text-[10px] text-muted-foreground">State</Label><Input className="mt-1 h-8 text-xs" value={party.state} onChange={(e) => set("state", e.target.value)} /></div>
                <div><Label className="text-[10px] text-muted-foreground">Zip</Label><Input className="mt-1 h-8 text-xs" value={party.postalCode} onChange={(e) => set("postalCode", e.target.value)} /></div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Country</Label>
                  <div className="mt-1">
                    <CountrySelector
                      value={party.country}
                      onValueChange={(v) => set("country", v)}
                      triggerClassName="h-8 text-xs"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-[10px] text-muted-foreground">Email</Label><Input className="mt-1 h-8 text-xs" value={party.email} onChange={(e) => set("email", e.target.value)} placeholder="email@co.com" /></div>
                <div><Label className="text-[10px] text-muted-foreground">Phone</Label><Input className="mt-1 h-8 text-xs" value={party.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                <div><Label className="text-[10px] text-muted-foreground">Tax ID</Label><Input className="mt-1 h-8 text-xs" value={party.taxId} onChange={(e) => set("taxId", e.target.value)} /></div>
              </div>

              {/* Save to CRM prompt for manually entered data */}
              {onSaveToCrm && party.companyName && !autoFilled && (
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground">Save to CRM for reuse?</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-accent" onClick={onSaveToCrm}>
                    <Save className="h-2.5 w-2.5 mr-1" /> Save to CRM
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PartiesSection({ data, onChange, autoFilledShipper, companies = [], onSaveToCrm }: Props) {
  const setParty = (key: keyof typeof data, p: PartyInfo) => onChange({ ...data, [key]: p } as any);

  const handleSaveToCrm = (partyKey: string) => {
    const party = (data as any)[partyKey] as PartyInfo;
    onSaveToCrm?.(party, partyKey);
  };

  return (
    <section id="parties" className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-foreground tracking-tight">Trade Parties</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Core parties auto-populate B/L, Invoice, SLI, and Dock Receipt. Select from CRM or enter manually.</p>
      </div>

      <div className="space-y-3">
        <CompactPartyCard label="Shipper / Exporter" party={data.shipper} onChange={(p) => setParty("shipper", p)} autoFilled={autoFilledShipper} />
        <CompactPartyCard
          label="Consignee / Buyer"
          party={data.consignee}
          onChange={(p) => setParty("consignee", p)}
          defaultOpen={!data.consignee.companyName}
          companies={companies}
          companyType="consignee"
          onSaveToCrm={() => handleSaveToCrm("consignee")}
        />

        {/* Notify toggle */}
        <div className="flex items-center gap-2 px-1 py-1">
          <Checkbox id="notify-same" checked={data.notifyPartySameAsConsignee} onCheckedChange={(c) => onChange({ ...data, notifyPartySameAsConsignee: !!c, notifyParty: c ? { ...data.consignee } : data.notifyParty })} />
          <Label htmlFor="notify-same" className="text-[12px] cursor-pointer text-muted-foreground">Notify Party same as Consignee</Label>
        </div>
        {!data.notifyPartySameAsConsignee && (
          <CompactPartyCard label="Notify Party" party={data.notifyParty} onChange={(p) => setParty("notifyParty", p)} defaultOpen={false} />
        )}

        {/* Smart defaults — collapsed */}
        <div className="pt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2 px-1">Additional</p>

          <div className="flex items-center gap-2 px-1 py-1">
            <Checkbox id="booking-same" checked={data.bookingPartySameAsShipper} onCheckedChange={(c) => onChange({ ...data, bookingPartySameAsShipper: !!c })} />
            <Label htmlFor="booking-same" className="text-[12px] cursor-pointer text-muted-foreground">Booking Party = Shipper</Label>
          </div>
          {!data.bookingPartySameAsShipper && (
            <CompactPartyCard label="Booking Party" party={data.bookingParty} onChange={(p) => setParty("bookingParty", p)} defaultOpen={false} optional />
          )}

          <div className="flex items-center gap-2 px-1 py-1">
            <Checkbox id="billing-same" checked={data.billingPartySameAsShipper} onCheckedChange={(c) => onChange({ ...data, billingPartySameAsShipper: !!c })} />
            <Label htmlFor="billing-same" className="text-[12px] cursor-pointer text-muted-foreground">Billing Party = Shipper</Label>
          </div>
          {!data.billingPartySameAsShipper && (
            <CompactPartyCard label="Billing Party" party={data.billingParty} onChange={(p) => setParty("billingParty", p)} defaultOpen={false} optional />
          )}

          <div className="space-y-2 mt-2">
            <CompactPartyCard label="Customs Broker" party={data.customsBroker} onChange={(p) => setParty("customsBroker", p)} defaultOpen={false} optional />
            <CompactPartyCard
              label="Trucking Partner"
              party={data.truckingPartner}
              onChange={(p) => setParty("truckingPartner", p)}
              defaultOpen={false}
              optional
              companies={companies}
              companyType="trucking"
              onSaveToCrm={() => handleSaveToCrm("truckingPartner")}
            />
            <CompactPartyCard label="Warehouse Partner" party={data.warehousePartner} onChange={(p) => setParty("warehousePartner", p)} defaultOpen={false} optional />
          </div>
        </div>
      </div>
    </section>
  );
}
