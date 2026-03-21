import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Building2, Shield, FileCheck, CreditCard, User, Loader2, Upload, X, Lock } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";
import { PasswordInput } from "@/components/ui/password-input";

interface ProfileData {
  full_name: string;
  company_name: string;
  avatar_url: string;
}

interface CompanyData {
  id?: string;
  company_name: string;
  trade_name: string;
  ein: string;
  duns_number: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  industry: string;
  notes: string;
  // FMC & Licensing
  fmc_license_number: string;
  fmc_license_status: string;
  fmc_license_expiry: string;
  oti_bond_number: string;
  oti_bond_surety: string;
  oti_bond_amount: number | null;
  sam_registration: string;
  sam_expiry: string;
  // Insurance
  cargo_insurance_provider: string;
  cargo_insurance_policy: string;
  cargo_insurance_expiry: string;
  general_liability_provider: string;
  general_liability_policy: string;
  general_liability_expiry: string;
  // Billing & Credit
  w9_on_file: boolean;
  billing_email: string;
  billing_address: string;
  credit_terms: string;
  credit_limit: number | null;
  payment_terms_days: number | null;
  status: string;
}

const defaultCompany: CompanyData = {
  company_name: "", trade_name: "", ein: "", duns_number: "", website: "", email: "", phone: "",
  address: "", city: "", state: "", zip: "", country: "US", industry: "", notes: "",
  fmc_license_number: "", fmc_license_status: "", fmc_license_expiry: "",
  oti_bond_number: "", oti_bond_surety: "", oti_bond_amount: null,
  sam_registration: "", sam_expiry: "",
  cargo_insurance_provider: "", cargo_insurance_policy: "", cargo_insurance_expiry: "",
  general_liability_provider: "", general_liability_policy: "", general_liability_expiry: "",
  w9_on_file: false, billing_email: "", billing_address: "", credit_terms: "prepaid",
  credit_limit: null, payment_terms_days: null, status: "prospect",
};

