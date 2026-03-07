import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Plus, Send, Trash2, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { CustomsMilestones } from "./CustomsMilestones";

interface HtsLine {
  hts_code: string;
  description: string;
  value: string;
  quantity: string;
  unit: string;
}

const EMPTY_HTS: HtsLine = { hts_code: "", description: "", value: "", quantity: "", unit: "KG" };

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  pending_review: "bg-yellow-100 text-yellow-700",
  sent_to_broker: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-destructive/10 text-destructive",
  filed: "bg-accent/10 text-accent",
};

interface CustomsFilingProps {
  shipmentId: string;
  shipment: {
    shipment_ref: string;
    origin_port: string | null;
    destination_port: string | null;
    vessel: string | null;
    voyage: string | null;
    etd: string | null;
  };
}

export function CustomsFiling({ shipmentId, shipment }: CustomsFilingProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: filings = [], isLoading } = useQuery({
    queryKey: ["customs-filings", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customs_filings")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    filing_type: "AES",
    exporter_name: "",
    exporter_ein: "",
    consignee_name: "",
    consignee_address: "",
    country_of_destination: "",
    port_of_export: shipment.origin_port || "",
    port_of_unlading: shipment.destination_port || "",
    vessel_name: shipment.vessel || "",
    voyage_number: shipment.voyage || "",
    export_date: shipment.etd || "",
    broker_name: "",
    broker_email: "",
    notes: "",
    hts_lines: [{ ...EMPTY_HTS }] as HtsLine[],
  });

  const resetForm = () => {
    setForm({
      filing_type: "AES",
      exporter_name: "",
      exporter_ein: "",
      consignee_name: "",
      consignee_address: "",
      country_of_destination: "",
      port_of_export: shipment.origin_port || "",
      port_of_unlading: shipment.destination_port || "",
      vessel_name: shipment.vessel || "",
      voyage_number: shipment.voyage || "",
      export_date: shipment.etd || "",
      broker_name: "",
      broker_email: "",
      notes: "",
      hts_lines: [{ ...EMPTY_HTS }],
    });
    setEditingId(null);
  };

  const saveFiling = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        shipment_id: shipmentId,
        user_id: user.id,
        filing_type: form.filing_type,
        exporter_name: form.exporter_name || null,
        exporter_ein: form.exporter_ein || null,
        consignee_name: form.consignee_name || null,
        consignee_address: form.consignee_address || null,
        country_of_destination: form.country_of_destination || null,
        port_of_export: form.port_of_export || null,
        port_of_unlading: form.port_of_unlading || null,
        vessel_name: form.vessel_name || null,
        voyage_number: form.voyage_number || null,
        export_date: form.export_date || null,
        broker_name: form.broker_name || null,
        broker_email: form.broker_email || null,
        notes: form.notes || null,
        hts_codes: form.hts_lines.filter((l) => l.hts_code) as unknown as Record<string, unknown>[],
        status: "draft",
      };

      if (editingId) {
        const { error } = await supabase.from("customs_filings").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customs_filings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customs-filings", shipmentId] });
      toast.success(editingId ? "Filing updated" : "Filing saved as draft");
      resetForm();
    },
    onError: () => toast.error("Failed to save filing"),
  });

  const sendToBroker = useMutation({
    mutationFn: async (filingId: string) => {
      const { error } = await supabase
        .from("customs_filings")
        .update({ status: "sent_to_broker", submitted_at: new Date().toISOString() })
        .eq("id", filingId);
      if (error) throw error;

      // Create milestone
      const { error: mErr } = await supabase.from("customs_milestones").insert({
        filing_id: filingId,
        milestone: "Sent to Broker",
        status: "completed",
      });
      if (mErr) throw mErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customs-filings", shipmentId] });
      queryClient.invalidateQueries({ queryKey: ["customs-milestones"] });
      toast.success("Filing sent to broker");
      setConfirmOpen(false);
    },
    onError: () => toast.error("Failed to send to broker"),
  });

  const [pendingSendId, setPendingSendId] = useState<string | null>(null);

  const handleSendClick = (id: string) => {
    setPendingSendId(id);
    setConfirmOpen(true);
  };

  const handleConfirmSend = () => {
    if (pendingSendId) sendToBroker.mutate(pendingSendId);
  };

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateHtsLine = (idx: number, field: keyof HtsLine, value: string) => {
    setForm((prev) => ({
      ...prev,
      hts_lines: prev.hts_lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    }));
  };

  const addHtsLine = () => setForm((prev) => ({ ...prev, hts_lines: [...prev.hts_lines, { ...EMPTY_HTS }] }));

  const removeHtsLine = (idx: number) =>
    setForm((prev) => ({ ...prev, hts_lines: prev.hts_lines.filter((_, i) => i !== idx) }));

  const loadFiling = (filing: any) => {
    setEditingId(filing.id);
    const codes = Array.isArray(filing.hts_codes) ? filing.hts_codes : [];
    setForm({
      filing_type: filing.filing_type || "AES",
      exporter_name: filing.exporter_name || "",
      exporter_ein: filing.exporter_ein || "",
      consignee_name: filing.consignee_name || "",
      consignee_address: filing.consignee_address || "",
      country_of_destination: filing.country_of_destination || "",
      port_of_export: filing.port_of_export || "",
      port_of_unlading: filing.port_of_unlading || "",
      vessel_name: filing.vessel_name || "",
      voyage_number: filing.voyage_number || "",
      export_date: filing.export_date || "",
      broker_name: filing.broker_name || "",
      broker_email: filing.broker_email || "",
      notes: filing.notes || "",
      hts_lines: codes.length > 0 ? codes.map((c: any) => ({
        hts_code: c.hts_code || "",
        description: c.description || "",
        value: c.value || "",
        quantity: c.quantity || "",
        unit: c.unit || "KG",
      })) : [{ ...EMPTY_HTS }],
    });
  };

  const formatStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            US Customs — AES/EEI Filing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing filings */}
          {filings.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Filings</h4>
              {filings.map((f: any) => (
                <div key={f.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-3.5 w-3.5 text-accent" />
                      <span className="text-sm font-medium">{f.filing_type}</span>
                      {f.itn && <span className="text-xs text-muted-foreground">ITN: {f.itn}</span>}
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[f.status] || ""}`}>
                      {formatStatus(f.status)}
                    </Badge>
                  </div>
                  {f.broker_name && (
                    <p className="text-xs text-muted-foreground">Broker: {f.broker_name}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {f.status === "draft" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => loadFiling(f)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="electric" className="h-7 text-xs" onClick={() => handleSendClick(f.id)}>
                          <Send className="h-3 w-3 mr-1" />
                          Send to Broker
                        </Button>
                      </>
                    )}
                  </div>
                  {/* Milestones */}
                  <CustomsMilestones filingId={f.id} />
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Filing form */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              {editingId ? "Edit Filing" : "New Filing"}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Filing Type</Label>
                <Select value={form.filing_type} onValueChange={(v) => updateField("filing_type", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AES">AES (Export)</SelectItem>
                    <SelectItem value="EEI">EEI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Export Date</Label>
                <Input className="h-8 text-xs" type="date" value={form.export_date} onChange={(e) => updateField("export_date", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Exporter Name</Label>
                <Input className="h-8 text-xs" value={form.exporter_name} onChange={(e) => updateField("exporter_name", e.target.value)} placeholder="Company name" />
              </div>
              <div>
                <Label className="text-xs">Exporter EIN</Label>
                <Input className="h-8 text-xs" value={form.exporter_ein} onChange={(e) => updateField("exporter_ein", e.target.value)} placeholder="XX-XXXXXXX" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Consignee Name</Label>
                <Input className="h-8 text-xs" value={form.consignee_name} onChange={(e) => updateField("consignee_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Destination Country</Label>
                <Input className="h-8 text-xs" value={form.country_of_destination} onChange={(e) => updateField("country_of_destination", e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Consignee Address</Label>
              <Input className="h-8 text-xs" value={form.consignee_address} onChange={(e) => updateField("consignee_address", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Port of Export</Label>
                <Input className="h-8 text-xs" value={form.port_of_export} onChange={(e) => updateField("port_of_export", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Port of Unlading</Label>
                <Input className="h-8 text-xs" value={form.port_of_unlading} onChange={(e) => updateField("port_of_unlading", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vessel</Label>
                <Input className="h-8 text-xs" value={form.vessel_name} onChange={(e) => updateField("vessel_name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Voyage</Label>
                <Input className="h-8 text-xs" value={form.voyage_number} onChange={(e) => updateField("voyage_number", e.target.value)} />
              </div>
            </div>

            <Separator />

            {/* HTS Lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">HTS Schedule B Lines</Label>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={addHtsLine}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Line
                </Button>
              </div>
              <div className="space-y-3">
                {form.hts_lines.map((line, idx) => (
                  <div key={idx} className="border border-border rounded p-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-medium">Line {idx + 1}</span>
                      {form.hts_lines.length > 1 && (
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => removeHtsLine(idx)}>
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">HTS Code</Label>
                        <Input className="h-7 text-xs" value={line.hts_code} onChange={(e) => updateHtsLine(idx, "hts_code", e.target.value)} placeholder="XXXX.XX.XXXX" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Description</Label>
                        <Input className="h-7 text-xs" value={line.description} onChange={(e) => updateHtsLine(idx, "description", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">Value (USD)</Label>
                        <Input className="h-7 text-xs" value={line.value} onChange={(e) => updateHtsLine(idx, "value", e.target.value)} placeholder="0.00" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Quantity</Label>
                        <Input className="h-7 text-xs" value={line.quantity} onChange={(e) => updateHtsLine(idx, "quantity", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-[10px]">Unit</Label>
                        <Select value={line.unit} onValueChange={(v) => updateHtsLine(idx, "unit", v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="KG">KG</SelectItem>
                            <SelectItem value="LB">LB</SelectItem>
                            <SelectItem value="PCS">PCS</SelectItem>
                            <SelectItem value="MT">MT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Broker info */}
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">Customs Broker</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Broker Name</Label>
                  <Input className="h-8 text-xs" value={form.broker_name} onChange={(e) => updateField("broker_name", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Broker Email</Label>
                  <Input className="h-8 text-xs" type="email" value={form.broker_email} onChange={(e) => updateField("broker_email", e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea className="text-xs min-h-[60px]" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Special instructions for the broker..." />
            </div>

            <div className="flex gap-2">
              <Button variant="electric" size="sm" onClick={() => saveFiling.mutate()} disabled={saveFiling.isPending}>
                {editingId ? "Update Draft" : "Save as Draft"}
              </Button>
              {editingId && (
                <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Filing to Broker?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the AES/EEI filing for <strong>{shipment.shipment_ref}</strong> as sent to your customs broker. The broker will need to review and file with US Customs (ACE).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend} disabled={sendToBroker.isPending}>
              Confirm & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
