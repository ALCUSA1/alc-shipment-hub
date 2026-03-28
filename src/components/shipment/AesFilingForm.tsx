import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Loader2 } from "lucide-react";

interface AesFilingFormProps {
  filing: any;
  onSaved: () => void;
}

const MOT_CODES = [
  { value: "10", label: "10 - Vessel, Non-containerized" },
  { value: "11", label: "11 - Vessel, Containerized" },
  { value: "20", label: "20 - Rail" },
  { value: "30", label: "30 - Truck" },
  { value: "40", label: "40 - Air" },
  { value: "50", label: "50 - Mail" },
  { value: "60", label: "60 - Passenger, Hand-carried" },
  { value: "70", label: "70 - Fixed Transport (Pipeline)" },
];

const FILING_OPTIONS = [
  { value: "1", label: "1 - Postdeparture" },
  { value: "2", label: "2 - Predeparture" },
  { value: "3", label: "3 - Downtime" },
  { value: "4", label: "4 - AES Direct" },
];

const CONSIGNEE_TYPES = [
  { value: "D", label: "D - Direct Consumer" },
  { value: "G", label: "G - Government Entity" },
  { value: "R", label: "R - Reseller" },
  { value: "O", label: "O - Other/Unknown" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC","PR","VI"
];

interface CommodityLine {
  code: string;
  description: string;
  quantity: number | null;
  value: number | null;
  d_f: string;
  shipping_weight_kg: number | null;
  vin_product_number: string;
  export_info_code: string;
  license_number: string;
  license_code: string;
}

export function AesFilingForm({ filing, onSaved }: AesFilingFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    exporter_name: filing.exporter_name || "",
    exporter_ein: filing.exporter_ein || "",
    usppi_address: filing.usppi_address || "",
    usppi_contact_name: filing.usppi_contact_name || "",
    usppi_phone: filing.usppi_phone || "",
    usppi_email: filing.usppi_email || "",
    export_date: filing.export_date || "",
    filing_option: filing.filing_option || "",
    shipment_reference_number: filing.shipment_reference_number || "",
    consignee_name: filing.consignee_name || "",
    consignee_address: filing.consignee_address || "",
    ultimate_consignee_type: filing.ultimate_consignee_type || "",
    authorized_agent_name: filing.authorized_agent_name || "",
    authorized_agent_address: filing.authorized_agent_address || "",
    authorized_agent_ein: filing.authorized_agent_ein || "",
    state_of_origin: filing.state_of_origin || "",
    country_of_destination: filing.country_of_destination || "",
    method_of_transportation: filing.method_of_transportation || "",
    vessel_name: filing.vessel_name || "",
    voyage_number: filing.voyage_number || "",
    carrier_name: filing.carrier_name || "",
    carrier_identification_code: filing.carrier_identification_code || "",
    port_of_export: filing.port_of_export || "",
    port_of_unlading: filing.port_of_unlading || "",
    loading_pier: filing.loading_pier || "",
    containerized: filing.containerized ?? false,
    hazardous_materials: filing.hazardous_materials ?? false,
    routed_export_transaction: filing.routed_export_transaction ?? false,
    related_parties: filing.related_parties ?? false,
    entry_number: filing.entry_number || "",
    in_bond_code: filing.in_bond_code || "",
    original_itn: filing.original_itn || "",
    xtn: filing.xtn || "",
    eei_exemption_citation: filing.eei_exemption_citation || "",
    aes_citation: filing.aes_citation || "",
    broker_name: filing.broker_name || "",
    broker_email: filing.broker_email || "",
    broker_ref: filing.broker_ref || "",
    notes: filing.notes || "",
  }));

  const [commodities, setCommodities] = useState<CommodityLine[]>(() => {
    const hts = Array.isArray(filing.hts_codes) ? filing.hts_codes : [];
    if (hts.length === 0) return [emptyCommodity()];
    return hts.map((h: any) => ({
      code: h.code || h.hts_code || "",
      description: h.description || h.commodity || "",
      quantity: h.quantity ?? null,
      value: h.value ?? null,
      d_f: h.d_f || "D",
      shipping_weight_kg: h.shipping_weight_kg ?? null,
      vin_product_number: h.vin_product_number || "",
      export_info_code: h.export_info_code || "",
      license_number: h.license_number || "",
      license_code: h.license_code || "",
    }));
  });

  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateCommodity = useCallback((idx: number, field: string, value: any) => {
    setCommodities((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }, []);

  const addCommodity = () => setCommodities((prev) => [...prev, emptyCommodity()]);
  const removeCommodity = (idx: number) => setCommodities((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      const htsCodes = commodities.filter(c => c.code).map((c) => ({
        code: c.code,
        description: c.description,
        quantity: c.quantity,
        value: c.value,
        d_f: c.d_f,
        shipping_weight_kg: c.shipping_weight_kg,
        vin_product_number: c.vin_product_number,
        export_info_code: c.export_info_code,
        license_number: c.license_number,
        license_code: c.license_code,
      }));

      const { error } = await supabase
        .from("customs_filings")
        .update({
          ...form,
          hts_codes: htsCodes.length > 0 ? htsCodes : null,
        } as any)
        .eq("id", filing.id);

      if (error) throw error;
      toast({ title: "Filing Saved", description: "AES filing data has been updated." });
      onSaved();
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader number={1} title="U.S. Principal Party in Interest (USPPI)" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="USPPI Name *" value={form.exporter_name} onChange={(v) => updateField("exporter_name", v)} />
        <Field label="USPPI EIN *" value={form.exporter_ein} onChange={(v) => updateField("exporter_ein", v)} placeholder="XX-XXXXXXX" />
        <Field label="Contact Name" value={form.usppi_contact_name} onChange={(v) => updateField("usppi_contact_name", v)} className="sm:col-span-2" />
        <Field label="Address" value={form.usppi_address} onChange={(v) => updateField("usppi_address", v)} className="sm:col-span-2" />
        <Field label="Phone" value={form.usppi_phone} onChange={(v) => updateField("usppi_phone", v)} />
        <Field label="Email" value={form.usppi_email} onChange={(v) => updateField("usppi_email", v)} />
      </div>

      <Separator />

      <SectionHeader number={2} title="Date of Exportation & Filing Option" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date of Exportation *" value={form.export_date} onChange={(v) => updateField("export_date", v)} type="date" />
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase">Filing Option</Label>
          <Select value={form.filing_option} onValueChange={(v) => updateField("filing_option", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select filing option" /></SelectTrigger>
            <SelectContent>
              {FILING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <SectionHeader number={3} title="Transportation Reference No." />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Shipment Reference No." value={form.shipment_reference_number} onChange={(v) => updateField("shipment_reference_number", v)} />
        <Field label="XTN (External Transaction No.)" value={form.xtn} onChange={(v) => updateField("xtn", v)} />
      </div>

      <Separator />

      <SectionHeader number={4} title="Ultimate Consignee" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Consignee Name *" value={form.consignee_name} onChange={(v) => updateField("consignee_name", v)} />
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase">Consignee Type</Label>
          <Select value={form.ultimate_consignee_type} onValueChange={(v) => updateField("ultimate_consignee_type", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {CONSIGNEE_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Field label="Consignee Address" value={form.consignee_address} onChange={(v) => updateField("consignee_address", v)} className="sm:col-span-2" />
      </div>

      <Separator />

      <SectionHeader number={5} title="Forwarding Agent / Authorized Agent" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Agent Name" value={form.authorized_agent_name} onChange={(v) => updateField("authorized_agent_name", v)} />
        <Field label="Agent EIN" value={form.authorized_agent_ein} onChange={(v) => updateField("authorized_agent_ein", v)} />
        <Field label="Agent Address" value={form.authorized_agent_address} onChange={(v) => updateField("authorized_agent_address", v)} className="sm:col-span-2" />
      </div>

      <Separator />

      <SectionHeader number={6} title="Origin & Destination" />
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase">State of Origin (FTZ)</Label>
          <Select value={form.state_of_origin} onValueChange={(v) => updateField("state_of_origin", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>
              {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Field label="Country of Ultimate Destination *" value={form.country_of_destination} onChange={(v) => updateField("country_of_destination", v)} />
      </div>

      <Separator />

      <SectionHeader number={8} title="Method of Transportation & Carrier" />
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase">Method of Transportation</Label>
          <Select value={form.method_of_transportation} onValueChange={(v) => updateField("method_of_transportation", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select MOT code" /></SelectTrigger>
            <SelectContent>
              {MOT_CODES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Field label="Carrier ID Code (SCAC)" value={form.carrier_identification_code} onChange={(v) => updateField("carrier_identification_code", v)} placeholder="e.g., HLCU" />
        <Field label="Carrier / Conveyance Name" value={form.vessel_name} onChange={(v) => updateField("vessel_name", v)} />
        <Field label="Voyage / Flight No." value={form.voyage_number} onChange={(v) => updateField("voyage_number", v)} />
      </div>

      <Separator />

      <SectionHeader number={10} title="Ports" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Port of Export *" value={form.port_of_export} onChange={(v) => updateField("port_of_export", v)} />
        <Field label="Port of Unlading *" value={form.port_of_unlading} onChange={(v) => updateField("port_of_unlading", v)} />
        <Field label="Loading Pier" value={form.loading_pier} onChange={(v) => updateField("loading_pier", v)} />
      </div>

      <Separator />

      <SectionHeader number={12} title="Additional Details" />
      <div className="grid sm:grid-cols-2 gap-4">
        <ToggleField label="Containerized" checked={form.containerized} onChange={(v) => updateField("containerized", v)} />
        <ToggleField label="Hazardous Materials" checked={form.hazardous_materials} onChange={(v) => updateField("hazardous_materials", v)} />
        <ToggleField label="Routed Export Transaction" checked={form.routed_export_transaction} onChange={(v) => updateField("routed_export_transaction", v)} />
        <ToggleField label="Related Parties" checked={form.related_parties} onChange={(v) => updateField("related_parties", v)} />
        <Field label="In Bond Code" value={form.in_bond_code} onChange={(v) => updateField("in_bond_code", v)} placeholder="e.g., 70" />
        <Field label="Entry Number" value={form.entry_number} onChange={(v) => updateField("entry_number", v)} />
        <Field label="Original ITN" value={form.original_itn} onChange={(v) => updateField("original_itn", v)} />
        <Field label="EEI Exemption Citation" value={form.eei_exemption_citation} onChange={(v) => updateField("eei_exemption_citation", v)} />
        <Field label="AES Citation" value={form.aes_citation} onChange={(v) => updateField("aes_citation", v)} />
      </div>

      <Separator />

      <SectionHeader number={13} title="Broker Information" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Broker Name" value={form.broker_name} onChange={(v) => updateField("broker_name", v)} />
        <Field label="Broker Email" value={form.broker_email} onChange={(v) => updateField("broker_email", v)} />
        <Field label="Broker Reference" value={form.broker_ref} onChange={(v) => updateField("broker_ref", v)} />
      </div>

      <Separator />

      <SectionHeader number={20} title="Commodity Line Items (Schedule B / HTS)" />
      <div className="space-y-4">
        {commodities.map((line, idx) => (
          <div key={idx} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">Line {idx + 1}</Badge>
              {commodities.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeCommodity(idx)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Schedule B / HTS *" value={line.code} onChange={(v) => updateCommodity(idx, "code", v)} placeholder="e.g., 8471.30.0100" />
              <Field label="Description" value={line.description} onChange={(v) => updateCommodity(idx, "description", v)} className="sm:col-span-2" />
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase">D/F Indicator</Label>
                <Select value={line.d_f} onValueChange={(v) => updateCommodity(idx, "d_f", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D">D - Domestic</SelectItem>
                    <SelectItem value="F">F - Foreign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field label="Quantity" value={line.quantity?.toString() || ""} onChange={(v) => updateCommodity(idx, "quantity", v ? Number(v) : null)} type="number" />
              <Field label="Value (USD)" value={line.value?.toString() || ""} onChange={(v) => updateCommodity(idx, "value", v ? Number(v) : null)} type="number" />
              <Field label="Shipping Weight (KG)" value={line.shipping_weight_kg?.toString() || ""} onChange={(v) => updateCommodity(idx, "shipping_weight_kg", v ? Number(v) : null)} type="number" />
              <Field label="VIN / Product No." value={line.vin_product_number} onChange={(v) => updateCommodity(idx, "vin_product_number", v)} />
              <Field label="Export Info Code" value={line.export_info_code} onChange={(v) => updateCommodity(idx, "export_info_code", v)} placeholder="e.g., OS" />
              <Field label="License Code" value={line.license_code} onChange={(v) => updateCommodity(idx, "license_code", v)} placeholder="e.g., C33" />
              <Field label="License Number" value={line.license_number} onChange={(v) => updateCommodity(idx, "license_number", v)} placeholder="e.g., NLR" />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addCommodity}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Commodity Line
        </Button>
      </div>

      <Separator />

      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase">Notes</Label>
        <Textarea
          className="mt-1"
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Internal notes about this filing..."
          rows={3}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Filing Data
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-[10px] h-5 w-5 rounded-full flex items-center justify-center p-0">
        {number}
      </Badge>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, className = "",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground uppercase">{label}</Label>
      <Input
        className="mt-1"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function emptyCommodity(): CommodityLine {
  return {
    code: "", description: "", quantity: null, value: null,
    d_f: "D", shipping_weight_kg: null, vin_product_number: "",
    export_info_code: "", license_number: "", license_code: "",
  };
}
