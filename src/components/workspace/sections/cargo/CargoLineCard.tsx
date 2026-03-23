import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, ArrowRightLeft } from "lucide-react";
import type { CargoLine, ContainerLine } from "@/lib/shipment-dataset";
import { HsCodeAutocomplete } from "@/components/shared/HsCodeAutocomplete";
import { PACKAGE_TYPES, RATE_CLASSES } from "../CargoSection";

interface Props {
  cargo: CargoLine;
  index: number;
  displayIndex?: number;
  isAir: boolean;
  canDelete: boolean;
  containers: ContainerLine[];
  allContainers: ContainerLine[];
  onUpdate: (field: keyof CargoLine, value: any) => void;
  onDelete: () => void;
  onMoveToContainer: (targetContainerId: string) => void;
  isNested?: boolean;
  isUnassigned?: boolean;
}

export function CargoLineCard({
  cargo: c, index: i, displayIndex, isAir, canDelete, allContainers,
  onUpdate, onDelete, onMoveToContainer, isNested, isUnassigned,
}: Props) {
  const showMoveButton = !isAir && allContainers.length > 1;
  const label = displayIndex !== undefined ? displayIndex + 1 : i + 1;

  return (
    <div className={`rounded-lg border p-3 space-y-3 ${isNested ? "bg-background/60" : "bg-card"} ${isUnassigned ? "border-yellow-400/40" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground">
          {c.commodity ? c.commodity : `Commodity ${label}`}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Move to container */}
          {showMoveButton && (
            <Select
              value=""
              onValueChange={(v) => {
                if (v === "__unassign__") onMoveToContainer("");
                else if (v) onMoveToContainer(v);
              }}
            >
              <SelectTrigger className="h-6 text-[10px] w-auto min-w-0 gap-1 border-none bg-secondary/60 hover:bg-secondary px-1.5">
                <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Move</span>
              </SelectTrigger>
              <SelectContent>
                {allContainers
                  .filter(ct => ct.id !== c.containerId)
                  .map((ct, ci) => {
                    const globalIdx = allContainers.findIndex(a => a.id === ct.id);
                    return (
                      <SelectItem key={ct.id} value={ct.id}>
                        → Container {globalIdx + 1}{ct.containerNumber ? ` (${ct.containerNumber})` : ""}
                      </SelectItem>
                    );
                  })}
                {c.containerId && (
                  <SelectItem value="__unassign__">
                    Remove from container
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
          {canDelete && (
            <button onClick={onDelete} className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div>
        <Label className="text-[10px] text-muted-foreground">Commodity</Label>
        <Input className="mt-1 h-8 text-xs" value={c.commodity} onChange={(e) => onUpdate("commodity", e.target.value)} placeholder={isAir ? "Nature & quantity of goods" : "e.g. Consumer Electronics — Laptops"} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div><Label className="text-[10px] text-muted-foreground">HS Code</Label><Input className="mt-1 h-7 text-[11px]" value={c.hsCode} onChange={(e) => onUpdate("hsCode", e.target.value)} placeholder="8471.30" /></div>
        <div><Label className="text-[10px] text-muted-foreground">Origin</Label><Input className="mt-1 h-7 text-[11px]" value={c.countryOfOrigin} onChange={(e) => onUpdate("countryOfOrigin", e.target.value)} placeholder="US" /></div>
        <div><Label className="text-[10px] text-muted-foreground">Marks</Label><Input className="mt-1 h-7 text-[11px]" value={c.marksAndNumbers} onChange={(e) => onUpdate("marksAndNumbers", e.target.value)} /></div>
      </div>

      {isAir ? (
        <>
          <div className="grid grid-cols-4 gap-2">
            <div><Label className="text-[10px] text-muted-foreground">Pieces</Label><Input type="number" className="mt-1 h-7 text-[11px]" value={c.pieces} onChange={(e) => onUpdate("pieces", e.target.value)} /></div>
            <div><Label className="text-[10px] text-muted-foreground">Gross Wt (kg)</Label><Input type="number" className="mt-1 h-7 text-[11px]" value={c.grossWeight} onChange={(e) => onUpdate("grossWeight", e.target.value)} /></div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Chg Wt (kg)</Label>
              <Input type="number" className="mt-1 h-7 text-[11px] bg-muted/50" value={c.chargeableWeight} onChange={(e) => onUpdate("chargeableWeight", e.target.value)} />
            </div>
            <div><Label className="text-[10px] text-muted-foreground">Dims (LxWxH)</Label><Input className="mt-1 h-7 text-[11px]" value={c.dimensions} onChange={(e) => onUpdate("dimensions", e.target.value)} placeholder="60x40x30" /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Rate Class</Label>
              <Select value={c.rateClass} onValueChange={(v) => onUpdate("rateClass", v)}>
                <SelectTrigger className="mt-1 h-7 text-[11px]"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{RATE_CLASSES.map(rc => <SelectItem key={rc.value} value={rc.value}>{rc.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Pkg Type</Label>
              <Select value={c.packageType} onValueChange={(v) => onUpdate("packageType", v)}>
                <SelectTrigger className="mt-1 h-7 text-[11px]"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{PACKAGE_TYPES.map((p) => <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-[10px] text-muted-foreground">Volume (CBM)</Label><Input type="number" className="mt-1 h-7 text-[11px]" value={c.volume} onChange={(e) => onUpdate("volume", e.target.value)} /></div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <div><Label className="text-[10px] text-muted-foreground"># Pkgs</Label><Input type="number" className="mt-1 h-7 text-[11px]" value={c.numPackages} onChange={(e) => onUpdate("numPackages", e.target.value)} /></div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Pkg Type</Label>
            <Select value={c.packageType} onValueChange={(v) => onUpdate("packageType", v)}>
              <SelectTrigger className="mt-1 h-7 text-[11px]"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{PACKAGE_TYPES.map((p) => <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-[10px] text-muted-foreground">Gross (kg)</Label><Input type="number" className="mt-1 h-7 text-[11px]" value={c.grossWeight} onChange={(e) => onUpdate("grossWeight", e.target.value)} /></div>
          <div><Label className="text-[10px] text-muted-foreground">CBM</Label><Input type="number" className="mt-1 h-7 text-[11px]" value={c.volume} onChange={(e) => onUpdate("volume", e.target.value)} /></div>
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
        <div>
          <Label className="text-[10px] text-muted-foreground">{isAir ? "DG Declaration (IATA)" : "DG Instructions"}</Label>
          <Textarea className="mt-1 text-xs" rows={2} value={c.specialInstructions} onChange={(e) => onUpdate("specialInstructions", e.target.value)} placeholder={isAir ? "UN number, proper shipping name, class, packing group..." : "UN number, class, packing group..."} />
        </div>
      )}
    </div>
  );
}
