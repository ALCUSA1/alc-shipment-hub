import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete, type StructuredAddress } from "@/components/shared/AddressAutocomplete";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Zap, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import type { ValidationErrors } from "@/lib/wizard-validation";

export interface ComplianceData {
  // USPPI
  exporterName: string;
  exporterEin: string;
  exporterAddress: string;
  exporterContactName: string;
  exporterPhone: string;
  exporterEmail: string;
  // Consignee
  consigneeName: string;
  consigneeAddress: string;
  consigneeType: string;
  // Authorized Agent
  agentName: string;
  agentAddress: string;
  agentEin: string;
  // Filing & Transport
  filingOption: string;
  dateOfExportation: string;
  transportRefNumber: string;
  shipmentRefNumber: string;
  methodOfTransportation: string;
  exportingCarrier: string;
  carrierIdCode: string;
  portOfExport: string;
  portOfUnlading: string;
  stateOfOrigin: string;
  countryOfDestination: string;
  containerized: string;
  hazardousMaterials: string;
  inBondCode: string;
  routedExport: string;
  relatedParties: string;
  entryNumber: string;
  eeiExemptionCitation: string;
  // Insurance
  insuranceProvider: string;
  insurancePolicy: string;
  insuranceCoverage: string;
}

export const EMPTY_COMPLIANCE: ComplianceData = {
  exporterName: "", exporterEin: "", exporterAddress: "", exporterContactName: "",
  exporterPhone: "", exporterEmail: "",
  consigneeName: "", consigneeAddress: "", consigneeType: "",
  agentName: "", agentAddress: "", agentEin: "",
  filingOption: "2", dateOfExportation: "", transportRefNumber: "", shipmentRefNumber: "",
  methodOfTransportation: "", exportingCarrier: "", carrierIdCode: "",
  portOfExport: "", portOfUnlading: "", stateOfOrigin: "", countryOfDestination: "",
  containerized: "yes", hazardousMaterials: "no", inBondCode: "70", routedExport: "no",
  relatedParties: "no", entryNumber: "", eeiExemptionCitation: "",
  insuranceProvider: "", insurancePolicy: "", insuranceCoverage: "",
};

/** Fields that can be auto-filled from earlier wizard steps or profile */
export interface AutoFillSource {
  originPort?: string;
  destinationPort?: string;
  carrier?: string;
  containerType?: string;
  shipmentType?: string;
  // From user profile / company
  companyName?: string;
  companyEin?: string;
  companyAddress?: string;
  companyContactName?: string;
  companyPhone?: string;
  companyEmail?: string;
  // Insurance from company
  insuranceProvider?: string;
  insurancePolicy?: string;
  insuranceCoverage?: string;
}

interface ComplianceStepProps {
  data: ComplianceData;
  onChange: (data: ComplianceData) => void;
  autoFillSource?: AutoFillSource;
  errors?: ValidationErrors;
}

const FILING_OPTIONS = [
  { value: "1", label: "1 — Post-departure" },
  { value: "2", label: "2 — Pre-departure" },
  { value: "4", label: "4 — AES downtime" },
];

const TRANSPORT_METHODS = [
  { value: "10", label: "10 — Vessel, non-containerized" },
  { value: "11", label: "11 — Vessel, containerized" },
  { value: "20", label: "20 — Rail, non-containerized" },
  { value: "21", label: "21 — Rail, containerized" },
  { value: "30", label: "30 — Truck" },
  { value: "40", label: "40 — Air" },
  { value: "60", label: "60 — Passenger, hand-carried" },
];

const CONSIGNEE_TYPES = [
  { value: "D", label: "D — Direct consumer" },
  { value: "G", label: "G — Government entity" },
  { value: "R", label: "R — Reseller" },
  { value: "O", label: "O — Other/Unknown" },
];

