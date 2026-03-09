import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { CargoLine, ContainerLine } from "@/lib/shipment-dataset";
import { emptyCargoLine, emptyContainerLine } from "@/lib/shipment-dataset";

const CONTAINER_TYPES = [
  { value: "20gp", label: "20' GP" },
  { value: "40gp", label: "40' GP" },
  { value: "40hc", label: "40' HC" },
  { value: "45hc", label: "45' HC" },
  { value: "20rf", label: "20' Reefer" },
  { value: "40rf", label: "40' Reefer" },
  { value: "20ot", label: "20' Open Top" },
  { value: "40ot", label: "40' Open Top" },
  { value: "20fr", label: "20' Flat Rack" },
  { value: "40fr", label: "40' Flat Rack" },
];

const PACKAGE_TYPES = ["Carton", "Pallet", "Crate", "Drum", "Bag", "Bundle", "Roll", "Bale"];

interface Props {
  cargoLines: CargoLine[];
  containers: ContainerLine[];
  onCargoChange: (lines: CargoLine[]) => void;
  onContainerChange: (lines: ContainerLine[]) => void;
}

export function CargoSection({ cargoLines, containers, onCargoChange, onContainerChange }: Props) {
  const updateCargo = (idx: number, f: keyof CargoLine, v: any) => {
    const next = [...cargoLines];
    (next[idx] as any)[f] = v;
    onCargoChange(next);
  };
  const updateContainer = (idx: number, f: keyof ContainerLine, v: string) => {
    const next = [...containers];
    (next[idx] as any)[f] = v;
    onContainerChange(next);
  };

  return (
    <section id="cargo" className="scroll-mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Cargo & Containers</h2>
        <p className="text-xs text-muted-foreground mt-1">Feeds Packing List, Commercial Invoice, Certificate of Origin, and B/L.</p>
      </div>

      {/* Containers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Containers</h4>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => onContainerChange([...containers, emptyContainerLine()])}>
            <Plus className="h-3 w-3 mr-1" /> Add Container
          </Button>
        </div>
        {containers.map((c, i) => (
          <div key={c.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Container {i + 1}</span>
              {containers.length > 1 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => onContainerChange(containers.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Container Type</Label>
                <Select value={c.containerType} onValueChange={(v) => updateContainer(i, "containerType", v)}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CONTAINER_TYPES.map((ct) => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Quantity</Label><Input type="number" className="mt-1 h-9 text-sm" value={c.quantity} onChange={(e) => updateContainer(i, "quantity", e.target.value)} /></div>
              <div><Label className="text-xs">Container #</Label><Input className="mt-1 h-9 text-sm" value={c.containerNumber} onChange={(e) => updateContainer(i, "containerNumber", e.target.value)} placeholder="If known" /></div>
              <div><Label className="text-xs">Seal #</Label><Input className="mt-1 h-9 text-sm" value={c.sealNumber} onChange={(e) => updateContainer(i, "sealNumber", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">VGM (kg)</Label><Input type="number" className="mt-1 h-9 text-sm" value={c.vgm} onChange={(e) => updateContainer(i, "vgm", e.target.value)} /></div>
              <div><Label className="text-xs">Reefer Temp</Label><Input className="mt-1 h-9 text-sm" value={c.reeferTemp} onChange={(e) => updateContainer(i, "reeferTemp", e.target.value)} placeholder="e.g. -18°C" /></div>
              <div><Label className="text-xs">OOG Dimensions</Label><Input className="mt-1 h-9 text-sm" value={c.oogDimensions} onChange={(e) => updateContainer(i, "oogDimensions", e.target.value)} placeholder="L×W×H" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Cargo Lines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Cargo Details</h4>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => onCargoChange([...cargoLines, emptyCargoLine()])}>
            <Plus className="h-3 w-3 mr-1" /> Add Cargo Line
          </Button>
        </div>
        {cargoLines.map((c, i) => (
          <div key={c.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Cargo Line {i + 1}</span>
              {cargoLines.length > 1 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => onCargoChange(cargoLines.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div><Label className="text-xs">Commodity Description</Label><Input className="mt-1 h-9 text-sm" value={c.commodity} onChange={(e) => updateCargo(i, "commodity", e.target.value)} placeholder="e.g. Consumer Electronics — Laptops" /></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><Label className="text-xs">HS Code</Label><Input className="mt-1 h-9 text-sm" value={c.hsCode} onChange={(e) => updateCargo(i, "hsCode", e.target.value)} placeholder="8471.30" /></div>
              <div><Label className="text-xs">HTS Code</Label><Input className="mt-1 h-9 text-sm" value={c.htsCode} onChange={(e) => updateCargo(i, "htsCode", e.target.value)} /></div>
              <div><Label className="text-xs">Schedule B</Label><Input className="mt-1 h-9 text-sm" value={c.scheduleBCode} onChange={(e) => updateCargo(i, "scheduleBCode", e.target.value)} /></div>
              <div><Label className="text-xs">Country of Origin</Label><Input className="mt-1 h-9 text-sm" value={c.countryOfOrigin} onChange={(e) => updateCargo(i, "countryOfOrigin", e.target.value)} placeholder="US" /></div>
            </div>
            <div><Label className="text-xs">Marks & Numbers</Label><Input className="mt-1 h-9 text-sm" value={c.marksAndNumbers} onChange={(e) => updateCargo(i, "marksAndNumbers", e.target.value)} placeholder="Shipping marks" /></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><Label className="text-xs"># Packages</Label><Input type="number" className="mt-1 h-9 text-sm" value={c.numPackages} onChange={(e) => updateCargo(i, "numPackages", e.target.value)} /></div>
              <div>
                <Label className="text-xs">Package Type</Label>
                <Select value={c.packageType} onValueChange={(v) => updateCargo(i, "packageType", v)}>
                  <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PACKAGE_TYPES.map((p) => <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Gross Wt (kg)</Label><Input type="number" className="mt-1 h-9 text-sm" value={c.grossWeight} onChange={(e) => updateCargo(i, "grossWeight", e.target.value)} /></div>
              <div><Label className="text-xs">Net Wt (kg)</Label><Input type="number" className="mt-1 h-9 text-sm" value={c.netWeight} onChange={(e) => updateCargo(i, "netWeight", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Volume (CBM)</Label><Input type="number" className="mt-1 h-9 text-sm" value={c.volume} onChange={(e) => updateCargo(i, "volume", e.target.value)} /></div>
              <div><Label className="text-xs">Dimensions</Label><Input className="mt-1 h-9 text-sm" value={c.dimensions} onChange={(e) => updateCargo(i, "dimensions", e.target.value)} placeholder="L×W×H cm" /></div>
              <div className="flex items-end gap-2 pb-1">
                <Checkbox checked={c.dangerousGoods} onCheckedChange={(v) => updateCargo(i, "dangerousGoods", !!v)} id={`dg-${i}`} />
                <Label htmlFor={`dg-${i}`} className="text-xs cursor-pointer">Dangerous Goods</Label>
              </div>
            </div>
            {c.dangerousGoods && (
              <div><Label className="text-xs">Special Instructions</Label><Textarea className="mt-1 text-sm" rows={2} value={c.specialInstructions} onChange={(e) => updateCargo(i, "specialInstructions", e.target.value)} placeholder="UN number, class, packing group..." /></div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
