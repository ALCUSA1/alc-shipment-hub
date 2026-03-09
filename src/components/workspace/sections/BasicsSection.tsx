import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortSelector } from "@/components/shipment/PortSelector";
import type { ShipmentDataset, PartyInfo } from "@/lib/shipment-dataset";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Ship, Plane } from "lucide-react";

const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

interface Props {
  data: ShipmentDataset["basics"];
  onChange: (d: ShipmentDataset["basics"]) => void;
  ports: { code: string; name: string; country: string; type?: string }[];
  companies: { id: string; company_name: string }[];
  onCustomerSelected?: (company: any) => void;
}

export function BasicsSection({ data, onChange, ports, companies, onCustomerSelected }: Props) {
  const set = (field: keyof typeof data, v: string) => onChange({ ...data, [field]: v });
  const isAir = data.mode === "air";

  // Filter ports by mode
  const filteredPorts = ports.filter(p => {
    if (isAir) return (p as any).type === "air";
    return (p as any).type === "sea" || !(p as any).type;
  });

  // Fetch full company details when a customer is selected for auto-fill
  const { data: selectedCompany } = useQuery({
    queryKey: ["company-detail", data.companyId],
    queryFn: async () => {
      const { data: company } = await supabase
        .from("companies")
        .select("*, company_contacts(*)")
        .eq("id", data.companyId!)
        .single();
      return company;
    },
    enabled: !!data.companyId,
  });

  const handleCustomerChange = (v: string) => {
    const companyId = v === "none" ? "" : v;
    set("companyId", companyId);
    if (companyId && selectedCompany && onCustomerSelected) {
      onCustomerSelected(selectedCompany);
    }
  };

  // Trigger auto-fill when selectedCompany data arrives
  if (selectedCompany && data.companyId && onCustomerSelected) {
    Promise.resolve().then(() => onCustomerSelected(selectedCompany));
  }

  return (
    <section id="basics" className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-foreground tracking-tight">Shipment Basics</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Start with the essentials — everything else builds from here.</p>
      </div>

      <div className="space-y-5">
        {/* Mode + Type row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-[11px] text-muted-foreground">Transport Mode</Label>
            <div className="flex items-center gap-1 mt-1.5 p-1 bg-secondary rounded-lg">
              <button
                onClick={() => set("mode", "ocean")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all flex-1 justify-center ${
                  !isAir ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Ship className="h-3.5 w-3.5" />
                Ocean
              </button>
              <button
                onClick={() => set("mode", "air")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all flex-1 justify-center ${
                  isAir ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Plane className="h-3.5 w-3.5" />
                Air
              </button>
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Type</Label>
            <Select value={data.shipmentType} onValueChange={(v) => set("shipmentType", v)}>
              <SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="import">Import</SelectItem>
                <SelectItem value="cross_trade">Cross Trade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Customer</Label>
            <Select value={data.companyId || "none"} onValueChange={handleCustomerChange}>
              <SelectTrigger className="mt-1.5 h-10"><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No customer —</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ports/Airports — hero fields */}
        <div className="rounded-xl border bg-secondary/30 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] text-muted-foreground">{isAir ? "Airport of Origin" : "Origin Port"}</Label>
              <div className="mt-1.5">
                <PortSelector ports={filteredPorts} value={data.originPort} onValueChange={(v) => set("originPort", v)} placeholder={isAir ? "Select airport" : "Select origin"} mode={isAir ? "air" : "ocean"} />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">{isAir ? "Airport of Destination" : "Destination Port"}</Label>
              <div className="mt-1.5">
                <PortSelector ports={filteredPorts} value={data.destinationPort} onValueChange={(v) => set("destinationPort", v)} placeholder={isAir ? "Select airport" : "Select destination"} mode={isAir ? "air" : "ocean"} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] text-muted-foreground">Place of Receipt</Label>
              <Input placeholder="City or address" className="mt-1.5 h-9 text-sm bg-background" value={data.placeOfReceipt} onChange={(e) => set("placeOfReceipt", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Place of Delivery</Label>
              <Input placeholder="City or address" className="mt-1.5 h-9 text-sm bg-background" value={data.placeOfDelivery} onChange={(e) => set("placeOfDelivery", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Secondary row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-[11px] text-muted-foreground">Incoterms</Label>
            <Select value={data.incoterms} onValueChange={(v) => set("incoterms", v)}>
              <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {INCOTERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Ship Date</Label>
            <Input type="date" className="mt-1.5 h-9 text-sm" value={data.requestedShipDate} onChange={(e) => set("requestedShipDate", e.target.value)} />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Customer Ref</Label>
            <Input placeholder="PO / Ref #" className="mt-1.5 h-9 text-sm" value={data.customerReference} onChange={(e) => set("customerReference", e.target.value)} />
          </div>
        </div>
      </div>
    </section>
  );
}