const IN_BOND_CODES = [
  { value: "70", label: "70 — Not shipped in-bond" },
  { value: "36", label: "36 — Warehouse withdrawal, T&E" },
  { value: "37", label: "37 — Warehouse withdrawal, IE" },
  { value: "67", label: "67 — IE from a FTZ" },
  { value: "68", label: "68 — T&E from a FTZ" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

function AutoBadge() {
  return (
    <Badge variant="outline" className="text-[9px] gap-0.5 text-accent border-accent/20 py-0 h-4 ml-2">
      <Zap className="h-2 w-2" /> Auto
    </Badge>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-[10px] text-destructive mt-0.5">{error}</p>;
}

function Field({ label, auto, children, className, error }: { label: string; auto?: boolean; children: React.ReactNode; className?: string; error?: string }) {
  return (
    <div className={className}>
      <Label className="text-[10px] text-muted-foreground flex items-center">
        {label}{auto && <AutoBadge />}
      </Label>
      {children}
      <FieldError error={error} />
    </div>
  );
}

export function ComplianceStep({ data, onChange, autoFillSource, errors = {} }: ComplianceStepProps) {
  const set = (field: keyof ComplianceData, value: string) =>
    onChange({ ...data, [field]: value });

  const [showAgent, setShowAgent] = useState(!!(data.agentName || data.agentAddress));
  const [showAdvanced, setShowAdvanced] = useState(
    !!(data.inBondCode && data.inBondCode !== "70") || !!data.entryNumber || !!data.eeiExemptionCitation
  );

  // Auto-fill on mount / when source changes
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!autoFillSource) return;
    const updates: Partial<ComplianceData> = {};
    const filled = new Set<string>();

    const tryFill = (field: keyof ComplianceData, value: string | undefined) => {
      if (value && !data[field]) {
        updates[field] = value;
        filled.add(field);
      }
    };

    // From wizard steps
    tryFill("portOfExport", autoFillSource.originPort);
    tryFill("portOfUnlading", autoFillSource.destinationPort);
    tryFill("countryOfDestination", autoFillSource.destinationPort?.slice(-2)); // last 2 chars might be country
    tryFill("dateOfExportation", new Date().toISOString().split("T")[0]);

    if (autoFillSource.carrier) {
      tryFill("exportingCarrier", autoFillSource.carrier);
    }

    if (autoFillSource.containerType) {
      tryFill("containerized", "yes");
      tryFill("methodOfTransportation", "11"); // vessel containerized
    }

    // From company profile
    tryFill("exporterName", autoFillSource.companyName);
    tryFill("exporterEin", autoFillSource.companyEin);
    tryFill("exporterAddress", autoFillSource.companyAddress);
    tryFill("exporterContactName", autoFillSource.companyContactName);
    tryFill("exporterPhone", autoFillSource.companyPhone);
    tryFill("exporterEmail", autoFillSource.companyEmail);

    // Insurance from company
    tryFill("insuranceProvider", autoFillSource.insuranceProvider);
    tryFill("insurancePolicy", autoFillSource.insurancePolicy);
    tryFill("insuranceCoverage", autoFillSource.insuranceCoverage);

    if (Object.keys(updates).length > 0) {
      onChange({ ...data, ...updates });
      setAutoFilledFields(prev => new Set([...prev, ...filled]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAuto = (field: string) => autoFilledFields.has(field);

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Complete AES / EEI filing details. Fields marked with <Zap className="h-2.5 w-2.5 inline text-accent" /> were auto-filled from your earlier entries or company profile.
      </p>

      {/* ── Section 1: USPPI ── */}
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">1. U.S. Principal Party in Interest (USPPI)</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="USPPI Name *" auto={isAuto("exporterName")} error={errors.exporterName}>
            <Input className={`mt-1 h-8 text-xs ${errors.exporterName ? "border-destructive" : ""}`} value={data.exporterName} onChange={(e) => set("exporterName", e.target.value)} placeholder="Legal entity name" />
          </Field>
          <Field label="USPPI EIN (IRS) or ID Number *" auto={isAuto("exporterEin")} error={errors.exporterEin}>
            <Input className={`mt-1 h-8 text-xs ${errors.exporterEin ? "border-destructive" : ""}`} value={data.exporterEin} onChange={(e) => set("exporterEin", e.target.value)} placeholder="XX-XXXXXXX" />
          </Field>
        </div>
        <Field label="USPPI Address *" auto={isAuto("exporterAddress")} error={errors.exporterAddress}>
          <Input className={`mt-1 h-8 text-xs ${errors.exporterAddress ? "border-destructive" : ""}`} value={data.exporterAddress} onChange={(e) => set("exporterAddress", e.target.value)} placeholder="Street, City, State, ZIP, Country" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Contact Name" auto={isAuto("exporterContactName")}>
            <Input className="mt-1 h-8 text-xs" value={data.exporterContactName} onChange={(e) => set("exporterContactName", e.target.value)} />
          </Field>
          <Field label="Phone" auto={isAuto("exporterPhone")}>
            <Input className="mt-1 h-8 text-xs" value={data.exporterPhone} onChange={(e) => set("exporterPhone", e.target.value)} />
          </Field>
          <Field label="Email" auto={isAuto("exporterEmail")} error={errors.exporterEmail}>
            <Input className={`mt-1 h-8 text-xs ${errors.exporterEmail ? "border-destructive" : ""}`} value={data.exporterEmail} onChange={(e) => set("exporterEmail", e.target.value)} />
          </Field>
        </div>
      </div>

      {/* ── Section 2: Ultimate Consignee ── */}
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">4. Ultimate Consignee</h4>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Consignee Name *" className="col-span-2" error={errors.consigneeName}>
            <Input className={`mt-1 h-8 text-xs ${errors.consigneeName ? "border-destructive" : ""}`} value={data.consigneeName} onChange={(e) => set("consigneeName", e.target.value)} />
          </Field>
          <Field label="Consignee Type *" error={errors.consigneeType}>
            <Select value={data.consigneeType} onValueChange={(v) => set("consigneeType", v)}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {CONSIGNEE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Consignee Address *" error={errors.consigneeAddress}>
          <Input className={`mt-1 h-8 text-xs ${errors.consigneeAddress ? "border-destructive" : ""}`} value={data.consigneeAddress} onChange={(e) => set("consigneeAddress", e.target.value)} placeholder="Full address including country code" />
        </Field>
      </div>

      {/* ── Section 3: Authorized Agent (collapsible) ── */}
      <div className="rounded-lg border bg-muted/20 overflow-hidden">
        <button
          onClick={() => setShowAgent(!showAgent)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-foreground uppercase tracking-wide hover:bg-muted/30 transition-colors"
        >
          <span>5. Authorized Agent (Forwarder)</span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showAgent ? "rotate-180" : ""}`} />
        </button>
        {showAgent && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Agent Name">
                <Input className="mt-1 h-8 text-xs" value={data.agentName} onChange={(e) => set("agentName", e.target.value)} />
              </Field>
              <Field label="Agent EIN" error={errors.agentEin}>
                <Input className={`mt-1 h-8 text-xs ${errors.agentEin ? "border-destructive" : ""}`} value={data.agentEin} onChange={(e) => set("agentEin", e.target.value)} />
              </Field>
            </div>
            <Field label="Agent Address">
              <Input className="mt-1 h-8 text-xs" value={data.agentAddress} onChange={(e) => set("agentAddress", e.target.value)} />
            </Field>
          </div>
        )}
      </div>

      {/* ── Section 4: Filing & Transport ── */}
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Filing & Transportation</h4>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Filing Option *" auto={isAuto("filingOption")} error={errors.filingOption}>
            <Select value={data.filingOption} onValueChange={(v) => set("filingOption", v)}>
              <SelectTrigger className={`mt-1 h-8 text-xs ${errors.filingOption ? "border-destructive" : ""}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {FILING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date of Exportation *" auto={isAuto("dateOfExportation")} error={errors.dateOfExportation}>
            <Input type="date" className={`mt-1 h-8 text-xs ${errors.dateOfExportation ? "border-destructive" : ""}`} value={data.dateOfExportation} onChange={(e) => set("dateOfExportation", e.target.value)} />
          </Field>
          <Field label="Method of Transportation *" auto={isAuto("methodOfTransportation")} error={errors.methodOfTransportation}>
            <Select value={data.methodOfTransportation} onValueChange={(v) => set("methodOfTransportation", v)}>
              <SelectTrigger className={`mt-1 h-8 text-xs ${errors.methodOfTransportation ? "border-destructive" : ""}`}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {TRANSPORT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Exporting Carrier *" auto={isAuto("exportingCarrier")} error={errors.exportingCarrier}>
            <Input className={`mt-1 h-8 text-xs ${errors.exportingCarrier ? "border-destructive" : ""}`} value={data.exportingCarrier} onChange={(e) => set("exportingCarrier", e.target.value)} placeholder="e.g. CCNI ANGOL V.533W" />
          </Field>
          <Field label="Carrier ID Code" auto={isAuto("carrierIdCode")}>
            <Input className="mt-1 h-8 text-xs" value={data.carrierIdCode} onChange={(e) => set("carrierIdCode", e.target.value)} placeholder="e.g. HLCU" />
          </Field>
          <Field label="Transportation Ref #">
            <Input className="mt-1 h-8 text-xs" value={data.transportRefNumber} onChange={(e) => set("transportRefNumber", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Port of Export *" auto={isAuto("portOfExport")} error={errors.portOfExport}>
            <Input className={`mt-1 h-8 text-xs ${errors.portOfExport ? "border-destructive" : ""}`} value={data.portOfExport} onChange={(e) => set("portOfExport", e.target.value)} placeholder="e.g. 1703 — SAVANNAH, GA" />
          </Field>
          <Field label="Port of Unlading *" auto={isAuto("portOfUnlading")} error={errors.portOfUnlading}>
            <Input className={`mt-1 h-8 text-xs ${errors.portOfUnlading ? "border-destructive" : ""}`} value={data.portOfUnlading} onChange={(e) => set("portOfUnlading", e.target.value)} placeholder="e.g. 55224 — HO CHI MINH" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="State of Origin *" error={errors.stateOfOrigin}>
            <Select value={data.stateOfOrigin} onValueChange={(v) => set("stateOfOrigin", v)}>
              <SelectTrigger className={`mt-1 h-8 text-xs ${errors.stateOfOrigin ? "border-destructive" : ""}`}><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Country of Destination *" auto={isAuto("countryOfDestination")} error={errors.countryOfDestination}>
            <Input className={`mt-1 h-8 text-xs ${errors.countryOfDestination ? "border-destructive" : ""}`} value={data.countryOfDestination} onChange={(e) => set("countryOfDestination", e.target.value)} placeholder="e.g. VN" />
          </Field>
          <Field label="Shipment Ref #">
            <Input className="mt-1 h-8 text-xs" value={data.shipmentRefNumber} onChange={(e) => set("shipmentRefNumber", e.target.value)} />
          </Field>
        </div>

        {/* Yes/No toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Switch checked={data.containerized === "yes"} onCheckedChange={(v) => set("containerized", v ? "yes" : "no")} className="scale-75" />
            <span className="text-[10px] text-muted-foreground">Containerized</span>
            {isAuto("containerized") && <AutoBadge />}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={data.hazardousMaterials === "yes"} onCheckedChange={(v) => set("hazardousMaterials", v ? "yes" : "no")} className="scale-75" />
            <span className="text-[10px] text-muted-foreground">Hazardous Materials</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={data.routedExport === "yes"} onCheckedChange={(v) => set("routedExport", v ? "yes" : "no")} className="scale-75" />
            <span className="text-[10px] text-muted-foreground">Routed Export</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={data.relatedParties === "yes"} onCheckedChange={(v) => set("relatedParties", v ? "yes" : "no")} className="scale-75" />
            <span className="text-[10px] text-muted-foreground">Related Parties</span>
          </div>
        </div>
      </div>

      {/* ── Advanced Filing (collapsible) ── */}
      <div className="rounded-lg border bg-muted/20 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-foreground uppercase tracking-wide hover:bg-muted/30 transition-colors"
        >
          <span>Advanced Filing Details</span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>
        {showAdvanced && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Field label="In Bond Code">
                <Select value={data.inBondCode} onValueChange={(v) => set("inBondCode", v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IN_BOND_CODES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Entry Number">
                <Input className="mt-1 h-8 text-xs" value={data.entryNumber} onChange={(e) => set("entryNumber", e.target.value)} />
              </Field>
              <Field label="EEI Exemption Citation">
                <Input className="mt-1 h-8 text-xs" value={data.eeiExemptionCitation} onChange={(e) => set("eeiExemptionCitation", e.target.value)} placeholder="e.g. NO EEI 30.37(a)" />
              </Field>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Insurance ── */}
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Insurance Certificate</h4>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Insurance Provider" auto={isAuto("insuranceProvider")}>
            <Input className="mt-1 h-8 text-xs" value={data.insuranceProvider} onChange={(e) => set("insuranceProvider", e.target.value)} />
          </Field>
          <Field label="Policy Number" auto={isAuto("insurancePolicy")}>
            <Input className="mt-1 h-8 text-xs" value={data.insurancePolicy} onChange={(e) => set("insurancePolicy", e.target.value)} />
          </Field>
          <Field label="Coverage Amount (USD)" auto={isAuto("insuranceCoverage")}>
            <Input type="number" className="mt-1 h-8 text-xs" value={data.insuranceCoverage} onChange={(e) => set("insuranceCoverage", e.target.value)} placeholder="e.g. 50000" />
          </Field>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/60 italic">
        Commodity line items (HTS codes, quantities, values) will be captured in the shipment workspace after booking.
      </p>
    </>
  );
}
