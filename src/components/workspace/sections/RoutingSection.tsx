import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortSelector } from "@/components/shipment/PortSelector";
import { useState } from "react";
import { motion } from "framer-motion";
import type { ShipmentDataset } from "@/lib/shipment-dataset";

interface Props {
  data: ShipmentDataset["routing"];
  onChange: (d: ShipmentDataset["routing"]) => void;
  ports: { code: string; name: string; country: string; type?: string }[];
  mode?: string;
}

const AIRLINES = [
  "Emirates SkyCargo", "Lufthansa Cargo", "Cathay Pacific Cargo", "Singapore Airlines Cargo",
  "Korean Air Cargo", "Qatar Airways Cargo", "Turkish Airlines Cargo", "Cargolux",
  "FedEx Express", "UPS Airlines", "DHL Aviation", "Atlas Air",
  "Etihad Cargo", "ANA Cargo", "EVA Air Cargo", "China Airlines Cargo",
];

const RATE_CLASSES = [
  { value: "M", label: "M — Minimum" },
  { value: "N", label: "N — Normal (under 45kg)" },
  { value: "Q45", label: "Q — 45 kg+" },
  { value: "Q100", label: "Q — 100 kg+" },
  { value: "Q250", label: "Q — 250 kg+" },
  { value: "Q500", label: "Q — 500 kg+" },
  { value: "Q1000", label: "Q — 1000 kg+" },
  { value: "C", label: "C — Specific Commodity" },
  { value: "U", label: "U — ULD (Unit Load Device)" },
];

