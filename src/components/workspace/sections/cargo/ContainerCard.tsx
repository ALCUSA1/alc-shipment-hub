import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, Package, Plus } from "lucide-react";
import type { CargoLine, ContainerLine } from "@/lib/shipment-dataset";
import { useState } from "react";
import { CargoLineCard } from "./CargoLineCard";

interface Props {
  container: ContainerLine;
  index: number;
  canDelete: boolean;
  containerTypes: { value: string; label: string }[];
  assignedCargo: { cargo: CargoLine; originalIdx: number }[];
  allContainers: ContainerLine[];
  onUpdate: (field: keyof ContainerLine, value: string) => void;
  onDelete: () => void;
  onAddCargo: () => void;
  onUpdateCargo: (originalIdx: number, field: keyof CargoLine, value: any) => void;
  onDeleteCargo: (originalIdx: number) => void;
  onMoveCargo: (originalIdx: number, targetContainerId: string) => void;
  canDeleteCargo: boolean;
}

export function ContainerCard({
  container: c, index: i, canDelete, containerTypes, assignedCargo,
  allContainers, onUpdate, onDelete, onAddCargo, onUpdateCargo, onDeleteCargo,
  onMoveCargo, canDeleteCargo,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const containerLabel = containerTypes.find(ct => ct.value === c.containerType)?.label || c.containerType || "Container";

  return (
    <div className="rounded-xl border bg-card overflow-hidden mb-3">
      {/* Container Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-left group"
        >
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`} />
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold text-foreground">
              {containerLabel}
              {c.containerNumber && <span className="ml-1.5 font-mono text-muted-foreground">#{c.containerNumber}</span>}
            </span>
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              {assignedCargo.length} item{assignedCargo.length !== 1 ? "s" : ""}
            </span>
          </div>
        </button>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-6 px-2 text-accent hover:text-accent"
            onClick={onAddCargo}
          >
            <Plus className="h-3 w-3 mr-0.5" /> Commodity
          </Button>
          {canDelete && (
            <button onClick={onDelete} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Container Details */}
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

          {/* Nested Commodity Lines */}
          {assignedCargo.length > 0 && (
            <div className="pt-2 border-t border-border/40 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                Commodities in this container
              </span>
              {assignedCargo.map(({ cargo, originalIdx }, lineIdx) => (
                <CargoLineCard
                  key={cargo.id}
                  cargo={cargo}
                  index={originalIdx}
                  displayIndex={lineIdx}
                  isAir={false}
                  canDelete={canDeleteCargo}
                  containers={[]}
                  allContainers={allContainers}
                  onUpdate={(f, v) => onUpdateCargo(originalIdx, f, v)}
                  onDelete={() => onDeleteCargo(originalIdx)}
                  onMoveToContainer={(targetId) => onMoveCargo(originalIdx, targetId)}
                  isNested
                />
              ))}
            </div>
          )}

          {assignedCargo.length === 0 && (
            <div className="pt-2 border-t border-border/40">
              <button
                onClick={onAddCargo}
                className="w-full rounded-lg border-2 border-dashed border-border/60 hover:border-accent/40 py-4 flex flex-col items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[11px] font-medium">Add a commodity to this container</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
