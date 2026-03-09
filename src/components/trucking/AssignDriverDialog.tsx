import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  shipmentId: string;
  pickupAddress?: string;
  deliveryAddress?: string;
}

export function AssignDriverDialog({
  open,
  onOpenChange,
  quoteId,
  shipmentId,
  pickupAddress,
  deliveryAddress,
}: AssignDriverDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    driver_name: "",
    driver_phone: "",
    truck_plate: "",
    driver_email: "",
    pickup_address: pickupAddress || "",
    pickup_contact_name: "",
    pickup_contact_phone: "",
    delivery_address: deliveryAddress || "",
    delivery_contact_name: "",
    delivery_contact_phone: "",
    instructions: "",
    container_numbers: "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const createAssignment = useMutation({
    mutationFn: async () => {
      // Optionally look up driver user by email
      let driverUserId: string | null = null;
      if (form.driver_email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("full_name", `%${form.driver_name}%`)
          .limit(1)
          .maybeSingle();
        // For now, we store the assigner as a fallback if driver has no account yet
        driverUserId = profile?.user_id || null;
      }

      const containers = form.container_numbers
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const { error } = await supabase.from("driver_assignments").insert({
        trucking_quote_id: quoteId,
        shipment_id: shipmentId,
        driver_user_id: driverUserId || user!.id, // fallback to self if no driver account
        assigned_by: user!.id,
        driver_name: form.driver_name || null,
        driver_phone: form.driver_phone || null,
        truck_plate: form.truck_plate || null,
        pickup_address: form.pickup_address || null,
        pickup_contact_name: form.pickup_contact_name || null,
        pickup_contact_phone: form.pickup_contact_phone || null,
        delivery_address: form.delivery_address || null,
        delivery_contact_name: form.delivery_contact_name || null,
        delivery_contact_phone: form.delivery_contact_phone || null,
        instructions: form.instructions || null,
        container_numbers: containers.length > 0 ? containers : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Driver assigned" });
      queryClient.invalidateQueries({ queryKey: ["my-trucking-quotes"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to assign", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Driver</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Driver Name</Label>
              <Input value={form.driver_name} onChange={(e) => update("driver_name", e.target.value)} placeholder="John Smith" className="mt-1" />
            </div>
            <div>
              <Label>Driver Phone</Label>
              <Input value={form.driver_phone} onChange={(e) => update("driver_phone", e.target.value)} placeholder="+1 555-0123" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Truck Plate</Label>
              <Input value={form.truck_plate} onChange={(e) => update("truck_plate", e.target.value)} placeholder="ABC-1234" className="mt-1" />
            </div>
            <div>
              <Label>Driver Email (optional)</Label>
              <Input type="email" value={form.driver_email} onChange={(e) => update("driver_email", e.target.value)} placeholder="driver@co.com" className="mt-1" />
            </div>
          </div>

          <hr className="border-border" />

          <div>
            <Label>Pickup Address</Label>
            <Input value={form.pickup_address} onChange={(e) => update("pickup_address", e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pickup Contact</Label>
              <Input value={form.pickup_contact_name} onChange={(e) => update("pickup_contact_name", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Pickup Phone</Label>
              <Input value={form.pickup_contact_phone} onChange={(e) => update("pickup_contact_phone", e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Delivery Address</Label>
            <Input value={form.delivery_address} onChange={(e) => update("delivery_address", e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Delivery Contact</Label>
              <Input value={form.delivery_contact_name} onChange={(e) => update("delivery_contact_name", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Delivery Phone</Label>
              <Input value={form.delivery_contact_phone} onChange={(e) => update("delivery_contact_phone", e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Container Numbers (comma-separated)</Label>
            <Input value={form.container_numbers} onChange={(e) => update("container_numbers", e.target.value)} placeholder="MSCU1234567, MSCU7654321" className="mt-1" />
          </div>

          <div>
            <Label>Special Instructions</Label>
            <Textarea value={form.instructions} onChange={(e) => update("instructions", e.target.value)} placeholder="Gate code, dock number, cargo notes..." className="mt-1" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="electric" onClick={() => createAssignment.mutate()} disabled={createAssignment.isPending}>
            {createAssignment.isPending ? "Assigning..." : "Assign Driver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
