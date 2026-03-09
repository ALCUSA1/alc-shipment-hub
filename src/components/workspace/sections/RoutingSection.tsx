import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortSelector } from "@/components/shipment/PortSelector";
import type { ShipmentDataset } from "@/lib/shipment-dataset";

interface Props {
  data: ShipmentDataset["routing"];
  onChange: (d: ShipmentDataset["routing"]) => void;
  ports: { code: string; name: string; country: string }[];
}

export function RoutingSection({ data, onChange, ports }: Props) {
  const set = (f: keyof typeof data, v: string) => onChange({ ...data, [f]: v });

  return (
    <section id="routing" className="scroll-mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Routing & Vessel</h2>
        <p className="text-xs text-muted-foreground mt-1">Port routing, vessel details, and carrier information for B/L and booking.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Port of Loading</Label>
          <div className="mt-1"><PortSelector ports={ports} value={data.portOfLoading} onValueChange={(v) => set("portOfLoading", v)} placeholder="Select POL" /></div>
        </div>
        <div>
          <Label className="text-xs">Port of Discharge</Label>
          <div className="mt-1"><PortSelector ports={ports} value={data.portOfDischarge} onValueChange={(v) => set("portOfDischarge", v)} placeholder="Select POD" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><Label className="text-xs">Final Destination</Label><Input className="mt-1" value={data.finalDestination} onChange={(e) => set("finalDestination", e.target.value)} placeholder="City or port" /></div>
        <div><Label className="text-xs">Transshipment Port 1</Label><div className="mt-1"><PortSelector ports={ports} value={data.transshipmentPort1} onValueChange={(v) => set("transshipmentPort1", v)} placeholder="Optional" /></div></div>
        <div><Label className="text-xs">Transshipment Port 2</Label><div className="mt-1"><PortSelector ports={ports} value={data.transshipmentPort2} onValueChange={(v) => set("transshipmentPort2", v)} placeholder="Optional" /></div></div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Vessel Details</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label className="text-xs">Mother Vessel</Label><Input className="mt-1 h-9 text-sm" value={data.motherVessel} onChange={(e) => set("motherVessel", e.target.value)} /></div>
          <div><Label className="text-xs">Mother Voyage</Label><Input className="mt-1 h-9 text-sm" value={data.motherVoyage} onChange={(e) => set("motherVoyage", e.target.value)} /></div>
          <div><Label className="text-xs">Feeder Vessel</Label><Input className="mt-1 h-9 text-sm" value={data.feederVessel} onChange={(e) => set("feederVessel", e.target.value)} placeholder="Optional" /></div>
          <div><Label className="text-xs">Feeder Voyage</Label><Input className="mt-1 h-9 text-sm" value={data.feederVoyage} onChange={(e) => set("feederVoyage", e.target.value)} placeholder="Optional" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">ETD</Label><Input type="date" className="mt-1 h-9 text-sm" value={data.etd} onChange={(e) => set("etd", e.target.value)} /></div>
          <div><Label className="text-xs">ETA</Label><Input type="date" className="mt-1 h-9 text-sm" value={data.eta} onChange={(e) => set("eta", e.target.value)} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><Label className="text-xs">Carrier / Shipping Line</Label><Input className="mt-1" value={data.carrier} onChange={(e) => set("carrier", e.target.value)} placeholder="e.g. Maersk, MSC" /></div>
        <div><Label className="text-xs">Booking Reference</Label><Input className="mt-1" value={data.bookingRef} onChange={(e) => set("bookingRef", e.target.value)} /></div>
        <div>
          <Label className="text-xs">Freight Terms</Label>
          <Select value={data.freightTerms} onValueChange={(v) => set("freightTerms", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prepaid">Prepaid</SelectItem>
              <SelectItem value="collect">Collect</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
