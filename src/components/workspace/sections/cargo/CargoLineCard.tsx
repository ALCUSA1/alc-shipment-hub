import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import type { CargoLine, ContainerLine } from "@/lib/shipment-dataset";
import { PACKAGE_TYPES, RATE_CLASSES } from "../CargoSection";

interface Props {
  cargo: CargoLine;
  index: number;
  isAir: boolean;
  canDelete: boolean;
  containers: ContainerLine[];
  onUpdate: (field: keyof CargoLine, value: any) => void;
  onDelete: () => void;
}

export function CargoLineCard({ cargo: c, index: i, isAir, canDelete, containers, onUpdate, onDelete }: Props) {
  const showContainerDropdown = !isAir && containers.length > 0;

  return (
    <div className="rounded-xl border bg-card p-4 mb-2 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">Line {i + 1}</span>
        <div className="flex items-center gap-2">
          {showContainerDropdown && (
            <Select value={c.containerId || "unassigned"} onValueChange={(v) => onUpdate("containerId", v === "unassigned" ? "" : v)}>
              <SelectTrigger className="h-6 text-[10px] w-[140px] border-dashed">
                <SelectValue placeholder="Assign container" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {containers.map((ct, ci) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    Container {ci + 1}{ct.containerNumber ? ` (${ct.containerNumber})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canDelete && (
            <button onClick={onDelete} className="text-muted-foreground/40 hover:text-destructive transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div><Label className="text-[10px] text-muted-foreground">Commodity</Label><Input className="mt-1 h-9 text-sm" value={c.commodity} onChange={(e) => onUpdate("commodity", e.target.value)} placeholder={isAir ? "Nature & quantity of goods" : "e.g. Consumer Electronics — Laptops"} /></div>

      <div className="grid grid-cols-3 gap-3">
        <div><Label className="text-[10px] text-muted-foreground">HS Code</Label><Input className="mt-1 h-8 text-xs" value={c.hsCode} onChange={(e) => onUpdate("hsCode", e.target.value)} placeholder="8471.30" /></div>
        <div><Label className="text-[10px] text-muted-foreground">Country of Origin</Label><Input className="mt-1 h-8 text-xs" value={c.countryOfOrigin} onChange={(e) => onUpdate("countryOfOrigin", e.target.value)} placeholder="US" /></div>
        <div><Label className="text-[10px] text-muted-foreground">Marks & Numbers</Label><Input className="mt-1 h-8 text-xs" value={c.marksAndNumbers} onChange={(e) => onUpdate("marksAndNumbers", e.target.value)} /></div>
      </div>

      {isAir ? (
        <>
          <div className="grid grid-cols-4 gap-3">
            <div><Label className="text-[10px] text-muted-foreground">Pieces</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.pieces} onChange={(e) => onUpdate("pieces", e.target.value)} /></div>
            <div><Label className="text-[10px] text-muted-foreground">Gross Wt (kg)</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.grossWeight} onChange={(e) => onUpdate("grossWeight", e.target.value)} /></div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Chargeable Wt (kg)</Label>
              <Input type="number" className="mt-1 h-8 text-xs bg-muted/50" value={c.chargeableWeight} onChange={(e) => onUpdate("chargeableWeight", e.target.value)} />
              <p className="text-[9px] text-muted-foreground/50 mt-0.5">Auto: max(gross, volumetric)</p>
            </div>
            <div><Label className="text-[10px] text-muted-foreground">Dims (LxWxH cm)</Label><Input className="mt-1 h-8 text-xs" value={c.dimensions} onChange={(e) => onUpdate("dimensions", e.target.value)} placeholder="60x40x30" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px] text-muted-foreground">Rate Class</Label>
              <Select value={c.rateClass} onValueChange={(v) => onUpdate("rateClass", v)}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{RATE_CLASSES.map(rc => <SelectItem key={rc.value} value={rc.value}>{rc.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Pkg Type</Label>
              <Select value={c.packageType} onValueChange={(v) => onUpdate("packageType", v)}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{PACKAGE_TYPES.map((p) => <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-[10px] text-muted-foreground">Volume (CBM)</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.volume} onChange={(e) => onUpdate("volume", e.target.value)} /></div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          <div><Label className="text-[10px] text-muted-foreground"># Pkgs</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.numPackages} onChange={(e) => onUpdate("numPackages", e.target.value)} /></div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Pkg Type</Label>
            <Select value={c.packageType} onValueChange={(v) => onUpdate("packageType", v)}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{PACKAGE_TYPES.map((p) => <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-[10px] text-muted-foreground">Gross (kg)</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.grossWeight} onChange={(e) => onUpdate("grossWeight", e.target.value)} /></div>
          <div><Label className="text-[10px] text-muted-foreground">CBM</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.volume} onChange={(e) => onUpdate("volume", e.target.value)} /></div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Checkbox checked={c.dangerousGoods} onCheckedChange={(v) => onUpdate("dangerousGoods", !!v)} id={`dg-${i}`} />
          <Label htmlFor={`dg-${i}`} className="text-[10px] cursor-pointer text-muted-foreground">
            {isAir ? "DG (IATA DGR)" : "DG"}
          </Label>
        </div>
      </div>
      {c.dangerousGoods && (
        <div><Label className="text-[10px] text-muted-foreground">{isAir ? "DG Declaration (IATA)" : "DG Instructions"}</Label><Textarea className="mt-1 text-xs" rows={2} value={c.specialInstructions} onChange={(e) => onUpdate("specialInstructions", e.target.value)} placeholder={isAir ? "UN number, proper shipping name, class, packing group, net/gross qty..." : "UN number, class, packing group..."} /></div>
      )}
    </div>
  );
}
