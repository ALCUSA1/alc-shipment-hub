import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";
import type { CargoLine, ContainerLine } from "@/lib/shipment-dataset";
import { emptyCargoLine, emptyContainerLine } from "@/lib/shipment-dataset";

const CONTAINER_TYPES = [
  { value: "20gp", label: "20' GP" }, { value: "40gp", label: "40' GP" },
  { value: "40hc", label: "40' HC" }, { value: "45hc", label: "45' HC" },
  { value: "20rf", label: "20' Reefer" }, { value: "40rf", label: "40' Reefer" },
  { value: "20ot", label: "20' Open Top" }, { value: "40ot", label: "40' Open Top" },
  { value: "20fr", label: "20' Flat Rack" }, { value: "40fr", label: "40' Flat Rack" },
];

const PACKAGE_TYPES = ["Carton", "Pallet", "Crate", "Drum", "Bag", "Bundle", "Roll", "Bale"];

const RATE_CLASSES = [
  { value: "M", label: "M — Minimum" },
  { value: "N", label: "N — Normal" },
  { value: "Q45", label: "Q — 45 kg+" },
  { value: "Q100", label: "Q — 100 kg+" },
  { value: "Q250", label: "Q — 250 kg+" },
  { value: "Q500", label: "Q — 500 kg+" },
  { value: "Q1000", label: "Q — 1000 kg+" },
  { value: "C", label: "C — Specific Commodity" },
  { value: "U", label: "U — ULD" },
];

interface Props {
  cargoLines: CargoLine[];
  containers: ContainerLine[];
  onCargoChange: (lines: CargoLine[]) => void;
  onContainerChange: (lines: ContainerLine[]) => void;
  mode?: string;
}

