import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
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
    <section id="commercial" className="scroll-mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Commercial & Invoice</h2>
        <p className="text-xs text-muted-foreground mt-1">Financial data for Commercial Invoice, customs declarations, and charge breakdown.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><Label className="text-xs">Invoice Number</Label><Input className="mt-1" value={data.invoiceNumber} onChange={(e) => set("invoiceNumber", e.target.value)} placeholder="INV-001" /></div>
        <div><Label className="text-xs">Invoice Date</Label><Input type="date" className="mt-1" value={data.invoiceDate} onChange={(e) => set("invoiceDate", e.target.value)} /></div>
        <div>
          <Label className="text-xs">Currency</Label>
          <Select value={data.currency} onValueChange={(v) => set("currency", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="CNY">CNY</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Payment Terms</Label><Input className="mt-1" value={data.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} placeholder="Net 30" /></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><Label className="text-xs">Total Shipment Value</Label><Input type="number" className="mt-1" value={data.totalShipmentValue} onChange={(e) => set("totalShipmentValue", e.target.value)} placeholder="0.00" /></div>
        <div><Label className="text-xs">Insurance Value</Label><Input type="number" className="mt-1" value={data.insuranceValue} onChange={(e) => set("insuranceValue", e.target.value)} placeholder="0.00" /></div>
        <div><Label className="text-xs">Declared Value</Label><Input type="number" className="mt-1" value={data.declaredValue} onChange={(e) => set("declaredValue", e.target.value)} placeholder="0.00" /></div>
      </div>

      {/* Dynamic Charges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Charge Lines</h4>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => onChargesChange([...charges, emptyChargeLine()])}>
            <Plus className="h-3 w-3 mr-1" /> Add Charge
          </Button>
        </div>
        {charges.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed rounded-lg">
            No charge lines added yet. Click "Add Charge" to add freight, surcharges, etc.
          </p>
        )}
        {charges.map((c, i) => (
          <div key={c.id} className="rounded-lg border bg-card p-3 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div><Label className="text-xs">Description</Label><Input className="mt-1 h-9 text-sm" value={c.description} onChange={(e) => updateCharge(i, "description", e.target.value)} placeholder="e.g. Ocean Freight" /></div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={c.chargeType} onValueChange={(v) => updateCharge(i, "chargeType", v)}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{CHARGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Amount</Label><Input type="number" className="mt-1 h-9 text-sm" value={c.amount} onChange={(e) => updateCharge(i, "amount", e.target.value)} /></div>
            <div>
              <Label className="text-xs">Who Pays</Label>
              <Select value={c.whoPays} onValueChange={(v) => updateCharge(i, "whoPays", v)}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shipper">Shipper</SelectItem>
                  <SelectItem value="consignee">Consignee</SelectItem>
                  <SelectItem value="third_party">Third Party</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" className="h-9 text-destructive" onClick={() => onChargesChange(charges.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
