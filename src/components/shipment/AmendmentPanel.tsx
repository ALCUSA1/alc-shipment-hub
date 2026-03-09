import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileEdit, Plus, AlertTriangle, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const AMENDMENT_TYPES = [
  { value: "bl_correction", label: "B/L Correction" },
  { value: "si_amendment", label: "SI Amendment" },
  { value: "consignee_change", label: "Consignee Change" },
  { value: "destination_change", label: "Destination Change" },
  { value: "cargo_amendment", label: "Cargo Amendment" },
  { value: "release_type_change", label: "Release Type Change" },
  { value: "other", label: "Other" },
];

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-destructive/10 text-destructive",
  completed: "bg-accent/10 text-accent",
  pending_payment: "bg-orange-100 text-orange-700",
};

interface AmendmentPanelProps {
  shipmentId: string;
  vesselDeparted?: boolean;
}

export function AmendmentPanel({ shipmentId, vesselDeparted = false }: AmendmentPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amendment_type: "bl_correction",
    description: "",
    carrier_fee_required: false,
    carrier_fee_amount: "",
    payment_required_before_change: false,
    notes: "",
  });

  const { data: amendments = [] } = useQuery({
    queryKey: ["shipment_amendments", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_amendments")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    if (!form.description || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("shipment_amendments").insert({
        shipment_id: shipmentId,
        user_id: user.id,
        amendment_type: form.amendment_type,
        description: form.description,
        carrier_fee_required: form.carrier_fee_required,
        carrier_fee_amount: form.carrier_fee_amount ? parseFloat(form.carrier_fee_amount) : 0,
        payment_required_before_change: form.payment_required_before_change,
        notes: form.notes || null,
        status: form.payment_required_before_change ? "pending_payment" : "requested",
      });
      if (error) throw error;
      toast({ title: "Amendment requested" });
      queryClient.invalidateQueries({ queryKey: ["shipment_amendments", shipmentId] });
      setDialogOpen(false);
      setForm({ amendment_type: "bl_correction", description: "", carrier_fee_required: false, carrier_fee_amount: "", payment_required_before_change: false, notes: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getTypeLabel = (t: string) => AMENDMENT_TYPES.find(a => a.value === t)?.label || t;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-accent" />
                Amendments & Corrections
              </CardTitle>
              {vesselDeparted && (
                <CardDescription className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  <span className="text-yellow-700 text-xs">Vessel has sailed — amendments may incur carrier charges</span>
                </CardDescription>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Request
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {amendments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No amendments requested.</p>
          ) : (
            <div className="space-y-3">
              {amendments.map((a: any) => (
                <div key={a.id} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{getTypeLabel(a.amendment_type)}</span>
                      <Badge className={`text-[10px] ${STATUS_STYLE[a.status] || "bg-secondary text-muted-foreground"}`}>{a.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy")}</span>
                  </div>
                  <p className="text-xs text-foreground">{a.description}</p>
                  {a.carrier_fee_required && (
                    <div className="flex items-center gap-1 text-[11px] text-orange-700">
                      <DollarSign className="h-3 w-3" />
                      Carrier fee: ${a.carrier_fee_amount} {a.carrier_fee_currency}
                      {a.payment_required_before_change && <span className="ml-1">· Payment required first</span>}
                    </div>
                  )}
                  {a.notes && <p className="text-[10px] text-muted-foreground italic">{a.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Amendment</DialogTitle>
            {vesselDeparted && (
              <p className="text-xs text-yellow-700 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> Post-sailing amendments may incur carrier charges.
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amendment Type</Label>
              <Select value={form.amendment_type} onValueChange={(v) => setForm(f => ({ ...f, amendment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AMENDMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Describe the correction needed..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.carrier_fee_required} onCheckedChange={(c) => setForm(f => ({ ...f, carrier_fee_required: !!c }))} id="fee-req" />
              <Label htmlFor="fee-req" className="text-sm cursor-pointer">Carrier fee required</Label>
            </div>
            {form.carrier_fee_required && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Fee Amount ($)</Label><Input type="number" value={form.carrier_fee_amount} onChange={(e) => setForm(f => ({ ...f, carrier_fee_amount: e.target.value }))} /></div>
                <div className="flex items-end gap-2 pb-2">
                  <Checkbox checked={form.payment_required_before_change} onCheckedChange={(c) => setForm(f => ({ ...f, payment_required_before_change: !!c }))} id="pay-first" />
                  <Label htmlFor="pay-first" className="text-xs cursor-pointer">Payment before change</Label>
                </div>
              </div>
            )}
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Additional context..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="electric" onClick={handleSave} disabled={saving || !form.description}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
