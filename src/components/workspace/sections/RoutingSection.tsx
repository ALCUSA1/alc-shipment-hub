import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortSelector } from "@/components/shipment/PortSelector";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ShipmentDataset } from "@/lib/shipment-dataset";

interface Props {
  data: ShipmentDataset["routing"];
  onChange: (d: ShipmentDataset["routing"]) => void;
  ports: { code: string; name: string; country: string }[];
}

export function RoutingSection({ data, onChange, ports }: Props) {
  const set = (f: keyof typeof data, v: string) => onChange({ ...data, [f]: v });
  const [showFeeder, setShowFeeder] = useState(!!data.feederVessel);
  const [showTransshipment, setShowTransshipment] = useState(!!data.transshipmentPort1);

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
            <div className="mt-1.5"><PortSelector ports={ports} value={data.portOfLoading} onValueChange={(v) => set("portOfLoading", v)} placeholder="Select POL" /></div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Port of Discharge</Label>
            <div className="mt-1.5"><PortSelector ports={ports} value={data.portOfDischarge} onValueChange={(v) => set("portOfDischarge", v)} placeholder="Select POD" /></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><Label className="text-[11px] text-muted-foreground">Final Destination</Label><Input className="mt-1.5 h-9 text-sm" value={data.finalDestination} onChange={(e) => set("finalDestination", e.target.value)} placeholder="City or port" /></div>
          <div><Label className="text-[11px] text-muted-foreground">Carrier</Label><Input className="mt-1.5 h-9 text-sm" value={data.carrier} onChange={(e) => set("carrier", e.target.value)} placeholder="e.g. Maersk" /></div>
          <div><Label className="text-[11px] text-muted-foreground">Booking Ref</Label><Input className="mt-1.5 h-9 text-sm" value={data.bookingRef} onChange={(e) => set("bookingRef", e.target.value)} /></div>
        </div>

        {/* Vessel + dates — grouped card */}
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
            <div><Label className="text-[11px] text-muted-foreground">T/S Port 1</Label><div className="mt-1"><PortSelector ports={ports} value={data.transshipmentPort1} onValueChange={(v) => set("transshipmentPort1", v)} placeholder="Optional" /></div></div>
            <div><Label className="text-[11px] text-muted-foreground">T/S Port 2</Label><div className="mt-1"><PortSelector ports={ports} value={data.transshipmentPort2} onValueChange={(v) => set("transshipmentPort2", v)} placeholder="Optional" /></div></div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
