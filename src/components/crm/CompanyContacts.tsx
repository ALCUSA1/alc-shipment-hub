import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Mail, Phone, Star } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["operations", "billing", "compliance", "sales", "executive", "general"];

interface CompanyContactsProps {
  companyId: string;
}

export function CompanyContacts({ companyId }: CompanyContactsProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    role: "general",
    title: "",
    email: "",
    phone: "",
    is_primary: false,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["company-contacts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_contacts")
        .select("*")
        .eq("company_id", companyId)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addContact = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("company_contacts").insert({
        company_id: companyId,
        full_name: form.full_name.trim(),
        role: form.role,
        title: form.title.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        is_primary: form.is_primary,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-contacts", companyId] });
      toast.success("Contact added");
      setDialogOpen(false);
      setForm({ full_name: "", role: "general", title: "", email: "", phone: "", is_primary: false });
    },
    onError: (err) => toast.error(err.message),
  });

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              Contacts
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts yet.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact: any) => (
                <div key={contact.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{contact.full_name}</span>
                      {contact.is_primary && (
                        <Badge variant="outline" className="text-[9px] border-accent/40 text-accent">
                          <Star className="h-2 w-2 mr-0.5" /> Primary
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{contact.role}</Badge>
                  </div>
                  {contact.title && <p className="text-xs text-muted-foreground mt-0.5">{contact.title}</p>}
                  <div className="flex items-center gap-4 mt-2">
                    {contact.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" /> {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {contact.phone}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Role</Label>
                <Select value={form.role} onValueChange={(v) => update("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. VP Operations" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={form.is_primary}
                onChange={(e) => update("is_primary", e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is_primary" className="text-xs">Primary contact</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="electric" onClick={() => addContact.mutate()} disabled={addContact.isPending}>
                Add Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
