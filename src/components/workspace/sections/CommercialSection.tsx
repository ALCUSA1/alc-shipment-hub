import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { ShipmentDataset, ChargeLine } from "@/lib/shipment-dataset";
import { emptyChargeLine } from "@/lib/shipment-dataset";

const CHARGE_TYPES = [
  "freight", "baf", "caf", "thc", "origin_charges", "destination_charges",
  "documentation", "customs", "insurance", "surcharge", "tax", "other",
];

interface Props {
  data: ShipmentDataset["commercial"];
  charges: ChargeLine[];
  onChange: (d: ShipmentDataset["commercial"]) => void;
  onChargesChange: (c: ChargeLine[]) => void;
}

export function CommercialSection({ data, charges, onChange, onChargesChange }: Props) {
  const set = (f: keyof typeof data, v: string) => onChange({ ...data, [f]: v });

  const updateCharge = (idx: number, f: keyof ChargeLine, v: string) => {
    const next = [...charges];
    (next[idx] as any)[f] = v;
    onChargesChange(next);
  };

  return (
    <section id="commercial" className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-foreground tracking-tight">Financials & Invoice</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Invoice data, values, and charge breakdown for Commercial Invoice and customs.</p>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-3">
          <div><Label className="text-[11px] text-muted-foreground">Invoice #</Label><Input className="mt-1.5 h-9 text-sm" value={data.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} placeholder="INV-001" /></div>
          <div><Label className="text-[11px] text-muted-foreground">Invoice Date</Label><Input type="date" className="mt-1.5 h-9 text-sm" value={data.invoiceDate} onChange={(e) => set("invoiceDate", e.target.value)} /></div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Currency</Label>
            <Select value={data.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem><SelectItem value="CNY">CNY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-[11px] text-muted-foreground">Terms</Label><Input className="mt-1.5 h-9 text-sm" value={data.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} placeholder="Net 30" /></div>
        </div>

        <div className="rounded-xl border bg-secondary/20 p-4">
          <div className="grid grid-cols-3 gap-4">
            <div><Label className="text-[11px] text-muted-foreground">Total Value</Label><Input type="number" className="mt-1 h-9 text-sm bg-background" value={data.totalShipmentValue} onChange={(e) => set("totalShipmentValue", e.target.value)} placeholder="0.00" /></div>
            <div><Label className="text-[11px] text-muted-foreground">Insurance Value</Label><Input type="number" className="mt-1 h-9 text-sm bg-background" value={data.insuranceValue} onChange={(e) => set("insuranceValue", e.target.value)} placeholder="0.00" /></div>
            <div><Label className="text-[11px] text-muted-foreground">Declared Value</Label><Input type="number" className="mt-1 h-9 text-sm bg-background" value={data.declaredValue} onChange={(e) => set("declaredValue", e.target.value)} placeholder="0.00" /></div>
          </div>
        </div>

        {/* Charges */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Charges</span>
            <Button variant="ghost" size="sm" className="text-[11px] h-7 text-accent" onClick={() => onChargesChange([...charges, emptyChargeLine()])}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {charges.length === 0 && (
            <div className="rounded-xl border border-dashed py-4 text-center">
              <p className="text-[11px] text-muted-foreground">No charges yet</p>
            </div>
          )}
          {charges.map((c, i) => (
            <div key={c.id} className="rounded-lg border bg-card p-3 mb-2 grid grid-cols-5 gap-2 items-end">
              <div><Label className="text-[10px] text-muted-foreground">Description</Label><Input className="mt-1 h-8 text-xs" value={c.description} onChange={(e) => updateCharge(i, "description", e.target.value)} placeholder="Ocean Freight" /></div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Type</Label>
                <Select value={c.chargeType} onValueChange={(v) => updateCharge(i, "chargeType", v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHARGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-[10px] text-muted-foreground">Amount</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.amount} onChange={(e) => updateCharge(i, "amount", e.target.value)} /></div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Payer</Label>
                <Select value={c.whoPays} onValueChange={(v) => updateCharge(i, "whoPays", v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shipper">Shipper</SelectItem>
                    <SelectItem value="consignee">Consignee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button onClick={() => onChargesChange(charges.filter((_, j) => j !== i))} className="h-8 flex items-center justify-center text-muted-foreground/40 hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
