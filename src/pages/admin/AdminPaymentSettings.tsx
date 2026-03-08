import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Settings, CreditCard, Building2, Plus, Pencil, Trash2, Loader2, Check, DollarSign } from "lucide-react";

interface PlatformSettings {
  id: string;
  platform_fee_type: string;
  platform_fee_value: number;
  stripe_connect_enabled: boolean;
}

interface CarrierProfile {
  id: string;
  carrier_name: string;
  stripe_account_id: string | null;
  bank_name: string | null;
  account_holder: string | null;
  swift_code: string | null;
  iban: string | null;
  routing_number: string | null;
  account_number: string | null;
  payment_method: string;
  is_active: boolean;
  notes: string | null;
}

const AdminPaymentSettings = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [carrierDialog, setCarrierDialog] = useState<CarrierProfile | null>(null);
  const [isNewCarrier, setIsNewCarrier] = useState(false);

  // Load settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as PlatformSettings;
    },
  });

  // Load carrier profiles
  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ["admin-carrier-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carrier_payment_profiles")
        .select("*")
        .order("carrier_name");
      if (error) throw error;
      return data as unknown as CarrierProfile[];
    },
  });

  // Load payment stats
  const { data: paymentStats } = useQuery({
    queryKey: ["admin-payment-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("amount, platform_fee, carrier_amount, status, carrier_settlement_status");
      const payments = (data || []) as any[];
      const completed = payments.filter(p => p.status === "completed");
      const totalCollected = completed.reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const totalFees = completed.reduce((s: number, p: any) => s + (p.platform_fee || 0), 0);
      const totalSettled = completed.filter(p => p.carrier_settlement_status === "settled")
        .reduce((s: number, p: any) => s + (p.carrier_amount || 0), 0);
      const pendingSettlement = completed.filter(p => p.carrier_settlement_status !== "settled")
        .reduce((s: number, p: any) => s + (p.carrier_amount || 0), 0);
      return { totalCollected, totalFees, totalSettled, pendingSettlement, count: completed.length };
    },
  });

  const [feeType, setFeeType] = useState(settings?.platform_fee_type || "percent");
  const [feeValue, setFeeValue] = useState(settings?.platform_fee_value?.toString() || "5");
  const [connectEnabled, setConnectEnabled] = useState(settings?.stripe_connect_enabled || false);

  // Sync state when settings load
  const settingsLoaded = !!settings;
  if (settingsLoaded && feeType === "percent" && feeValue === "5" && settings.platform_fee_value !== 5) {
    setFeeType(settings.platform_fee_type);
    setFeeValue(settings.platform_fee_value.toString());
    setConnectEnabled(settings.stripe_connect_enabled);
  }

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({
          platform_fee_type: feeType,
          platform_fee_value: parseFloat(feeValue) || 0,
          stripe_connect_enabled: connectEnabled,
        } as any)
        .eq("id", settings.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] });
      toast({ title: "Settings saved", description: "Platform fee and payment settings updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCarrier = async () => {
    if (!carrierDialog) return;
    setSaving(true);
    try {
      const payload = {
        carrier_name: carrierDialog.carrier_name,
        stripe_account_id: carrierDialog.stripe_account_id || null,
        bank_name: carrierDialog.bank_name || null,
        account_holder: carrierDialog.account_holder || null,
        swift_code: carrierDialog.swift_code || null,
        iban: carrierDialog.iban || null,
        routing_number: carrierDialog.routing_number || null,
        account_number: carrierDialog.account_number || null,
        payment_method: carrierDialog.payment_method,
        is_active: carrierDialog.is_active,
        notes: carrierDialog.notes || null,
      };

      if (isNewCarrier) {
        const { error } = await supabase.from("carrier_payment_profiles").insert(payload as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("carrier_payment_profiles")
          .update(payload as any).eq("id", carrierDialog.id);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["admin-carrier-profiles"] });
      toast({ title: isNewCarrier ? "Carrier added" : "Carrier updated" });
      setCarrierDialog(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCarrier = async (id: string) => {
    try {
      await supabase.from("carrier_payment_profiles").delete().eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["admin-carrier-profiles"] });
      toast({ title: "Carrier profile removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openNewCarrier = () => {
    setIsNewCarrier(true);
    setCarrierDialog({
      id: "", carrier_name: "", stripe_account_id: null, bank_name: null,
      account_holder: null, swift_code: null, iban: null, routing_number: null,
      account_number: null, payment_method: "stripe_connect", is_active: true, notes: null,
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Payment Settings</h1>
          <p className="text-sm text-white/50 mt-1">Configure platform fees, carrier settlements, and payment methods.</p>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Collected", value: paymentStats?.totalCollected || 0, icon: DollarSign },
            { label: "Platform Fees Earned", value: paymentStats?.totalFees || 0, icon: Settings },
            { label: "Settled to Carriers", value: paymentStats?.totalSettled || 0, icon: Check },
            { label: "Pending Settlement", value: paymentStats?.pendingSettlement || 0, icon: CreditCard },
          ].map((stat) => (
            <Card key={stat.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-white/50 mb-1">
                  <stat.icon className="h-4 w-4" />
                  <span className="text-xs">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-white font-mono">${stat.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Fee Settings */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Platform Fee Configuration
            </CardTitle>
            <CardDescription className="text-white/50">
              Set your platform's transaction fee. This is deducted from each payment before carrier settlement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <Skeleton className="h-20 w-full bg-white/10" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/70">Fee Type</Label>
                    <Select value={feeType} onValueChange={setFeeType}>
                      <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percentage (%)</SelectItem>
                        <SelectItem value="flat">Flat Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white/70">
                      {feeType === "percent" ? "Fee Percentage" : "Fee Amount ($)"}
                    </Label>
                    <Input
                      type="number"
                      className="mt-1 bg-white/5 border-white/10 text-white"
                      value={feeValue}
                      onChange={(e) => setFeeValue(e.target.value)}
                      placeholder={feeType === "percent" ? "e.g. 5" : "e.g. 100"}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/10 p-4">
                  <div>
                    <p className="text-sm font-medium text-white">Stripe Connect Auto-Settlement</p>
                    <p className="text-xs text-white/50">
                      When enabled, carrier payments are automatically transferred via Stripe Connect.
                    </p>
                  </div>
                  <Switch checked={connectEnabled} onCheckedChange={setConnectEnabled} />
                </div>

                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-white/50">
                    <strong className="text-white/70">Example:</strong> On a $3,000 freight payment with a {feeValue}
                    {feeType === "percent" ? "%" : " flat"} fee:
                    Platform keeps <strong className="text-emerald-400">
                      ${feeType === "percent"
                        ? (3000 * (parseFloat(feeValue) || 0) / 100).toLocaleString()
                        : (parseFloat(feeValue) || 0).toLocaleString()
                      }
                    </strong>, Carrier receives <strong className="text-white">
                      ${(3000 - (feeType === "percent"
                        ? 3000 * (parseFloat(feeValue) || 0) / 100
                        : parseFloat(feeValue) || 0
                      )).toLocaleString()}
                    </strong>
                  </p>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} className="bg-white text-black hover:bg-white/90">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save Settings
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Carrier Payment Profiles */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Carrier Payment Profiles
                </CardTitle>
                <CardDescription className="text-white/50">
                  Manage Stripe Connect accounts for automatic carrier settlements.
                </CardDescription>
              </div>
              <Button onClick={openNewCarrier} size="sm" className="bg-white text-black hover:bg-white/90">
                <Plus className="h-4 w-4 mr-1" /> Add Carrier
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {carriersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full bg-white/10" />)}
              </div>
            ) : carriers.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/50">No carrier payment profiles yet.</p>
                <p className="text-xs text-white/30 mt-1">Add carriers with their Stripe Connect account IDs or bank details.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {carriers.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${c.is_active ? "bg-emerald-400" : "bg-white/20"}`} />
                      <div>
                        <p className="text-sm font-medium text-white">{c.carrier_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/60">
                            {c.payment_method === "stripe_connect" ? "Stripe Connect" : "Bank Wire"}
                          </Badge>
                          {c.stripe_account_id && (
                            <span className="text-[10px] text-white/40 font-mono">{c.stripe_account_id}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="text-white/50 hover:text-white"
                        onClick={() => { setIsNewCarrier(false); setCarrierDialog(c); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white/50 hover:text-red-400"
                        onClick={() => handleDeleteCarrier(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Carrier Dialog */}
      <Dialog open={!!carrierDialog} onOpenChange={(open) => { if (!open) setCarrierDialog(null); }}>
        <DialogContent className="bg-[hsl(220,20%,10%)] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{isNewCarrier ? "Add Carrier Payment Profile" : "Edit Carrier Profile"}</DialogTitle>
            <DialogDescription className="text-white/50">
              Configure how this carrier receives settlement payments.
            </DialogDescription>
          </DialogHeader>
          {carrierDialog && (
            <div className="space-y-4">
              <div>
                <Label className="text-white/70">Carrier Name</Label>
                <Input className="mt-1 bg-white/5 border-white/10 text-white"
                  value={carrierDialog.carrier_name}
                  onChange={(e) => setCarrierDialog({ ...carrierDialog, carrier_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-white/70">Payment Method</Label>
                <Select value={carrierDialog.payment_method}
                  onValueChange={(v) => setCarrierDialog({ ...carrierDialog, payment_method: v })}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe_connect">Stripe Connect (Auto)</SelectItem>
                    <SelectItem value="bank_wire">Bank Wire (Manual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {carrierDialog.payment_method === "stripe_connect" && (
                <div>
                  <Label className="text-white/70">Stripe Connected Account ID</Label>
                  <Input className="mt-1 bg-white/5 border-white/10 text-white font-mono"
                    placeholder="acct_..."
                    value={carrierDialog.stripe_account_id || ""}
                    onChange={(e) => setCarrierDialog({ ...carrierDialog, stripe_account_id: e.target.value })} />
                  <p className="text-[10px] text-white/30 mt-1">
                    The carrier must complete Stripe Connect onboarding to get this ID.
                  </p>
                </div>
              )}

              {carrierDialog.payment_method === "bank_wire" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/70">Bank Name</Label>
                    <Input className="mt-1 bg-white/5 border-white/10 text-white"
                      value={carrierDialog.bank_name || ""}
                      onChange={(e) => setCarrierDialog({ ...carrierDialog, bank_name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-white/70">Account Holder</Label>
                    <Input className="mt-1 bg-white/5 border-white/10 text-white"
                      value={carrierDialog.account_holder || ""}
                      onChange={(e) => setCarrierDialog({ ...carrierDialog, account_holder: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-white/70">SWIFT Code</Label>
                    <Input className="mt-1 bg-white/5 border-white/10 text-white font-mono"
                      value={carrierDialog.swift_code || ""}
                      onChange={(e) => setCarrierDialog({ ...carrierDialog, swift_code: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-white/70">IBAN</Label>
                    <Input className="mt-1 bg-white/5 border-white/10 text-white font-mono"
                      value={carrierDialog.iban || ""}
                      onChange={(e) => setCarrierDialog({ ...carrierDialog, iban: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-white/70">Routing Number</Label>
                    <Input className="mt-1 bg-white/5 border-white/10 text-white font-mono"
                      value={carrierDialog.routing_number || ""}
                      onChange={(e) => setCarrierDialog({ ...carrierDialog, routing_number: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-white/70">Account Number</Label>
                    <Input className="mt-1 bg-white/5 border-white/10 text-white font-mono"
                      value={carrierDialog.account_number || ""}
                      onChange={(e) => setCarrierDialog({ ...carrierDialog, account_number: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-white/70">Active</Label>
                <Switch checked={carrierDialog.is_active}
                  onCheckedChange={(v) => setCarrierDialog({ ...carrierDialog, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarrierDialog(null)}
              className="border-white/10 text-white hover:bg-white/5">Cancel</Button>
            <Button onClick={handleSaveCarrier} disabled={saving || !carrierDialog?.carrier_name}
              className="bg-white text-black hover:bg-white/90">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isNewCarrier ? "Add Carrier" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPaymentSettings;
