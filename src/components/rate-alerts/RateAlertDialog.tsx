import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface RateAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOrigin?: string;
  defaultDestination?: string;
  defaultContainerType?: string;
  defaultCarrier?: string;
  defaultThreshold?: number;
}

const CONTAINER_TYPES = [
  { value: "20gp", label: "20' GP" },
  { value: "40gp", label: "40' GP" },
  { value: "40hc", label: "40' HC" },
];

export function RateAlertDialog({
  open,
  onOpenChange,
  defaultOrigin = "",
  defaultDestination = "",
  defaultContainerType = "40hc",
  defaultCarrier,
  defaultThreshold,
}: RateAlertDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [containerType, setContainerType] = useState(defaultContainerType);
  const [carrier, setCarrier] = useState(defaultCarrier || "");
  const [threshold, setThreshold] = useState(defaultThreshold?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !origin || !destination || !threshold) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("rate_alerts").insert({
        user_id: user.id,
        origin_port: origin,
        destination_port: destination,
        container_type: containerType,
        carrier: carrier || null,
        threshold_rate: parseFloat(threshold),
      });
      if (error) throw error;
      toast({ title: "Rate Alert Created", description: `You'll be notified when rates drop below $${parseFloat(threshold).toLocaleString()}.` });
      queryClient.invalidateQueries({ queryKey: ["rate-alerts"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" />
            Set Rate Alert
          </DialogTitle>
          <DialogDescription>
            Get notified when carrier rates drop below your threshold.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Origin Port</Label>
              <Input value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} placeholder="CNSHA" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Destination Port</Label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} placeholder="USLAX" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Container Type</Label>
              <Select value={containerType} onValueChange={setContainerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTAINER_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Carrier (optional)</Label>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Any carrier" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Price Threshold (USD)</Label>
            <Input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g. 2500"
            />
            <p className="text-[10px] text-muted-foreground">Alert when all-in rate drops below this amount</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !origin || !destination || !threshold}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Create Alert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
