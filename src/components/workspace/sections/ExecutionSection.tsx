import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Truck, Warehouse } from "lucide-react";
import type { ShipmentDataset } from "@/lib/shipment-dataset";

interface Props {
  data: ShipmentDataset["execution"];
  onChange: (d: ShipmentDataset["execution"]) => void;
}

export function ExecutionSection({ data, onChange }: Props) {
  const set = (f: keyof typeof data, v: any) => onChange({ ...data, [f]: v });

  return (
    <section id="execution" className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-foreground tracking-tight">Operations</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Trucking and warehouse data — captured once, flows to drayage orders and warehouse instructions.</p>
      </div>

      <div className="space-y-4">
        {/* Trucking */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-secondary/20">
            <Truck className="h-3.5 w-3.5 text-accent" />
            <span className="text-[12px] font-semibold text-foreground">Trucking / Drayage</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Pickup Location</Label><Input className="mt-1 h-9 text-sm" value={data.pickupLocation} onChange={(e) => set("pickupLocation", e.target.value)} placeholder="Address or facility" /></div>
              <div><Label className="text-[10px] text-muted-foreground">Delivery Location</Label><Input className="mt-1 h-9 text-sm" value={data.deliveryLocation} onChange={(e) => set("deliveryLocation", e.target.value)} placeholder="Port or CFS" /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Pickup Date</Label><Input type="date" className="mt-1 h-8 text-xs" value={data.pickupDate} onChange={(e) => set("pickupDate", e.target.value)} /></div>
              <div><Label className="text-[10px] text-muted-foreground">Time</Label><Input type="time" className="mt-1 h-8 text-xs" value={data.pickupTime} onChange={(e) => set("pickupTime", e.target.value)} /></div>
              <div><Label className="text-[10px] text-muted-foreground">Driver</Label><Input className="mt-1 h-8 text-xs" value={data.driverName} onChange={(e) => set("driverName", e.target.value)} /></div>
              <div><Label className="text-[10px] text-muted-foreground">Driver Phone</Label><Input className="mt-1 h-8 text-xs" value={data.driverPhone} onChange={(e) => set("driverPhone", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Truck Ref</Label><Input className="mt-1 h-8 text-xs" value={data.truckRef} onChange={(e) => set("truckRef", e.target.value)} /></div>
              <div><Label className="text-[10px] text-muted-foreground">Chassis Ref</Label><Input className="mt-1 h-8 text-xs" value={data.chassisRef} onChange={(e) => set("chassisRef", e.target.value)} /></div>
            </div>
            <div><Label className="text-[10px] text-muted-foreground">Dispatch Notes</Label><Textarea className="mt-1 text-xs" rows={2} value={data.dispatchNotes} onChange={(e) => set("dispatchNotes", e.target.value)} placeholder="Gate codes, appointments..." /></div>
          </div>
        </div>

        {/* Warehouse */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-secondary/20">
            <Warehouse className="h-3.5 w-3.5 text-accent" />
            <span className="text-[12px] font-semibold text-foreground">Warehouse / CFS</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Location</Label><Input className="mt-1 h-9 text-sm" value={data.warehouseLocation} onChange={(e) => set("warehouseLocation", e.target.value)} placeholder="Facility name or address" /></div>
              <div><Label className="text-[10px] text-muted-foreground">Cargo Arrival</Label><Input type="date" className="mt-1 h-9 text-sm" value={data.cargoArrivalDate} onChange={(e) => set("cargoArrivalDate", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Receipt #</Label><Input className="mt-1 h-8 text-xs" value={data.warehouseReceiptNumber} onChange={(e) => set("warehouseReceiptNumber", e.target.value)} placeholder="If known" /></div>
              <div className="flex items-end gap-2 pb-1">
                <Checkbox checked={data.destuffingRequired} onCheckedChange={(v) => set("destuffingRequired", !!v)} id="destuff" />
                <Label htmlFor="destuff" className="text-[10px] cursor-pointer text-muted-foreground">Destuffing</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Storage Notes</Label><Textarea className="mt-1 text-xs" rows={2} value={data.storageNotes} onChange={(e) => set("storageNotes", e.target.value)} /></div>
              <div><Label className="text-[10px] text-muted-foreground">Handling Notes</Label><Textarea className="mt-1 text-xs" rows={2} value={data.handlingNotes} onChange={(e) => set("handlingNotes", e.target.value)} /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
