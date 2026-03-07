import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore, addDays } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, Shield, CreditCard, Users, FileText,
  History, Package, AlertTriangle, CheckCircle2, Clock, XCircle,
  Plus, Edit,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyContacts } from "@/components/crm/CompanyContacts";
import { CompanyActivityLog } from "@/components/crm/CompanyActivityLog";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  prospect: { label: "Prospect", color: "bg-secondary text-muted-foreground" },
  pending_compliance: { label: "Pending Compliance", color: "bg-yellow-100 text-yellow-700" },
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  suspended: { label: "Suspended", color: "bg-destructive/10 text-destructive" },
  inactive: { label: "Inactive", color: "bg-secondary text-muted-foreground" },
};

function ExpiryBadge({ date, label }: { date: string | null; label: string }) {
  if (!date) return <span className="text-xs text-muted-foreground">Not set</span>;
  const d = new Date(date);
  const now = new Date();
  const expired = isBefore(d, now);
  const expiringSoon = !expired && isBefore(d, addDays(now, 30));
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-foreground">{format(d, "MMM d, yyyy")}</span>
      {expired && (
        <Badge variant="outline" className="text-[9px] border-destructive/40 text-destructive bg-destructive/5">Expired</Badge>
      )}
      {expiringSoon && (
        <Badge variant="outline" className="text-[9px] border-yellow-400 text-yellow-600 bg-yellow-50">Expiring</Badge>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value || "—"}</p>
    </div>
  );
}

const CompanyDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ["company-shipments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("company_id", id!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from("companies").update({ status: newStatus as any }).eq("id", id!);
      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("company_activities").insert({
          company_id: id!,
          user_id: user.id,
          activity_type: "status_change",
          title: `Status changed to ${newStatus.replace(/_/g, " ")}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["company-activities", id] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-foreground mb-2">Company not found</h2>
          <Button variant="electric" asChild>
            <Link to="/dashboard/companies">Back to Companies</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[company.status] || STATUS_CONFIG.prospect;

  // Compliance checklist
  const complianceItems = [
    { label: "FMC License", done: !!company.fmc_license_number, expiry: company.fmc_license_expiry },
    { label: "OTI Bond", done: !!company.oti_bond_number },
    { label: "EIN", done: !!company.ein },
    { label: "W-9 on File", done: company.w9_on_file },
    { label: "SAM Registration", done: !!company.sam_registration, expiry: company.sam_expiry },
    { label: "Cargo Insurance", done: !!company.cargo_insurance_policy, expiry: company.cargo_insurance_expiry },
    { label: "General Liability", done: !!company.general_liability_policy, expiry: company.general_liability_expiry },
  ];
  const complianceScore = complianceItems.filter((c) => c.done).length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
          <Link to="/dashboard/companies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Companies
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{company.company_name}</h1>
                <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</Badge>
              </div>
              {company.trade_name && <p className="text-sm text-muted-foreground">DBA: {company.trade_name}</p>}
            </div>
          </div>
          <Select value={company.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
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

      {/* Compliance progress bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Compliance Score</span>
            <span className="text-sm font-bold text-accent">{complianceScore}/{complianceItems.length}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${(complianceScore / complianceItems.length) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {complianceItems.map((item) => (
              <Badge
                key={item.label}
                variant="outline"
                className={`text-[10px] ${item.done ? "border-green-400/40 text-green-600 bg-green-50" : "border-border text-muted-foreground"}`}
              >
                {item.done ? <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> : <Clock className="h-2.5 w-2.5 mr-1" />}
                {item.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="compliance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compliance" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Compliance</TabsTrigger>
          <TabsTrigger value="credit" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Credit & Billing</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Contacts</TabsTrigger>
          <TabsTrigger value="shipments" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Shipments</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><History className="h-3.5 w-3.5" /> Activity</TabsTrigger>
        </TabsList>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">FMC & Bond</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="FMC License #" value={company.fmc_license_number} />
                <InfoRow label="FMC License Status" value={company.fmc_license_status} />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">FMC License Expiry</p>
                  <ExpiryBadge date={company.fmc_license_expiry} label="FMC" />
                </div>
                <Separator />
                <InfoRow label="OTI Bond #" value={company.oti_bond_number} />
                <InfoRow label="Bond Amount" value={company.oti_bond_amount ? `$${Number(company.oti_bond_amount).toLocaleString()}` : null} />
                <InfoRow label="Bond Surety" value={company.oti_bond_surety} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Tax & Registration</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="EIN" value={company.ein} />
                <InfoRow label="DUNS Number" value={company.duns_number} />
                <InfoRow label="W-9 on File" value={company.w9_on_file ? "Yes" : "No"} />
                <InfoRow label="SAM Registration" value={company.sam_registration} />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">SAM Expiry</p>
                  <ExpiryBadge date={company.sam_expiry} label="SAM" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Cargo Insurance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Provider" value={company.cargo_insurance_provider} />
                <InfoRow label="Policy #" value={company.cargo_insurance_policy} />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Expiry</p>
                  <ExpiryBadge date={company.cargo_insurance_expiry} label="Cargo Insurance" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">General Liability</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Provider" value={company.general_liability_provider} />
                <InfoRow label="Policy #" value={company.general_liability_policy} />
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Expiry</p>
                  <ExpiryBadge date={company.general_liability_expiry} label="General Liability" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Credit & Billing Tab */}
        <TabsContent value="credit">
          <Card>
            <CardHeader><CardTitle className="text-sm">Credit & Billing Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                <InfoRow label="Credit Terms" value={company.credit_terms} />
                <InfoRow label="Credit Limit" value={company.credit_limit ? `$${Number(company.credit_limit).toLocaleString()}` : null} />
                <InfoRow label="Payment Terms" value={company.payment_terms_days ? `Net ${company.payment_terms_days}` : null} />
                <InfoRow label="Billing Email" value={company.billing_email} />
                <div className="col-span-2">
                  <InfoRow label="Billing Address" value={company.billing_address} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <CompanyContacts companyId={id!} />
        </TabsContent>

        {/* Shipments Tab */}
        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Linked Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              {shipments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No shipments linked to this company yet.</p>
              ) : (
                <div className="space-y-2">
                  {shipments.map((s: any) => (
                    <Link key={s.id} to={`/dashboard/shipments/${s.id}`}>
                      <div className="flex items-center justify-between py-2 px-3 rounded border border-border hover:border-accent/40 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.shipment_ref}</p>
                          <p className="text-xs text-muted-foreground">{s.origin_port} → {s.destination_port}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(s.created_at), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <CompanyActivityLog companyId={id!} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default CompanyDetail;
