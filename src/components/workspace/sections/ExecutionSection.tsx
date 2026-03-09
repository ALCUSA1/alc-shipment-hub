import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { ShipmentDataset } from "@/lib/shipment-dataset";

interface Props {
  data: ShipmentDataset["execution"];
  onChange: (d: ShipmentDataset["execution"]) => void;
}

export function ExecutionSection({ data, onChange }: Props) {
  const set = (f: keyof typeof data, v: any) => onChange({ ...data, [f]: v });

  return (
    <section id="execution" className="scroll-mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Trucking, Warehouse & Execution</h2>
        <p className="text-xs text-muted-foreground mt-1">Operational details for drayage and warehouse instructions — no re-entry needed downstream.</p>
      </div>

      {/* Trucking */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Trucking / Drayage</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Pickup Location</Label><Input className="mt-1 h-9 text-sm" value={data.pickupLocation} onChange={(e) => set("pickupLocation", e.target.value)} placeholder="Address or facility" /></div>
          <div><Label className="text-xs">Delivery Location</Label><Input className="mt-1 h-9 text-sm" value={data.deliveryLocation} onChange={(e) => set("deliveryLocation", e.target.value)} placeholder="Port or CFS" /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label className="text-xs">Pickup Date</Label><Input type="date" className="mt-1 h-9 text-sm" value={data.pickupDate} onChange={(e) => set("pickupDate", e.target.value)} /></div>
          <div><Label className="text-xs">Pickup Time</Label><Input type="time" className="mt-1 h-9 text-sm" value={data.pickupTime} onChange={(e) => set("pickupTime", e.target.value)} /></div>
          <div><Label className="text-xs">Driver Name</Label><Input className="mt-1 h-9 text-sm" value={data.driverName} onChange={(e) => set("driverName", e.target.value)} /></div>
          <div><Label className="text-xs">Driver Phone</Label><Input className="mt-1 h-9 text-sm" value={data.driverPhone} onChange={(e) => set("driverPhone", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Truck Reference</Label><Input className="mt-1 h-9 text-sm" value={data.truckRef} onChange={(e) => set("truckRef", e.target.value)} /></div>
          <div><Label className="text-xs">Chassis Reference</Label><Input className="mt-1 h-9 text-sm" value={data.chassisRef} onChange={(e) => set("chassisRef", e.target.value)} /></div>
        </div>
        <div><Label className="text-xs">Dispatch Notes</Label><Textarea className="mt-1 text-sm" rows={2} value={data.dispatchNotes} onChange={(e) => set("dispatchNotes", e.target.value)} placeholder="Gate codes, appointment info, special instructions..." /></div>
      </div>

      {/* Warehouse */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Warehouse / CFS</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">Warehouse Location</Label><Input className="mt-1 h-9 text-sm" value={data.warehouseLocation} onChange={(e) => set("warehouseLocation", e.target.value)} placeholder="Facility name or address" /></div>
          <div><Label className="text-xs">Cargo Arrival Date</Label><Input type="date" className="mt-1 h-9 text-sm" value={data.cargoArrivalDate} onChange={(e) => set("cargoArrivalDate", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Receipt Number</Label><Input className="mt-1 h-9 text-sm" value={data.warehouseReceiptNumber} onChange={(e) => set("warehouseReceiptNumber", e.target.value)} placeholder="If known" /></div>
          <div className="flex items-end gap-2 pb-1">
            <Checkbox checked={data.destuffingRequired} onCheckedChange={(v) => set("destuffingRequired", !!v)} id="destuff" />
            <Label htmlFor="destuff" className="text-xs cursor-pointer">Destuffing Required</Label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Storage Notes</Label><Textarea className="mt-1 text-sm" rows={2} value={data.storageNotes} onChange={(e) => set("storageNotes", e.target.value)} /></div>
          <div><Label className="text-xs">Handling Notes</Label><Textarea className="mt-1 text-sm" rows={2} value={data.handlingNotes} onChange={(e) => set("handlingNotes", e.target.value)} /></div>
        </div>
      </div>
    </section>
  );
}
