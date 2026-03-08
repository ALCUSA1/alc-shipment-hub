import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, ShieldCheck, FileText, Ship, DollarSign, Users, Activity } from "lucide-react";

const statusColors: Record<string, string> = {
  prospect: "bg-[hsl(220,10%,20%)] text-[hsl(220,10%,60%)] border-[hsl(220,15%,25%)]",
  pending_compliance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  inactive: "bg-[hsl(220,10%,15%)] text-[hsl(220,10%,40%)] border-[hsl(220,15%,20%)]",
};

function daysDiff(d1: Date, d2: Date) {
  return Math.floor((d1.getTime() - d2.getTime()) / 86400000);
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-[hsl(220,10%,40%)]">—</span>;
  const days = daysDiff(new Date(date), new Date());
  if (days < 0) return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Expired {Math.abs(days)}d ago</Badge>;
  if (days <= 60) return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Expires in {days}d</Badge>;
  return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Valid — {days}d</Badge>;
}

const SectionCard = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
  <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 text-indigo-400" />
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">{label}</p>
    <p className="text-xs text-white">{value || <span className="text-[hsl(220,10%,30%)]">—</span>}</p>
  </div>
);

const AdminCompanyDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: company, isLoading } = useQuery({
    queryKey: ["admin-company", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: contacts } = useQuery({
    queryKey: ["admin-company-contacts", id],
    queryFn: async () => {
      const { data } = await supabase.from("company_contacts").select("*").eq("company_id", id!).order("is_primary", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: shipments } = useQuery({
    queryKey: ["admin-company-shipments", id],
    queryFn: async () => {
      const { data } = await supabase.from("shipments").select("id, shipment_ref, status, origin_port, destination_port, etd, eta, created_at").eq("company_id", id!).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: quotes } = useQuery({
    queryKey: ["admin-company-quotes", id],
    queryFn: async () => {
      const { data } = await supabase.from("quotes").select("id, status, carrier, origin_port, destination_port, customer_price, currency, created_at").eq("company_id", id!).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ["admin-company-documents", id],
    queryFn: async () => {
      const { data } = await supabase.from("company_documents").select("*").eq("company_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: ["admin-company-activities", id],
    queryFn: async () => {
      const { data } = await supabase.from("company_activities").select("*").eq("company_id", id!).order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading || !company) {
    return (
      <AdminLayout>
        <Skeleton className="h-96 w-full bg-[hsl(220,15%,15%)]" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/crm" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to CRM
        </Link>
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">{company.company_name}</h1>
            {company.trade_name && <p className="text-xs text-[hsl(220,10%,50%)]">DBA: {company.trade_name}</p>}
          </div>
          <Badge variant="outline" className={`ml-auto text-[10px] ${statusColors[company.status] || ""}`}>
            {company.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,18%)]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)] text-xs">Overview</TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)] text-xs">Compliance</TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)] text-xs">Contacts ({contacts?.length || 0})</TabsTrigger>
          <TabsTrigger value="shipments" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)] text-xs">Shipments ({shipments?.length || 0})</TabsTrigger>
          <TabsTrigger value="quotes" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)] text-xs">Quotes ({quotes?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)] text-xs">Documents ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,50%)] text-xs">Activity</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <SectionCard title="Company Info" icon={Building2}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email" value={company.email} />
                <Field label="Phone" value={company.phone} />
                <Field label="Website" value={company.website} />
                <Field label="Industry" value={company.industry} />
                <Field label="Address" value={[company.address, company.city, company.state, company.zip, company.country].filter(Boolean).join(", ")} />
                <Field label="EIN" value={company.ein} />
                <Field label="DUNS" value={company.duns_number} />
                <Field label="Created" value={new Date(company.created_at).toLocaleDateString()} />
              </div>
            </SectionCard>

            <SectionCard title="Billing & Credit" icon={DollarSign}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Credit Terms" value={company.credit_terms} />
                <Field label="Credit Limit" value={company.credit_limit ? `$${Number(company.credit_limit).toLocaleString()}` : null} />
                <Field label="Payment Terms" value={company.payment_terms_days ? `${company.payment_terms_days} days` : null} />
                <Field label="Billing Email" value={company.billing_email} />
                <Field label="Billing Address" value={company.billing_address} />
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* COMPLIANCE TAB */}
        <TabsContent value="compliance">
          <div className="grid md:grid-cols-2 gap-6">
            <SectionCard title="FMC License & OTI Bond" icon={ShieldCheck}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="FMC License #" value={company.fmc_license_number} />
                <Field label="FMC Status" value={company.fmc_license_status} />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">FMC Expiry</p>
                  <ExpiryBadge date={company.fmc_license_expiry} />
                </div>
                <Field label="OTI Bond #" value={company.oti_bond_number} />
                <Field label="Bond Surety" value={company.oti_bond_surety} />
                <Field label="Bond Amount" value={company.oti_bond_amount ? `$${Number(company.oti_bond_amount).toLocaleString()}` : null} />
              </div>
            </SectionCard>

            <SectionCard title="Insurance & Registrations" icon={ShieldCheck}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cargo Insurance" value={company.cargo_insurance_provider} />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Cargo Ins. Expiry</p>
                  <ExpiryBadge date={company.cargo_insurance_expiry} />
                </div>
                <Field label="GL Insurance" value={company.general_liability_provider} />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">GL Expiry</p>
                  <ExpiryBadge date={company.general_liability_expiry} />
                </div>
                <Field label="SAM Registration" value={company.sam_registration} />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">SAM Expiry</p>
                  <ExpiryBadge date={company.sam_expiry} />
                </div>
                <Field label="W-9 on File" value={company.w9_on_file ? "Yes" : "No"} />
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* CONTACTS TAB */}
        <TabsContent value="contacts">
          <SectionCard title="Contacts" icon={Users}>
            {!contacts?.length ? (
              <p className="text-xs text-[hsl(220,10%,40%)]">No contacts on file</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] border-b border-[hsl(220,15%,15%)]">
                    <th className="text-left py-2">Name</th><th className="text-left py-2">Role</th><th className="text-left py-2">Email</th><th className="text-left py-2">Phone</th><th className="text-center py-2">Primary</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id} className="border-b border-[hsl(220,15%,13%)]">
                      <td className="py-2 text-xs text-white font-medium">{c.full_name}</td>
                      <td className="py-2 text-xs text-[hsl(220,10%,50%)]">{c.role}</td>
                      <td className="py-2 text-xs text-[hsl(220,10%,50%)]">{c.email || "—"}</td>
                      <td className="py-2 text-xs text-[hsl(220,10%,50%)]">{c.phone || "—"}</td>
                      <td className="py-2 text-center">{c.is_primary ? <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </TabsContent>

        {/* SHIPMENTS TAB */}
        <TabsContent value="shipments">
          <SectionCard title="Shipments" icon={Ship}>
            {!shipments?.length ? (
              <p className="text-xs text-[hsl(220,10%,40%)]">No shipments found</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] border-b border-[hsl(220,15%,15%)]">
                    <th className="text-left py-2">Ref</th><th className="text-left py-2">Route</th><th className="text-center py-2">Status</th><th className="text-left py-2">ETD</th><th className="text-left py-2">ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map(s => (
                    <tr key={s.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                      <td className="py-2 text-xs">
                        <Link to={`/admin/shipments/${s.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium">{s.shipment_ref}</Link>
                      </td>
                      <td className="py-2 text-xs text-[hsl(220,10%,50%)]">{s.origin_port} → {s.destination_port}</td>
                      <td className="py-2 text-center"><Badge variant="outline" className="text-[10px]">{s.status}</Badge></td>
                      <td className="py-2 text-xs text-[hsl(220,10%,50%)]">{s.etd || "—"}</td>
                      <td className="py-2 text-xs text-[hsl(220,10%,50%)]">{s.eta || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </TabsContent>

        {/* QUOTES TAB */}
        <TabsContent value="quotes">
          <SectionCard title="Quotes" icon={DollarSign}>
            {!quotes?.length ? (
              <p className="text-xs text-[hsl(220,10%,40%)]">No quotes found</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] border-b border-[hsl(220,15%,15%)]">
                    <th className="text-left py-2">Route</th><th className="text-left py-2">Carrier</th><th className="text-right py-2">Price</th><th className="text-center py-2">Status</th><th className="text-left py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(q => (
                    <tr key={q.id} className="border-b border-[hsl(220,15%,13%)]">
                      <td className="py-2 text-xs text-[hsl(220,10%,50%)]">{q.origin_port} → {q.destination_port}</td>
                      <td className="py-2 text-xs text-[hsl(220,10%,50%)]">{q.carrier || "—"}</td>
                      <td className="py-2 text-xs text-right text-white font-medium">{q.customer_price ? `$${Number(q.customer_price).toLocaleString()}` : "—"}</td>
                      <td className="py-2 text-center"><Badge variant="outline" className="text-[10px]">{q.status}</Badge></td>
                      <td className="py-2 text-xs text-[hsl(220,10%,50%)]">{new Date(q.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents">
          <SectionCard title="Documents" icon={FileText}>
            {!documents?.length ? (
              <p className="text-xs text-[hsl(220,10%,40%)]">No documents on file</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] border-b border-[hsl(220,15%,15%)]">
                    <th className="text-left py-2">Document</th><th className="text-left py-2">Type</th><th className="text-center py-2">Status</th><th className="text-left py-2">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(d => (
                    <tr key={d.id} className="border-b border-[hsl(220,15%,13%)]">
                      <td className="py-2 text-xs text-white font-medium">{d.doc_name}</td>
                      <td className="py-2 text-xs text-[hsl(220,10%,50%)]">{d.doc_type}</td>
                      <td className="py-2 text-center"><Badge variant="outline" className="text-[10px]">{d.status}</Badge></td>
                      <td className="py-2 text-xs"><ExpiryBadge date={d.expiry_date} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </TabsContent>

        {/* ACTIVITY TAB */}
        <TabsContent value="activity">
          <SectionCard title="Activity Log" icon={Activity}>
            {!activities?.length ? (
              <p className="text-xs text-[hsl(220,10%,40%)]">No activity recorded</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-white font-medium">{a.title}</p>
                      {a.description && <p className="text-[hsl(220,10%,50%)]">{a.description}</p>}
                      <p className="text-[hsl(220,10%,35%)] text-[10px] mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Notes */}
      {company.notes && (
        <div className="mt-6 rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] mb-2">Notes</p>
          <p className="text-xs text-[hsl(220,10%,60%)] whitespace-pre-wrap">{company.notes}</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCompanyDetail;
