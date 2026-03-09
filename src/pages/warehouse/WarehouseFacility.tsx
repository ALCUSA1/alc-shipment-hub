import { WarehouseLayout } from "@/components/warehouse/WarehouseLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const WarehouseFacility = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: facility, isLoading } = useQuery({
    queryKey: ["warehouse-facility", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    warehouse_name: "",
    address: "",
    city: "",
    state: "",
    country: "US",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    operating_hours: "",
    capabilities: "",
    total_capacity_sqft: "",
  });

  useEffect(() => {
    if (facility) {
      setForm({
        warehouse_name: facility.warehouse_name || "",
        address: facility.address || "",
        city: facility.city || "",
        state: facility.state || "",
        country: facility.country || "US",
        contact_name: facility.contact_name || "",
        contact_phone: facility.contact_phone || "",
        contact_email: facility.contact_email || "",
        operating_hours: facility.operating_hours || "",
        capabilities: (facility.capabilities || []).join(", "),
        total_capacity_sqft: facility.total_capacity_sqft?.toString() || "",
      });
    }
  }, [facility]);

  const saveFacility = useMutation({
    mutationFn: async () => {
      const payload = {
        warehouse_name: form.warehouse_name,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || "US",
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        operating_hours: form.operating_hours || null,
        capabilities: form.capabilities ? form.capabilities.split(",").map((s) => s.trim()).filter(Boolean) : [],
        total_capacity_sqft: form.total_capacity_sqft ? Number(form.total_capacity_sqft) : null,
        owner_user_id: user!.id,
      };

      if (facility) {
        const { error } = await supabase.from("warehouses").update(payload).eq("id", facility.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warehouses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-facility"] });
      toast({ title: "Facility saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleChange = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <WarehouseLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Facility</h1>
        <p className="text-sm text-muted-foreground">Manage your warehouse profile and capabilities</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" />
            Facility Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveFacility.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <Label>Warehouse Name *</Label>
                <Input value={form.warehouse_name} onChange={(e) => handleChange("warehouse_name", e.target.value)} required className="mt-1" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => handleChange("address", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => handleChange("city", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.state} onChange={(e) => handleChange("state", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => handleChange("country", e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>Contact Name</Label>
                  <Input value={form.contact_name} onChange={(e) => handleChange("contact_name", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input value={form.contact_phone} onChange={(e) => handleChange("contact_phone", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input value={form.contact_email} onChange={(e) => handleChange("contact_email", e.target.value)} type="email" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Operating Hours</Label>
                <Input value={form.operating_hours} onChange={(e) => handleChange("operating_hours", e.target.value)} placeholder="Mon-Fri 7AM-6PM" className="mt-1" />
              </div>
              <div>
                <Label>Capabilities (comma-separated)</Label>
                <Input value={form.capabilities} onChange={(e) => handleChange("capabilities", e.target.value)} placeholder="reefer, hazmat, bonded, oversize" className="mt-1" />
              </div>
              <div>
                <Label>Total Capacity (sq ft)</Label>
                <Input value={form.total_capacity_sqft} onChange={(e) => handleChange("total_capacity_sqft", e.target.value)} type="number" className="mt-1" />
              </div>
              <Button type="submit" disabled={saveFacility.isPending}>
                {saveFacility.isPending ? "Saving..." : facility ? "Update Facility" : "Register Facility"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </WarehouseLayout>
  );
};

export default WarehouseFacility;