export function CargoSection({ cargoLines, containers, onCargoChange, onContainerChange, mode = "ocean" }: Props) {
  const isAir = mode === "air";

  const updateCargo = (idx: number, f: keyof CargoLine, v: any) => {
    const next = [...cargoLines];
    (next[idx] as any)[f] = v;

    // Auto-calculate chargeable weight for air
    if (isAir && (f === "grossWeight" || f === "volume" || f === "dimensions")) {
      const line = next[idx];
      const gross = parseFloat(line.grossWeight) || 0;
      // Volumetric: L*W*H / 6000 (dimensions format: LxWxH in cm)
      let volumetric = 0;
      if (line.dimensions) {
        const parts = line.dimensions.toLowerCase().split(/[x×*]/).map(s => parseFloat(s.trim()));
        if (parts.length === 3 && parts.every(p => !isNaN(p))) {
          const pieces = parseInt(line.pieces) || 1;
          volumetric = (parts[0] * parts[1] * parts[2] * pieces) / 6000;
        }
      } else if (line.volume) {
        // CBM to volumetric: CBM * 166.67 for air
        volumetric = (parseFloat(line.volume) || 0) * 166.67;
      }
      line.chargeableWeight = Math.max(gross, volumetric).toFixed(1);
    }

    onCargoChange(next);
  };

  const updateContainer = (idx: number, f: keyof ContainerLine, v: string) => {
    const next = [...containers];
    (next[idx] as any)[f] = v;
    onContainerChange(next);
  };

  return (
    <section id="cargo" className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-foreground tracking-tight">
          {isAir ? "Cargo & Pieces" : "Cargo & Containers"}
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isAir
            ? "Cargo details for Air Waybill, packing list, and customs filing."
            : "Packing List, Invoice, Certificate of Origin, and B/L data."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Containers (Ocean only) */}
        {!isAir && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Equipment</span>
              <Button variant="ghost" size="sm" className="text-[11px] h-7 text-accent" onClick={() => onContainerChange([...containers, emptyContainerLine()])}>
                <Plus className="h-3 w-3 mr-1" /> Container
              </Button>
            </div>
            {containers.map((c, i) => (
              <div key={c.id} className="rounded-xl border bg-card p-4 mb-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">Container {i + 1}</span>
                  {containers.length > 1 && (
                    <button onClick={() => onContainerChange(containers.filter((_, j) => j !== i))} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Type</Label>
                    <Select value={c.containerType} onValueChange={(v) => updateContainer(i, "containerType", v)}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{CONTAINER_TYPES.map((ct) => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px] text-muted-foreground">Qty</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.quantity} onChange={(e) => updateContainer(i, "quantity", e.target.value)} /></div>
                  <div><Label className="text-[10px] text-muted-foreground">Container #</Label><Input className="mt-1 h-8 text-xs" value={c.containerNumber} onChange={(e) => updateContainer(i, "containerNumber", e.target.value)} placeholder="If known" /></div>
                  <div><Label className="text-[10px] text-muted-foreground">Seal #</Label><Input className="mt-1 h-8 text-xs" value={c.sealNumber} onChange={(e) => updateContainer(i, "sealNumber", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-[10px] text-muted-foreground">VGM (kg)</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.vgm} onChange={(e) => updateContainer(i, "vgm", e.target.value)} /></div>
                  <div><Label className="text-[10px] text-muted-foreground">Reefer Temp</Label><Input className="mt-1 h-8 text-xs" value={c.reeferTemp} onChange={(e) => updateContainer(i, "reeferTemp", e.target.value)} placeholder="If applicable" /></div>
                  <div><Label className="text-[10px] text-muted-foreground">OOG Dims</Label><Input className="mt-1 h-8 text-xs" value={c.oogDimensions} onChange={(e) => updateContainer(i, "oogDimensions", e.target.value)} placeholder="If applicable" /></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cargo Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Cargo Details</span>
            <Button variant="ghost" size="sm" className="text-[11px] h-7 text-accent" onClick={() => onCargoChange([...cargoLines, emptyCargoLine()])}>
              <Plus className="h-3 w-3 mr-1" /> Cargo Line
            </Button>
          </div>
          {cargoLines.map((c, i) => (
            <div key={c.id} className="rounded-xl border bg-card p-4 mb-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Line {i + 1}</span>
                {cargoLines.length > 1 && (
                  <button onClick={() => onCargoChange(cargoLines.filter((_, j) => j !== i))} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div><Label className="text-[10px] text-muted-foreground">Commodity</Label><Input className="mt-1 h-9 text-sm" value={c.commodity} onChange={(e) => updateCargo(i, "commodity", e.target.value)} placeholder={isAir ? "Nature & quantity of goods" : "e.g. Consumer Electronics — Laptops"} /></div>

              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-[10px] text-muted-foreground">HS Code</Label><Input className="mt-1 h-8 text-xs" value={c.hsCode} onChange={(e) => updateCargo(i, "hsCode", e.target.value)} placeholder="8471.30" /></div>
                <div><Label className="text-[10px] text-muted-foreground">Country of Origin</Label><Input className="mt-1 h-8 text-xs" value={c.countryOfOrigin} onChange={(e) => updateCargo(i, "countryOfOrigin", e.target.value)} placeholder="US" /></div>
                <div><Label className="text-[10px] text-muted-foreground">Marks & Numbers</Label><Input className="mt-1 h-8 text-xs" value={c.marksAndNumbers} onChange={(e) => updateCargo(i, "marksAndNumbers", e.target.value)} /></div>
              </div>

              {isAir ? (
                <>
                  {/* Air-specific: Pieces, Weight, Chargeable Weight, Dimensions */}
                  <div className="grid grid-cols-4 gap-3">
                    <div><Label className="text-[10px] text-muted-foreground">Pieces</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.pieces} onChange={(e) => updateCargo(i, "pieces", e.target.value)} /></div>
                    <div><Label className="text-[10px] text-muted-foreground">Gross Wt (kg)</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.grossWeight} onChange={(e) => updateCargo(i, "grossWeight", e.target.value)} /></div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Chargeable Wt (kg)</Label>
                      <Input type="number" className="mt-1 h-8 text-xs bg-muted/50" value={c.chargeableWeight} onChange={(e) => updateCargo(i, "chargeableWeight", e.target.value)} />
                      <p className="text-[9px] text-muted-foreground/50 mt-0.5">Auto: max(gross, volumetric)</p>
                    </div>
                    <div><Label className="text-[10px] text-muted-foreground">Dims (LxWxH cm)</Label><Input className="mt-1 h-8 text-xs" value={c.dimensions} onChange={(e) => updateCargo(i, "dimensions", e.target.value)} placeholder="60x40x30" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Rate Class</Label>
                      <Select value={c.rateClass} onValueChange={(v) => updateCargo(i, "rateClass", v)}>
                        <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{RATE_CLASSES.map(rc => <SelectItem key={rc.value} value={rc.value}>{rc.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Pkg Type</Label>
                      <Select value={c.packageType} onValueChange={(v) => updateCargo(i, "packageType", v)}>
                        <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{PACKAGE_TYPES.map((p) => <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-[10px] text-muted-foreground">Volume (CBM)</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.volume} onChange={(e) => updateCargo(i, "volume", e.target.value)} /></div>
                  </div>
                </>
              ) : (
                /* Ocean mode */
                <div className="grid grid-cols-4 gap-3">
                  <div><Label className="text-[10px] text-muted-foreground"># Pkgs</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.numPackages} onChange={(e) => updateCargo(i, "numPackages", e.target.value)} /></div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Pkg Type</Label>
                    <Select value={c.packageType} onValueChange={(v) => updateCargo(i, "packageType", v)}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{PACKAGE_TYPES.map((p) => <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px] text-muted-foreground">Gross (kg)</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.grossWeight} onChange={(e) => updateCargo(i, "grossWeight", e.target.value)} /></div>
                  <div><Label className="text-[10px] text-muted-foreground">CBM</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.volume} onChange={(e) => updateCargo(i, "volume", e.target.value)} /></div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Checkbox checked={c.dangerousGoods} onCheckedChange={(v) => updateCargo(i, "dangerousGoods", !!v)} id={`dg-${i}`} />
                  <Label htmlFor={`dg-${i}`} className="text-[10px] cursor-pointer text-muted-foreground">
                    {isAir ? "DG (IATA DGR)" : "DG"}
                  </Label>
                </div>
              </div>
              {c.dangerousGoods && (
                <div><Label className="text-[10px] text-muted-foreground">{isAir ? "DG Declaration (IATA)" : "DG Instructions"}</Label><Textarea className="mt-1 text-xs" rows={2} value={c.specialInstructions} onChange={(e) => updateCargo(i, "specialInstructions", e.target.value)} placeholder={isAir ? "UN number, proper shipping name, class, packing group, net/gross qty..." : "UN number, class, packing group..."} /></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
