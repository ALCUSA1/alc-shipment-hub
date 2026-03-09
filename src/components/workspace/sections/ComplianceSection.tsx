import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ShipmentDataset } from "@/lib/shipment-dataset";

interface Props {
  data: ShipmentDataset["compliance"];
  onChange: (d: ShipmentDataset["compliance"]) => void;
  autoFilled?: boolean;
  isExport?: boolean;
}

export function ComplianceSection({ data, onChange, autoFilled, isExport = true }: Props) {
  const set = (f: keyof typeof data, v: string) => onChange({ ...data, [f]: v });
  const [showAesDetails, setShowAesDetails] = useState(!!data.itn || !!data.exportLicense || !!data.eccn);

  return (
    <section id="compliance" className="scroll-mt-8">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-foreground tracking-tight">Compliance & Insurance</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isExport ? "Export filing (AES/ITN), insurance — powers SLI and Insurance Certificate." : "Import compliance and insurance data."}
        </p>
      </div>

      <div className="space-y-4">
        {/* AES — only show full section for exports */}
        {isExport && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-secondary/20">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-foreground">Export Filing (AES)</span>
                {autoFilled && (
                  <Badge variant="outline" className="text-[9px] gap-0.5 text-accent border-accent/20 py-0 h-4">
                    <Zap className="h-2 w-2" /> Auto
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px] text-muted-foreground">USPPI Name</Label><Input className="mt-1 h-9 text-sm" value={data.exporterName} onChange={(e) => set("exporterName", e.target.value)} /></div>
                <div><Label className="text-[10px] text-muted-foreground">USPPI EIN</Label><Input className="mt-1 h-9 text-sm" value={data.exporterEin} onChange={(e) => set("exporterEin", e.target.value)} placeholder="XX-XXXXXXX" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px] text-muted-foreground">AES Citation</Label><Input className="mt-1 h-8 text-xs" value={data.aesType} onChange={(e) => set("aesType", e.target.value)} placeholder="e.g. NO EEI 30.37(a)" /></div>
                <div><Label className="text-[10px] text-muted-foreground">Destination Country</Label><Input className="mt-1 h-8 text-xs" value={data.countryOfUltimateDestination} onChange={(e) => set("countryOfUltimateDestination", e.target.value)} /></div>
              </div>

              {/* Progressive: detailed AES fields */}
              {!showAesDetails ? (
                <button onClick={() => setShowAesDetails(true)} className="text-[11px] text-accent hover:underline">
                  + ITN, license, ECCN details
                </button>
              ) : (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3 pt-1">
                  <div><Label className="text-[10px] text-muted-foreground">ITN Number</Label><Input className="mt-1 h-8 text-xs" value={data.itn} onChange={(e) => set("itn", e.target.value)} /></div>
                  <div><Label className="text-[10px] text-muted-foreground">Export License</Label><Input className="mt-1 h-8 text-xs" value={data.exportLicense} onChange={(e) => set("exportLicense", e.target.value)} /></div>
                  <div><Label className="text-[10px] text-muted-foreground">ECCN</Label><Input className="mt-1 h-8 text-xs" value={data.eccn} onChange={(e) => set("eccn", e.target.value)} /></div>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Insurance — always visible */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-secondary/20">
            <span className="text-[12px] font-semibold text-foreground">Insurance</span>
            {autoFilled && (
              <Badge variant="outline" className="text-[9px] gap-0.5 text-accent border-accent/20 py-0 h-4">
                <Zap className="h-2 w-2" /> Auto
              </Badge>
            )}
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Provider</Label><Input className="mt-1 h-9 text-sm" value={data.insuranceProvider} onChange={(e) => set("insuranceProvider", e.target.value)} /></div>
              <div><Label className="text-[10px] text-muted-foreground">Policy #</Label><Input className="mt-1 h-9 text-sm" value={data.insurancePolicy} onChange={(e) => set("insurancePolicy", e.target.value)} /></div>
              <div><Label className="text-[10px] text-muted-foreground">Coverage</Label><Input type="number" className="mt-1 h-9 text-sm" value={data.insuranceCoverage} onChange={(e) => set("insuranceCoverage", e.target.value)} /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
