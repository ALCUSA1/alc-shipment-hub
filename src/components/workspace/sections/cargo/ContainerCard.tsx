import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { X, ChevronDown, Package } from "lucide-react";
import type { CargoLine, ContainerLine } from "@/lib/shipment-dataset";
import { useState } from "react";

interface Props {
  container: ContainerLine;
  index: number;
  canDelete: boolean;
  containerTypes: { value: string; label: string }[];
  assignedCargo: CargoLine[];
  onUpdate: (field: keyof ContainerLine, value: string) => void;
  onDelete: () => void;
}

export function ContainerCard({ container: c, index: i, canDelete, containerTypes, assignedCargo, onUpdate, onDelete }: Props) {
  const [contentsOpen, setContentsOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-card p-4 mb-2 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">Container {i + 1}</span>
        {canDelete && (
          <button onClick={onDelete} className="text-muted-foreground/40 hover:text-destructive transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label className="text-[10px] text-muted-foreground">Type</Label>
          <Select value={c.containerType} onValueChange={(v) => onUpdate("containerType", v)}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{containerTypes.map((ct) => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-[10px] text-muted-foreground">Qty</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.quantity} onChange={(e) => onUpdate("quantity", e.target.value)} /></div>
        <div><Label className="text-[10px] text-muted-foreground">Container #</Label><Input className="mt-1 h-8 text-xs" value={c.containerNumber} onChange={(e) => onUpdate("containerNumber", e.target.value)} placeholder="If known" /></div>
        <div><Label className="text-[10px] text-muted-foreground">Seal #</Label><Input className="mt-1 h-8 text-xs" value={c.sealNumber} onChange={(e) => onUpdate("sealNumber", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label className="text-[10px] text-muted-foreground">VGM (kg)</Label><Input type="number" className="mt-1 h-8 text-xs" value={c.vgm} onChange={(e) => onUpdate("vgm", e.target.value)} /></div>
        <div><Label className="text-[10px] text-muted-foreground">Reefer Temp</Label><Input className="mt-1 h-8 text-xs" value={c.reeferTemp} onChange={(e) => onUpdate("reeferTemp", e.target.value)} placeholder="If applicable" /></div>
        <div><Label className="text-[10px] text-muted-foreground">OOG Dims</Label><Input className="mt-1 h-8 text-xs" value={c.oogDimensions} onChange={(e) => onUpdate("oogDimensions", e.target.value)} placeholder="If applicable" /></div>
      </div>

      {/* Container Contents */}
      <Collapsible open={contentsOpen} onOpenChange={setContentsOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors w-full pt-1 border-t border-border/50">
          <Package className="h-3 w-3" />
          <span>Contents ({assignedCargo.length} item{assignedCargo.length !== 1 ? "s" : ""})</span>
          <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${contentsOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {assignedCargo.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50 italic py-2">
              No cargo lines assigned. Use the "Container" dropdown on each cargo line below.
            </p>
          ) : (
            <div className="space-y-1">
              {assignedCargo.map((cargo) => (
                <div key={cargo.id} className="flex items-center justify-between text-[10px] bg-muted/30 rounded-md px-2.5 py-1.5">
                  <span className="font-medium text-foreground truncate max-w-[40%]">{cargo.commodity || "Unnamed cargo"}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {cargo.hsCode && <span>HS: {cargo.hsCode}</span>}
                    {cargo.grossWeight && <span>{cargo.grossWeight} kg</span>}
                    {cargo.volume && <span>{cargo.volume} CBM</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
