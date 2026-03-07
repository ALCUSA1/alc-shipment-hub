import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Timer, Plus, DollarSign, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";

const CHARGE_TYPES = [
  { value: "demurrage", label: "Demurrage", description: "Container at port beyond free time" },
  { value: "detention", label: "Detention / Per Diem", description: "Container outside port beyond free time" },
  { value: "storage", label: "Storage", description: "Cargo storage at terminal/warehouse" },
  { value: "chassis", label: "Chassis Usage", description: "Carrier chassis beyond free time" },
  { value: "reefer_plugin", label: "Reefer Plug-in", description: "Power for refrigerated containers" },
  { value: "port_congestion", label: "Port Congestion", description: "Surcharge during peak congestion" },
  { value: "hazmat", label: "Hazmat Surcharge", description: "Dangerous goods handling" },
  { value: "overweight", label: "Overweight/OOG", description: "Non-standard cargo dimensions or weight" },
  { value: "other", label: "Other", description: "Other post-shipment charges" },
];

const STATUS_OPTIONS = [
  { value: "accruing", label: "Accruing", color: "bg-yellow-100 text-yellow-700" },
  { value: "invoiced", label: "Invoiced", color: "bg-blue-100 text-blue-700" },
  { value: "paid", label: "Paid", color: "bg-green-100 text-green-700" },
  { value: "disputed", label: "Disputed", color: "bg-destructive/10 text-destructive" },
  { value: "waived", label: "Waived", color: "bg-secondary text-muted-foreground" },
];

