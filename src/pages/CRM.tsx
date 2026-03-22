import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete, type StructuredAddress } from "@/components/shared/AddressAutocomplete";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Search, Building2, Shield, FileCheck, CreditCard, Loader2, ChevronRight, Users, X, AlertTriangle, AlertCircle, Package,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { differenceInDays, parseISO, format } from "date-fns";
import { useNavigate } from "react-router-dom";

type Shipment = Tables<"shipments">;

type Company = Tables<"companies">;
type Contact = Tables<"company_contacts">;

const statusColors: Record<string, string> = {
  prospect: "bg-muted text-muted-foreground",
  pending_compliance: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  inactive: "bg-muted text-muted-foreground",
};

type ExpiryAlert = { label: string; daysLeft: number; expired: boolean };

function getExpiryAlerts(c: Company): ExpiryAlert[] {
  const checks: { label: string; date: string | null }[] = [
    { label: "FMC License", date: c.fmc_license_expiry },
    { label: "Cargo Insurance", date: c.cargo_insurance_expiry },
    { label: "General Liability", date: c.general_liability_expiry },
    { label: "SAM Registration", date: c.sam_expiry },
  ];
  const today = new Date();
  const alerts: ExpiryAlert[] = [];
  for (const item of checks) {
    if (!item.date) continue;
    const days = differenceInDays(parseISO(item.date), today);
    if (days <= 60) {
      alerts.push({ label: item.label, daysLeft: days, expired: days < 0 });
    }
  }
  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

const emptyCompany = {
  company_name: "", trade_name: "", ein: "", duns_number: "", website: "", email: "", phone: "",
  address: "", city: "", state: "", zip: "", country: "US", industry: "", notes: "",
  fmc_license_number: "", fmc_license_status: "", fmc_license_expiry: "",
  oti_bond_number: "", oti_bond_surety: "", oti_bond_amount: null as number | null,
  sam_registration: "", sam_expiry: "",
  cargo_insurance_provider: "", cargo_insurance_policy: "", cargo_insurance_expiry: "",
  general_liability_provider: "", general_liability_policy: "", general_liability_expiry: "",
  w9_on_file: false, billing_email: "", billing_address: "", credit_terms: "prepaid",
  credit_limit: null as number | null, payment_terms_days: null as number | null,
  status: "prospect" as string,
};

type CompanyForm = typeof emptyCompany & { id?: string };

const CRM = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CompanyForm | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactRole, setNewContactRole] = useState("general");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  const fetchCompanies = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setCompanies(data || []);
    setLoading(false);
  };

  const fetchContacts = async (companyId: string) => {
    const { data } = await supabase.from("company_contacts").select("*").eq("company_id", companyId).order("is_primary", { ascending: false });
    setContacts(data || []);
  };

  useEffect(() => { fetchCompanies(); }, [user]);

  const fetchShipments = async (companyId: string) => {
    const { data } = await supabase.from("shipments").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    setShipments(data || []);
  };

  useEffect(() => {
    if (selected?.id) {
      fetchContacts(selected.id);
      fetchShipments(selected.id);
    } else {
      setContacts([]);
      setShipments([]);
    }
  }, [selected?.id]);

  const openNew = () => { setSelected({ ...emptyCompany }); setDialogOpen(false); };

  const openExisting = (c: Company) => {
    setSelected({
      id: c.id, company_name: c.company_name || "", trade_name: c.trade_name || "", ein: c.ein || "",
      duns_number: c.duns_number || "", website: c.website || "", email: c.email || "", phone: c.phone || "",
      address: c.address || "", city: c.city || "", state: c.state || "", zip: c.zip || "",
      country: c.country || "US", industry: c.industry || "", notes: c.notes || "",
      fmc_license_number: c.fmc_license_number || "", fmc_license_status: c.fmc_license_status || "",
      fmc_license_expiry: c.fmc_license_expiry || "", oti_bond_number: c.oti_bond_number || "",
      oti_bond_surety: c.oti_bond_surety || "", oti_bond_amount: c.oti_bond_amount,
      sam_registration: c.sam_registration || "", sam_expiry: c.sam_expiry || "",
      cargo_insurance_provider: c.cargo_insurance_provider || "", cargo_insurance_policy: c.cargo_insurance_policy || "",
      cargo_insurance_expiry: c.cargo_insurance_expiry || "", general_liability_provider: c.general_liability_provider || "",
      general_liability_policy: c.general_liability_policy || "", general_liability_expiry: c.general_liability_expiry || "",
      w9_on_file: c.w9_on_file || false, billing_email: c.billing_email || "", billing_address: c.billing_address || "",
      credit_terms: c.credit_terms || "prepaid", credit_limit: c.credit_limit, payment_terms_days: c.payment_terms_days,
      status: c.status || "prospect",
    });
  };

  const save = async () => {
    if (!user || !selected) return;
    if (!selected.company_name.trim()) { toast({ title: "Company name is required", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      company_name: selected.company_name, trade_name: selected.trade_name || null, ein: selected.ein || null,
      duns_number: selected.duns_number || null, website: selected.website || null, email: selected.email || null,
      phone: selected.phone || null, address: selected.address || null, city: selected.city || null,
      state: selected.state || null, zip: selected.zip || null, country: selected.country || null,
      industry: selected.industry || null, notes: selected.notes || null,
      fmc_license_number: selected.fmc_license_number || null, fmc_license_status: selected.fmc_license_status || null,
      fmc_license_expiry: selected.fmc_license_expiry || null, oti_bond_number: selected.oti_bond_number || null,
      oti_bond_surety: selected.oti_bond_surety || null, oti_bond_amount: selected.oti_bond_amount,
      sam_registration: selected.sam_registration || null, sam_expiry: selected.sam_expiry || null,
      cargo_insurance_provider: selected.cargo_insurance_provider || null, cargo_insurance_policy: selected.cargo_insurance_policy || null,
      cargo_insurance_expiry: selected.cargo_insurance_expiry || null,
      general_liability_provider: selected.general_liability_provider || null, general_liability_policy: selected.general_liability_policy || null,
      general_liability_expiry: selected.general_liability_expiry || null,
      w9_on_file: selected.w9_on_file, billing_email: selected.billing_email || null, billing_address: selected.billing_address || null,
      credit_terms: selected.credit_terms || null, credit_limit: selected.credit_limit, payment_terms_days: selected.payment_terms_days,
      status: selected.status as any,
      user_id: user.id,
    };

    let error;
    if (selected.id) {
      ({ error } = await supabase.from("companies").update(payload).eq("id", selected.id));
    } else {
      const res = await supabase.from("companies").insert(payload).select().single();
      error = res.error;
      if (res.data) setSelected(prev => prev ? { ...prev, id: res.data.id } : prev);
    }
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Company saved" });
    fetchCompanies();
  };

  const addContact = async () => {
    if (!selected?.id || !newContactName.trim()) return;
    const { error } = await supabase.from("company_contacts").insert({
      company_id: selected.id, full_name: newContactName, role: newContactRole,
      email: newContactEmail || null, phone: newContactPhone || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contact added" });
    setNewContactName(""); setNewContactEmail(""); setNewContactPhone(""); setNewContactRole("general");
    fetchContacts(selected.id);
  };

  const deleteContact = async (id: string) => {
    if (!selected?.id) return;
    await supabase.from("company_contacts").delete().eq("id", id);
    fetchContacts(selected.id);
  };

  const filtered = companies.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // DETAIL VIEW
  if (selected) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>← Back</Button>
          <h1 className="text-xl font-bold text-foreground">{selected.id ? selected.company_name : "New Customer"}</h1>
          {selected.id && <Badge className={statusColors[selected.status] || ""}>{selected.status.replace("_", " ")}</Badge>}
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 max-w-3xl">
            <TabsTrigger value="info" className="gap-1 text-xs"><Building2 className="h-3.5 w-3.5" />Info</TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1 text-xs"><Users className="h-3.5 w-3.5" />Contacts</TabsTrigger>
            <TabsTrigger value="shipments" className="gap-1 text-xs"><Package className="h-3.5 w-3.5" />Shipments</TabsTrigger>
            <TabsTrigger value="compliance" className="gap-1 text-xs"><Shield className="h-3.5 w-3.5" />Compliance</TabsTrigger>
            <TabsTrigger value="insurance" className="gap-1 text-xs"><FileCheck className="h-3.5 w-3.5" />Insurance</TabsTrigger>
            <TabsTrigger value="billing" className="gap-1 text-xs"><CreditCard className="h-3.5 w-3.5" />Billing</TabsTrigger>
          </TabsList>

          {/* INFO */}
          <TabsContent value="info">
            <Card>
              <CardHeader><CardTitle className="text-base">Company Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Company Name *</Label><Input value={selected.company_name} onChange={e => setSelected(s => s ? { ...s, company_name: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Trade Name / DBA</Label><Input value={selected.trade_name} onChange={e => setSelected(s => s ? { ...s, trade_name: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>EIN</Label><Input value={selected.ein} onChange={e => setSelected(s => s ? { ...s, ein: e.target.value } : s)} placeholder="XX-XXXXXXX" className="mt-1" /></div>
                  <div><Label>DUNS</Label><Input value={selected.duns_number} onChange={e => setSelected(s => s ? { ...s, duns_number: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Industry</Label><Input value={selected.industry} onChange={e => setSelected(s => s ? { ...s, industry: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Website</Label><Input value={selected.website} onChange={e => setSelected(s => s ? { ...s, website: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Email</Label><Input value={selected.email} onChange={e => setSelected(s => s ? { ...s, email: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Phone</Label><Input value={selected.phone} onChange={e => setSelected(s => s ? { ...s, phone: e.target.value } : s)} className="mt-1" /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={selected.status} onValueChange={v => setSelected(s => s ? { ...s, status: v } : s)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="pending_compliance">Pending Compliance</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <h3 className="text-sm font-medium text-foreground">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><Label>Street</Label><AddressAutocomplete value={selected.address || ""} onChange={v => setSelected(s => s ? { ...s, address: v } : s)} onAddressSelect={(addr) => setSelected(s => s ? { ...s, address: addr.street, city: addr.city, state: addr.state, zip: addr.postalCode, country: addr.country } : s)} placeholder="Search address..." /></div>
                  <div><Label>City</Label><Input value={selected.city} onChange={e => setSelected(s => s ? { ...s, city: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>State</Label><Input value={selected.state} onChange={e => setSelected(s => s ? { ...s, state: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>ZIP</Label><Input value={selected.zip} onChange={e => setSelected(s => s ? { ...s, zip: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Country</Label><Input value={selected.country} onChange={e => setSelected(s => s ? { ...s, country: e.target.value } : s)} className="mt-1" /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={selected.notes} onChange={e => setSelected(s => s ? { ...s, notes: e.target.value } : s)} className="mt-1" rows={3} /></div>
                <Button variant="electric" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTACTS */}
          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contacts</CardTitle>
                <CardDescription>Key contacts at this company (Operations, Billing, Compliance)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selected.id ? (
                  <p className="text-sm text-muted-foreground">Save the company first to add contacts.</p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm">No contacts yet</TableCell></TableRow>
                        )}
                        {contacts.map(ct => (
                          <TableRow key={ct.id}>
                            <TableCell className="font-medium">{ct.full_name}{ct.is_primary && <Badge variant="outline" className="ml-2 text-[10px]">Primary</Badge>}</TableCell>
                            <TableCell className="capitalize">{ct.role}</TableCell>
                            <TableCell>{ct.email || "—"}</TableCell>
                            <TableCell>{ct.phone || "—"}</TableCell>
                            <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteContact(ct.id)}><X className="h-3.5 w-3.5" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Separator />
                    <h4 className="text-sm font-medium text-foreground">Add Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><Label>Name *</Label><Input value={newContactName} onChange={e => setNewContactName(e.target.value)} className="mt-1" /></div>
                      <div>
                        <Label>Role</Label>
                        <Select value={newContactRole} onValueChange={setNewContactRole}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                            <SelectItem value="compliance">Compliance</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="executive">Executive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Email</Label><Input value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="mt-1" /></div>
                      <div><Label>Phone</Label><Input value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="mt-1" /></div>
                    </div>
                    <Button variant="outline" size="sm" onClick={addContact} disabled={!newContactName.trim()}><Plus className="h-3.5 w-3.5 mr-1" />Add Contact</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMPLIANCE */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader><CardTitle className="text-base">FMC Licensing & Bonds</CardTitle><CardDescription>Regulatory compliance for NVOCC operations</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>FMC License #</Label><Input value={selected.fmc_license_number} onChange={e => setSelected(s => s ? { ...s, fmc_license_number: e.target.value } : s)} className="mt-1" /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={selected.fmc_license_status} onValueChange={v => setSelected(s => s ? { ...s, fmc_license_status: v } : s)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem><SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem><SelectItem value="revoked">Revoked</SelectItem><SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>License Expiry</Label><Input type="date" value={selected.fmc_license_expiry} onChange={e => setSelected(s => s ? { ...s, fmc_license_expiry: e.target.value } : s)} className="mt-1" /></div>
                </div>
                <Separator />
                <h3 className="text-sm font-medium text-foreground">OTI Surety Bond</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Bond #</Label><Input value={selected.oti_bond_number} onChange={e => setSelected(s => s ? { ...s, oti_bond_number: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Surety</Label><Input value={selected.oti_bond_surety} onChange={e => setSelected(s => s ? { ...s, oti_bond_surety: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Amount ($)</Label><Input type="number" value={selected.oti_bond_amount ?? ""} onChange={e => setSelected(s => s ? { ...s, oti_bond_amount: e.target.value ? Number(e.target.value) : null } : s)} className="mt-1" /></div>
                </div>
                <Separator />
                <h3 className="text-sm font-medium text-foreground">SAM Registration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>SAM / UEI</Label><Input value={selected.sam_registration} onChange={e => setSelected(s => s ? { ...s, sam_registration: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>SAM Expiry</Label><Input type="date" value={selected.sam_expiry} onChange={e => setSelected(s => s ? { ...s, sam_expiry: e.target.value } : s)} className="mt-1" /></div>
                </div>
                <Button variant="electric" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INSURANCE */}
          <TabsContent value="insurance">
            <Card>
              <CardHeader><CardTitle className="text-base">Insurance Certificates</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">Cargo Insurance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Provider</Label><Input value={selected.cargo_insurance_provider} onChange={e => setSelected(s => s ? { ...s, cargo_insurance_provider: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Policy #</Label><Input value={selected.cargo_insurance_policy} onChange={e => setSelected(s => s ? { ...s, cargo_insurance_policy: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Expiry</Label><Input type="date" value={selected.cargo_insurance_expiry} onChange={e => setSelected(s => s ? { ...s, cargo_insurance_expiry: e.target.value } : s)} className="mt-1" /></div>
                </div>
                <Separator />
                <h3 className="text-sm font-medium text-foreground">General Liability</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Provider</Label><Input value={selected.general_liability_provider} onChange={e => setSelected(s => s ? { ...s, general_liability_provider: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Policy #</Label><Input value={selected.general_liability_policy} onChange={e => setSelected(s => s ? { ...s, general_liability_policy: e.target.value } : s)} className="mt-1" /></div>
                  <div><Label>Expiry</Label><Input type="date" value={selected.general_liability_expiry} onChange={e => setSelected(s => s ? { ...s, general_liability_expiry: e.target.value } : s)} className="mt-1" /></div>
                </div>
                <Button variant="electric" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BILLING */}
          <TabsContent value="billing">
            <Card>
              <CardHeader><CardTitle className="text-base">Billing & Credit</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Billing Email</Label><Input value={selected.billing_email} onChange={e => setSelected(s => s ? { ...s, billing_email: e.target.value } : s)} className="mt-1" /></div>
                  <div className="md:col-span-2"><Label>Billing Address</Label><AddressAutocomplete value={selected.billing_address || ""} onChange={v => setSelected(s => s ? { ...s, billing_address: v } : s)} placeholder="Search billing address..." /></div>
                  <div>
                    <Label>Credit Terms</Label>
                    <Select value={selected.credit_terms} onValueChange={v => setSelected(s => s ? { ...s, credit_terms: v } : s)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prepaid">Prepaid</SelectItem><SelectItem value="net_15">Net 15</SelectItem>
                        <SelectItem value="net_30">Net 30</SelectItem><SelectItem value="net_45">Net 45</SelectItem><SelectItem value="net_60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Credit Limit ($)</Label><Input type="number" value={selected.credit_limit ?? ""} onChange={e => setSelected(s => s ? { ...s, credit_limit: e.target.value ? Number(e.target.value) : null } : s)} className="mt-1" /></div>
                  <div><Label>Payment Terms (days)</Label><Input type="number" value={selected.payment_terms_days ?? ""} onChange={e => setSelected(s => s ? { ...s, payment_terms_days: e.target.value ? Number(e.target.value) : null } : s)} className="mt-1" /></div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Switch checked={selected.w9_on_file} onCheckedChange={v => setSelected(s => s ? { ...s, w9_on_file: v } : s)} />
                  <Label>W-9 on file</Label>
                </div>
                <Button variant="electric" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SHIPMENTS */}
          <TabsContent value="shipments">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shipment History</CardTitle>
                <CardDescription>All shipments linked to this customer</CardDescription>
              </CardHeader>
              <CardContent>
                {!selected.id ? (
                  <p className="text-sm text-muted-foreground">Save the company first to view shipments.</p>
                ) : shipments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No shipments linked to this customer yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipments.map(s => (
                        <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/shipments/${s.id}`)}>
                          <TableCell className="font-medium">{s.shipment_ref}</TableCell>
                          <TableCell className="capitalize">{s.shipment_type}</TableCell>
                          <TableCell className="text-sm">{s.origin_port || "—"} → {s.destination_port || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{s.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    );
  }

  // LIST VIEW
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">CRM</h1>
            <p className="text-sm text-muted-foreground">Manage your B2B customers</p>
          </div>
        </div>
        <Button variant="electric" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Customer</Button>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search companies…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No customers yet. Click "Add Customer" to get started.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>FMC License</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => {
                const alerts = getExpiryAlerts(c);
                const hasExpired = alerts.some(a => a.expired);
                const hasWarning = alerts.length > 0 && !hasExpired;
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openExisting(c)}>
                    <TableCell>
                      <div className="font-medium">{c.company_name}</div>
                      {c.trade_name && <div className="text-xs text-muted-foreground">{c.trade_name}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{c.email || "—"}</TableCell>
                    <TableCell className="text-sm">{c.fmc_license_number || "—"}</TableCell>
                    <TableCell>
                      {alerts.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              {hasExpired ? (
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                              )}
                              <span className={`text-xs font-medium ${hasExpired ? "text-destructive" : "text-yellow-600"}`}>
                                {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <ul className="space-y-1 text-xs">
                              {alerts.map((a, i) => (
                                <li key={i} className={a.expired ? "text-destructive font-medium" : ""}>
                                  {a.label}: {a.expired ? `Expired ${Math.abs(a.daysLeft)}d ago` : `${a.daysLeft}d remaining`}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell><Badge className={statusColors[c.status] || ""} variant="outline">{c.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default CRM;
