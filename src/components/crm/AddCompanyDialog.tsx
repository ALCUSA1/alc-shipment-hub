import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCompanyDialog({ open, onOpenChange }: AddCompanyDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    company_name: "",
    trade_name: "",
    fmc_license_number: "",
    ein: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "US",
  });

  const createCompany = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!form.company_name.trim()) throw new Error("Company name is required");

      const { error } = await supabase.from("companies").insert({
        user_id: user.id,
        company_name: form.company_name.trim(),
        trade_name: form.trade_name.trim() || null,
        fmc_license_number: form.fmc_license_number.trim() || null,
        ein: form.ein.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || "US",
        status: "prospect" as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company added as Prospect");
      onOpenChange(false);
      setForm({
        company_name: "", trade_name: "", fmc_license_number: "",
        ein: "", email: "", phone: "", city: "", state: "", country: "US",
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Company Name *</Label>
              <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="Legal company name" />
            </div>
            <div>
              <Label className="text-xs">Trade Name (DBA)</Label>
              <Input value={form.trade_name} onChange={(e) => update("trade_name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">FMC License #</Label>
              <Input value={form.fmc_license_number} onChange={(e) => update("fmc_license_number", e.target.value)} placeholder="XXXXXX" />
            </div>
            <div>
              <Label className="text-xs">EIN</Label>
              <Input value={form.ein} onChange={(e) => update("ein", e.target.value)} placeholder="XX-XXXXXXX" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Country</Label>
              <Input value={form.country} onChange={(e) => update("country", e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="electric" onClick={() => createCompany.mutate()} disabled={createCompany.isPending}>
              Add Company
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