interface DemurrageCharge {
  id: string;
  shipment_id: string;
  charge_type: string;
  container_number: string | null;
  carrier: string | null;
  free_days: number | null;
  start_date: string | null;
  end_date: string | null;
  daily_rate: number;
  total_amount: number;
  currency: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface DemurrageTrackerProps {
  shipmentId: string;
  shipmentStatus: string;
}

export function DemurrageTracker({ shipmentId, shipmentStatus }: DemurrageTrackerProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    charge_type: "demurrage",
    container_number: "",
    carrier: "",
    free_days: "4",
    start_date: "",
    end_date: "",
    daily_rate: "",
    total_amount: "",
    currency: "USD",
    status: "accruing",
    notes: "",
  });

  const { data: charges = [], isLoading } = useQuery({
    queryKey: ["demurrage_charges", shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demurrage_charges")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DemurrageCharge[];
    },
  });

  const isLocked = ["completed", "delivered", "cancelled"].includes(shipmentStatus);

  const resetForm = () => {
    setForm({
      charge_type: "demurrage",
      container_number: "",
      carrier: "",
      free_days: "4",
      start_date: "",
      end_date: "",
      daily_rate: "",
      total_amount: "",
      currency: "USD",
      status: "accruing",
      notes: "",
    });
  };

  // Auto-calculate total from dates and daily rate
  const handleFieldChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };

    if (["start_date", "end_date", "daily_rate", "free_days"].includes(field)) {
      if (updated.start_date && updated.end_date && updated.daily_rate) {
        const totalDays = differenceInDays(new Date(updated.end_date), new Date(updated.start_date));
        const chargeableDays = Math.max(0, totalDays - Number(updated.free_days || 0));
        updated.total_amount = (chargeableDays * Number(updated.daily_rate)).toFixed(2);
      }
    }

    setForm(updated);
  };

  const handleSave = async () => {
    if (!form.charge_type) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("demurrage_charges").insert({
        shipment_id: shipmentId,
        charge_type: form.charge_type,
        container_number: form.container_number || null,
        carrier: form.carrier || null,
        free_days: Number(form.free_days) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        daily_rate: Number(form.daily_rate) || 0,
        total_amount: Number(form.total_amount) || 0,
        currency: form.currency,
        status: form.status,
        notes: form.notes || null,
      });
      if (error) throw error;
      toast({ title: "Charge added", description: `${getChargeLabel(form.charge_type)} charge recorded.` });
      queryClient.invalidateQueries({ queryKey: ["demurrage_charges", shipmentId] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (chargeId: string) => {
    setDeletingId(chargeId);
    try {
      const { error } = await supabase.from("demurrage_charges").delete().eq("id", chargeId);
      if (error) throw error;
      toast({ title: "Charge removed" });
      queryClient.invalidateQueries({ queryKey: ["demurrage_charges", shipmentId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const getChargeLabel = (type: string) =>
    CHARGE_TYPES.find((t) => t.value === type)?.label || type;

  const getStatusStyle = (status: string) =>
    STATUS_OPTIONS.find((s) => s.value === status)?.color || "bg-secondary text-muted-foreground";

  const totalCharges = charges.reduce((sum, c) => sum + c.total_amount, 0);
  const accruingCount = charges.filter((c) => c.status === "accruing").length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-4 w-4 text-accent" />
                Demurrage & Detention
              </CardTitle>
              <CardDescription>
                Post-shipment charges from carriers & terminals
              </CardDescription>
            </div>
            {!isLocked && (
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : charges.length === 0 ? (
            <div className="text-center py-6">
              <Timer className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No charges recorded yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Add demurrage, detention, or other post-shipment charges.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary bar */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">
                    ${totalCharges.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">total</span>
                </div>
                {accruingCount > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                    <span className="text-xs text-yellow-700 font-medium">
                      {accruingCount} accruing
                    </span>
                  </div>
                )}
              </div>

              {/* Charge list */}
              {charges.map((charge) => {
                const chargeableDays =
                  charge.start_date && charge.end_date
                    ? Math.max(0, differenceInDays(new Date(charge.end_date), new Date(charge.start_date)) - (charge.free_days || 0))
                    : null;

                return (
                  <div key={charge.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {getChargeLabel(charge.charge_type)}
                          </span>
                          <Badge className={`text-[10px] ${getStatusStyle(charge.status)}`}>
                            {charge.status}
                          </Badge>
                        </div>
                        {charge.container_number && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Container: {charge.container_number}
                          </p>
                        )}
                        {charge.carrier && (
                          <p className="text-xs text-muted-foreground">
                            Carrier: {charge.carrier}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex items-start gap-1">
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            ${charge.total_amount.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{charge.currency}</p>
                        </div>
                        {!isLocked && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(charge.id)}
                            disabled={deletingId === charge.id}
                          >
                            {deletingId === charge.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {(charge.start_date || charge.daily_rate > 0) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                        {charge.start_date && (
                          <span>From: {format(new Date(charge.start_date), "MMM d")}</span>
                        )}
                        {charge.end_date && (
                          <span>To: {format(new Date(charge.end_date), "MMM d")}</span>
                        )}
                        {charge.free_days != null && charge.free_days > 0 && (
                          <span>Free: {charge.free_days}d</span>
                        )}
                        {chargeableDays !== null && (
                          <span className="font-medium text-foreground">
                            Chargeable: {chargeableDays}d
                          </span>
                        )}
                        {charge.daily_rate > 0 && (
                          <span>${charge.daily_rate}/day</span>
                        )}
                      </div>
                    )}

                    {charge.notes && (
                      <p className="text-[10px] text-muted-foreground/60 italic">{charge.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add charge dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Charge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Charge Type</Label>
              <Select value={form.charge_type} onValueChange={(v) => handleFieldChange("charge_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHARGE_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      <div>
                        <span>{ct.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {ct.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Container #</Label>
                <Input
                  placeholder="MSKU1234567"
                  value={form.container_number}
                  onChange={(e) => handleFieldChange("container_number", e.target.value)}
                />
              </div>
              <div>
                <Label>Carrier</Label>
                <Input
                  placeholder="Maersk"
                  value={form.carrier}
                  onChange={(e) => handleFieldChange("carrier", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => handleFieldChange("start_date", e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => handleFieldChange("end_date", e.target.value)}
                />
              </div>
              <div>
                <Label>Free Days</Label>
                <Input
                  type="number"
                  value={form.free_days}
                  onChange={(e) => handleFieldChange("free_days", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Daily Rate ($)</Label>
                <Input
                  type="number"
                  placeholder="150"
                  value={form.daily_rate}
                  onChange={(e) => handleFieldChange("daily_rate", e.target.value)}
                />
              </div>
              <div>
                <Label>Total ($)</Label>
                <Input
                  type="number"
                  placeholder="Auto-calculated"
                  value={form.total_amount}
                  onChange={(e) => handleFieldChange("total_amount", e.target.value)}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => handleFieldChange("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional details…"
                value={form.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="electric" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Add Charge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