export function RoutingSection({ data, onChange, ports, mode = "ocean" }: Props) {
  const set = (f: keyof typeof data, v: string) => onChange({ ...data, [f]: v });
  const [showFeeder, setShowFeeder] = useState(!!data.feederVessel);
  const [showTransshipment, setShowTransshipment] = useState(!!data.transshipmentPort1);
  const isAir = mode === "air";

  const filteredPorts = ports.filter(p => {
    if (isAir) return (p as any).type === "air";
    return (p as any).type === "sea" || !(p as any).type;
  });

  if (isAir) {
    return (
      <section id="routing" className="scroll-mt-8">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-foreground tracking-tight">Routing & Flight</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Airport pair, airline, flight details for air waybill and booking.</p>
        </div>

        <div className="space-y-5">
          {/* Airports */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] text-muted-foreground">Airport of Departure</Label>
              <div className="mt-1.5"><PortSelector ports={filteredPorts} value={data.airportOfDeparture} onValueChange={(v) => set("airportOfDeparture", v)} placeholder="Select airport" mode="air" /></div>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Airport of Destination</Label>
              <div className="mt-1.5"><PortSelector ports={filteredPorts} value={data.airportOfDestination} onValueChange={(v) => set("airportOfDestination", v)} placeholder="Select airport" mode="air" /></div>
            </div>
          </div>

          {/* Airline + Flight */}
          <div className="rounded-xl border bg-secondary/20 p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Airline</Label>
                <Select value={data.airline} onValueChange={(v) => set("airline", v)}>
                  <SelectTrigger className="mt-1 h-9 text-sm bg-background"><SelectValue placeholder="Select airline" /></SelectTrigger>
                  <SelectContent>
                    {AIRLINES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-[11px] text-muted-foreground">Flight Number</Label><Input className="mt-1 h-9 text-sm bg-background" value={data.flightNumber} onChange={(e) => set("flightNumber", e.target.value)} placeholder="e.g. EK9721" /></div>
              <div><Label className="text-[11px] text-muted-foreground">ETD</Label><Input type="date" className="mt-1 h-9 text-sm bg-background" value={data.etd} onChange={(e) => set("etd", e.target.value)} /></div>
              <div><Label className="text-[11px] text-muted-foreground">ETA</Label><Input type="date" className="mt-1 h-9 text-sm bg-background" value={data.eta} onChange={(e) => set("eta", e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div><Label className="text-[11px] text-muted-foreground">MAWB Number</Label><Input className="mt-1 h-9 text-sm bg-background" value={data.mawbNumber} onChange={(e) => set("mawbNumber", e.target.value)} placeholder="e.g. 176-12345678" /></div>
              <div><Label className="text-[11px] text-muted-foreground">HAWB Number</Label><Input className="mt-1 h-9 text-sm bg-background" value={data.hawbNumber} onChange={(e) => set("hawbNumber", e.target.value)} placeholder="House AWB" /></div>
              <div><Label className="text-[11px] text-muted-foreground">Aircraft Type</Label><Input className="mt-1 h-9 text-sm bg-background" value={data.aircraftType} onChange={(e) => set("aircraftType", e.target.value)} placeholder="e.g. B777F" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Freight Terms</Label>
                <Select value={data.freightTerms} onValueChange={(v) => set("freightTerms", v)}>
                  <SelectTrigger className="mt-1 h-9 text-sm w-40 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prepaid">Prepaid (PP)</SelectItem>
                    <SelectItem value="collect">Collect (CC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-[11px] text-muted-foreground">Booking Ref</Label><Input className="mt-1 h-9 text-sm bg-background" value={data.bookingRef} onChange={(e) => set("bookingRef", e.target.value)} /></div>
            </div>
          </div>

          {/* AWB-specific fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[11px] text-muted-foreground">Routing & Destination</Label>
              <Input className="mt-1.5 h-9 text-sm" value={data.routingAndDestination} onChange={(e) => set("routingAndDestination", e.target.value)} placeholder="e.g. JFK-FRA-DXB" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">SCI (Security)</Label>
              <Select value={data.sci} onValueChange={(v) => set("sci", v)}>
                <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SPX">SPX — Screened</SelectItem>
                  <SelectItem value="SCO">SCO — Secured Cargo</SelectItem>
                  <SelectItem value="SHR">SHR — Known Shipper</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-[11px] text-muted-foreground">Declared Value for Carriage</Label><Input type="number" className="mt-1.5 h-9 text-sm" value={data.declaredValueForCarriage} onChange={(e) => set("declaredValueForCarriage", e.target.value)} placeholder="NVD or amount" /></div>
            <div><Label className="text-[11px] text-muted-foreground">Declared Value for Customs</Label><Input type="number" className="mt-1.5 h-9 text-sm" value={data.declaredValueForCustoms} onChange={(e) => set("declaredValueForCustoms", e.target.value)} placeholder="NCV or amount" /></div>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Handling Information</Label>
            <Textarea className="mt-1.5 text-sm" rows={2} value={data.handlingInformation} onChange={(e) => set("handlingInformation", e.target.value)} placeholder="Special handling codes, temperature requirements, etc." />
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Accounting Information</Label>
            <Input className="mt-1.5 h-9 text-sm" value={data.accountingInformation} onChange={(e) => set("accountingInformation", e.target.value)} placeholder="e.g. GEN/KB123" />
          </div>
        </div>
      </section>
    );
  }

  // Ocean mode (existing)
  return (
    <section id="routing" className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-foreground tracking-tight">Routing & Vessel</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Port pair, vessel, and carrier for B/L and shipping instructions.</p>
      </div>

      <div className="space-y-5">
        {/* Ports */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[11px] text-muted-foreground">Port of Loading</Label>
            <div className="mt-1.5"><PortSelector ports={filteredPorts} value={data.portOfLoading} onValueChange={(v) => set("portOfLoading", v)} placeholder="Select POL" /></div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Port of Discharge</Label>
            <div className="mt-1.5"><PortSelector ports={filteredPorts} value={data.portOfDischarge} onValueChange={(v) => set("portOfDischarge", v)} placeholder="Select POD" /></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><Label className="text-[11px] text-muted-foreground">Final Destination</Label><Input className="mt-1.5 h-9 text-sm" value={data.finalDestination} onChange={(e) => set("finalDestination", e.target.value)} placeholder="City or port" /></div>
          <div><Label className="text-[11px] text-muted-foreground">Carrier</Label><Input className="mt-1.5 h-9 text-sm" value={data.carrier} onChange={(e) => set("carrier", e.target.value)} placeholder="e.g. Maersk" /></div>
          <div><Label className="text-[11px] text-muted-foreground">Booking Ref</Label><Input className="mt-1.5 h-9 text-sm" value={data.bookingRef} onChange={(e) => set("bookingRef", e.target.value)} /></div>
        </div>

        {/* Vessel + dates */}
        <div className="rounded-xl border bg-secondary/20 p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label className="text-[11px] text-muted-foreground">Vessel</Label><Input className="mt-1 h-9 text-sm bg-background" value={data.motherVessel} onChange={(e) => set("motherVessel", e.target.value)} placeholder="Vessel name" /></div>
            <div><Label className="text-[11px] text-muted-foreground">Voyage</Label><Input className="mt-1 h-9 text-sm bg-background" value={data.motherVoyage} onChange={(e) => set("motherVoyage", e.target.value)} /></div>
            <div><Label className="text-[11px] text-muted-foreground">ETD</Label><Input type="date" className="mt-1 h-9 text-sm bg-background" value={data.etd} onChange={(e) => set("etd", e.target.value)} /></div>
            <div><Label className="text-[11px] text-muted-foreground">ETA</Label><Input type="date" className="mt-1 h-9 text-sm bg-background" value={data.eta} onChange={(e) => set("eta", e.target.value)} /></div>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Freight Terms</Label>
            <Select value={data.freightTerms} onValueChange={(v) => set("freightTerms", v)}>
              <SelectTrigger className="mt-1 h-9 text-sm w-40 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prepaid">Prepaid</SelectItem>
                <SelectItem value="collect">Collect</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progressive: Feeder */}
        {!showFeeder ? (
          <button onClick={() => setShowFeeder(true)} className="text-[11px] text-accent hover:underline px-1">+ Add feeder vessel details</button>
        ) : (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px] text-muted-foreground">Feeder Vessel</Label><Input className="mt-1 h-9 text-sm" value={data.feederVessel} onChange={(e) => set("feederVessel", e.target.value)} /></div>
            <div><Label className="text-[11px] text-muted-foreground">Feeder Voyage</Label><Input className="mt-1 h-9 text-sm" value={data.feederVoyage} onChange={(e) => set("feederVoyage", e.target.value)} /></div>
          </motion.div>
        )}

        {/* Progressive: Transshipment */}
        {!showTransshipment ? (
          <button onClick={() => setShowTransshipment(true)} className="text-[11px] text-accent hover:underline px-1">+ Add transshipment ports</button>
        ) : (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
            <div><Label className="text-[11px] text-muted-foreground">T/S Port 1</Label><div className="mt-1"><PortSelector ports={filteredPorts} value={data.transshipmentPort1} onValueChange={(v) => set("transshipmentPort1", v)} placeholder="Optional" /></div></div>
            <div><Label className="text-[11px] text-muted-foreground">T/S Port 2</Label><div className="mt-1"><PortSelector ports={filteredPorts} value={data.transshipmentPort2} onValueChange={(v) => set("transshipmentPort2", v)} placeholder="Optional" /></div></div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