const Account = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({ full_name: "", company_name: "", avatar_url: "" });
  const [company, setCompany] = useState<CompanyData>(defaultCompany);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [profileRes, companyRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("companies").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
      ]);
      if (profileRes.data) {
        const logoUrl = (profileRes.data as any).logo_url || "";
        setProfile({ full_name: profileRes.data.full_name || "", company_name: profileRes.data.company_name || "", avatar_url: logoUrl || profileRes.data.avatar_url || "" });
      }
      if (companyRes.data) {
        const c = companyRes.data;
        setCompany({
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
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 2MB.", variant: "destructive" });
      return;
    }
    setLogoUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setLogoUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
    const logoUrl = urlData.publicUrl + `?t=${Date.now()}`;
    await supabase.from("profiles").update({ logo_url: logoUrl } as any).eq("user_id", user.id);
    setProfile(p => ({ ...p, avatar_url: logoUrl }));
    toast({ title: "Logo uploaded" });
    setLogoUploading(false);
  };

  const handleRemoveLogo = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ logo_url: null } as any).eq("user_id", user.id);
    setProfile(p => ({ ...p, avatar_url: "" }));
    toast({ title: "Logo removed" });
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name, company_name: profile.company_name,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Profile saved" });
  };

  const saveCompany = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      company_name: company.company_name, trade_name: company.trade_name || null, ein: company.ein || null,
      duns_number: company.duns_number || null, website: company.website || null, email: company.email || null,
      phone: company.phone || null, address: company.address || null, city: company.city || null,
      state: company.state || null, zip: company.zip || null, country: company.country || null,
      industry: company.industry || null, notes: company.notes || null,
      fmc_license_number: company.fmc_license_number || null, fmc_license_status: company.fmc_license_status || null,
      fmc_license_expiry: company.fmc_license_expiry || null, oti_bond_number: company.oti_bond_number || null,
      oti_bond_surety: company.oti_bond_surety || null, oti_bond_amount: company.oti_bond_amount,
      sam_registration: company.sam_registration || null, sam_expiry: company.sam_expiry || null,
      cargo_insurance_provider: company.cargo_insurance_provider || null, cargo_insurance_policy: company.cargo_insurance_policy || null,
      cargo_insurance_expiry: company.cargo_insurance_expiry || null,
      general_liability_provider: company.general_liability_provider || null, general_liability_policy: company.general_liability_policy || null,
      general_liability_expiry: company.general_liability_expiry || null,
      w9_on_file: company.w9_on_file, billing_email: company.billing_email || null, billing_address: company.billing_address || null,
      credit_terms: company.credit_terms || null, credit_limit: company.credit_limit, payment_terms_days: company.payment_terms_days,
      user_id: user.id,
    };

    let error;
    if (company.id) {
      ({ error } = await supabase.from("companies").update(payload).eq("id", company.id));
    } else {
      const res = await supabase.from("companies").insert(payload).select().single();
      error = res.error;
      if (res.data) setCompany(prev => ({ ...prev, id: res.data.id }));
    }
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Company information saved" });
  };

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Password updated", description: "Your password has been changed successfully." });
  };

  const statusColor: Record<string, string> = {
    prospect: "bg-muted text-muted-foreground",
    pending_compliance: "bg-yellow-500/10 text-yellow-600",
    active: "bg-green-500/10 text-green-600",
    suspended: "bg-destructive/10 text-destructive",
    inactive: "bg-muted text-muted-foreground",
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Account</h1>
            <p className="text-sm text-muted-foreground">Manage your profile, company details & NVOCC compliance</p>
          </div>
        </div>
        {company.id && (
          <Badge className={statusColor[company.status] || ""}>{company.status.replace("_", " ").toUpperCase()}</Badge>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="profile" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Company</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" />Compliance</TabsTrigger>
          <TabsTrigger value="insurance" className="gap-1.5 text-xs"><FileCheck className="h-3.5 w-3.5" />Insurance</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" />Billing</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Profile</CardTitle>
              <CardDescription>Personal account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-lg">
              <div>
                <Label className="mb-3 block">Company Logo</Label>
                <div className="flex items-center gap-4">
                  {profile.avatar_url ? (
                    <div className="relative group">
                      <img src={profile.avatar_url} alt="Logo" className="h-16 w-16 rounded-lg object-contain border bg-secondary" />
                      <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/50">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={logoUploading}>
                      {logoUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                      {profile.avatar_url ? "Change" : "Upload"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div><Label>Full Name</Label><Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} className="mt-1" /></div>
              <div><Label>Email</Label><Input value={user?.email || ""} disabled className="mt-1 opacity-60" /></div>
              <div><Label>Company Display Name</Label><Input value={profile.company_name} onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))} className="mt-1" /></div>
              <Button variant="electric" onClick={saveProfile} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPANY TAB */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Information</CardTitle>
              <CardDescription>Legal entity and contact details for your NVOCC operation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Legal Company Name *</Label><Input value={company.company_name} onChange={e => setCompany(c => ({ ...c, company_name: e.target.value }))} className="mt-1" /></div>
                <div><Label>Trade Name / DBA</Label><Input value={company.trade_name} onChange={e => setCompany(c => ({ ...c, trade_name: e.target.value }))} className="mt-1" /></div>
                <div><Label>EIN (Tax ID)</Label><Input value={company.ein} onChange={e => setCompany(c => ({ ...c, ein: e.target.value }))} placeholder="XX-XXXXXXX" className="mt-1" /></div>
                <div><Label>DUNS Number</Label><Input value={company.duns_number} onChange={e => setCompany(c => ({ ...c, duns_number: e.target.value }))} className="mt-1" /></div>
                <div><Label>Industry</Label><Input value={company.industry} onChange={e => setCompany(c => ({ ...c, industry: e.target.value }))} className="mt-1" /></div>
                <div><Label>Website</Label><Input value={company.website} onChange={e => setCompany(c => ({ ...c, website: e.target.value }))} className="mt-1" /></div>
                <div><Label>Email</Label><Input value={company.email} onChange={e => setCompany(c => ({ ...c, email: e.target.value }))} className="mt-1" /></div>
                <div><Label>Phone</Label><Input value={company.phone} onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))} className="mt-1" /></div>
              </div>
              <Separator />
              <h3 className="text-sm font-medium text-foreground">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><Label>Street Address</Label><Input value={company.address} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))} className="mt-1" /></div>
                <div><Label>City</Label><Input value={company.city} onChange={e => setCompany(c => ({ ...c, city: e.target.value }))} className="mt-1" /></div>
                <div><Label>State</Label><Input value={company.state} onChange={e => setCompany(c => ({ ...c, state: e.target.value }))} className="mt-1" /></div>
                <div><Label>ZIP Code</Label><Input value={company.zip} onChange={e => setCompany(c => ({ ...c, zip: e.target.value }))} className="mt-1" /></div>
                <div><Label>Country</Label><Input value={company.country} onChange={e => setCompany(c => ({ ...c, country: e.target.value }))} className="mt-1" /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={company.notes} onChange={e => setCompany(c => ({ ...c, notes: e.target.value }))} className="mt-1" rows={3} /></div>
              <Button variant="electric" onClick={saveCompany} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save Company Info</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPLIANCE TAB */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">FMC Licensing & Bonds</CardTitle>
              <CardDescription>Federal Maritime Commission license and OTI bond information required for NVOCC operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>FMC License Number</Label><Input value={company.fmc_license_number} onChange={e => setCompany(c => ({ ...c, fmc_license_number: e.target.value }))} placeholder="XXXXXX-N/F" className="mt-1" /></div>
                <div>
                  <Label>License Status</Label>
                  <Select value={company.fmc_license_status} onValueChange={v => setCompany(c => ({ ...c, fmc_license_status: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>License Expiry</Label><Input type="date" value={company.fmc_license_expiry} onChange={e => setCompany(c => ({ ...c, fmc_license_expiry: e.target.value }))} className="mt-1" /></div>
              </div>
              <Separator />
              <h3 className="text-sm font-medium text-foreground">OTI Surety Bond</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Bond Number</Label><Input value={company.oti_bond_number} onChange={e => setCompany(c => ({ ...c, oti_bond_number: e.target.value }))} className="mt-1" /></div>
                <div><Label>Surety Company</Label><Input value={company.oti_bond_surety} onChange={e => setCompany(c => ({ ...c, oti_bond_surety: e.target.value }))} className="mt-1" /></div>
                <div><Label>Bond Amount ($)</Label><Input type="number" value={company.oti_bond_amount ?? ""} onChange={e => setCompany(c => ({ ...c, oti_bond_amount: e.target.value ? Number(e.target.value) : null }))} placeholder="75000" className="mt-1" /></div>
              </div>
              <Separator />
              <h3 className="text-sm font-medium text-foreground">SAM Registration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>SAM / UEI Number</Label><Input value={company.sam_registration} onChange={e => setCompany(c => ({ ...c, sam_registration: e.target.value }))} className="mt-1" /></div>
                <div><Label>SAM Expiry</Label><Input type="date" value={company.sam_expiry} onChange={e => setCompany(c => ({ ...c, sam_expiry: e.target.value }))} className="mt-1" /></div>
              </div>
              <Button variant="electric" onClick={saveCompany} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save Compliance Info</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INSURANCE TAB */}
        <TabsContent value="insurance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insurance Certificates</CardTitle>
              <CardDescription>Cargo and general liability insurance coverage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <h3 className="text-sm font-medium text-foreground">Cargo Insurance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Insurance Provider</Label><Input value={company.cargo_insurance_provider} onChange={e => setCompany(c => ({ ...c, cargo_insurance_provider: e.target.value }))} className="mt-1" /></div>
                <div><Label>Policy Number</Label><Input value={company.cargo_insurance_policy} onChange={e => setCompany(c => ({ ...c, cargo_insurance_policy: e.target.value }))} className="mt-1" /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={company.cargo_insurance_expiry} onChange={e => setCompany(c => ({ ...c, cargo_insurance_expiry: e.target.value }))} className="mt-1" /></div>
              </div>
              <Separator />
              <h3 className="text-sm font-medium text-foreground">General Liability</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Insurance Provider</Label><Input value={company.general_liability_provider} onChange={e => setCompany(c => ({ ...c, general_liability_provider: e.target.value }))} className="mt-1" /></div>
                <div><Label>Policy Number</Label><Input value={company.general_liability_policy} onChange={e => setCompany(c => ({ ...c, general_liability_policy: e.target.value }))} className="mt-1" /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={company.general_liability_expiry} onChange={e => setCompany(c => ({ ...c, general_liability_expiry: e.target.value }))} className="mt-1" /></div>
              </div>
              <Button variant="electric" onClick={saveCompany} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save Insurance Info</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billing & Credit Terms</CardTitle>
              <CardDescription>Payment configuration and credit arrangements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Billing Email</Label><Input value={company.billing_email} onChange={e => setCompany(c => ({ ...c, billing_email: e.target.value }))} className="mt-1" /></div>
                <div className="md:col-span-2"><Label>Billing Address</Label><Textarea value={company.billing_address} onChange={e => setCompany(c => ({ ...c, billing_address: e.target.value }))} className="mt-1" rows={2} /></div>
                <div>
                  <Label>Credit Terms</Label>
                  <Select value={company.credit_terms} onValueChange={v => setCompany(c => ({ ...c, credit_terms: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prepaid">Prepaid</SelectItem>
                      <SelectItem value="net_15">Net 15</SelectItem>
                      <SelectItem value="net_30">Net 30</SelectItem>
                      <SelectItem value="net_45">Net 45</SelectItem>
                      <SelectItem value="net_60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Credit Limit ($)</Label><Input type="number" value={company.credit_limit ?? ""} onChange={e => setCompany(c => ({ ...c, credit_limit: e.target.value ? Number(e.target.value) : null }))} className="mt-1" /></div>
                <div><Label>Payment Terms (days)</Label><Input type="number" value={company.payment_terms_days ?? ""} onChange={e => setCompany(c => ({ ...c, payment_terms_days: e.target.value ? Number(e.target.value) : null }))} className="mt-1" /></div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Switch checked={company.w9_on_file} onCheckedChange={v => setCompany(c => ({ ...c, w9_on_file: v }))} />
                <Label>W-9 on file</Label>
              </div>
              <Button variant="electric" onClick={saveCompany} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save Billing Info</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Account;
