import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminFilterBar, FilterConfig } from "@/components/admin/AdminFilterBar";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, Plus, ArrowRight, User, Mail, Phone, Building2, Star, MessageSquare, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const STAGES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
const SOURCES = ["manual", "referral", "website", "event", "cold_outreach", "partner"];

const stageColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  qualified: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  proposal: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  negotiation: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  won: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
};

const filters: FilterConfig[] = [
  { key: "status", label: "Stage", options: [{ value: "all", label: "All Stages" }, ...STAGES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))] },
  { key: "source", label: "Source", options: [{ value: "all", label: "All Sources" }, ...SOURCES.map(s => ({ value: s, label: s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }))] },
];

const AdminSalesPipeline = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLead, setNewLead] = useState({ full_name: "", email: "", phone: "", company_name: "", source: "manual", notes: "" });
  const [convertLead, setConvertLead] = useState<any>(null);
  const [convertData, setConvertData] = useState({ company_name: "", email: "", phone: "", status: "prospect" as string });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const addLead = useMutation({
    mutationFn: async (lead: typeof newLead) => {
      const { error } = await supabase.from("leads").insert({ ...lead, assigned_to: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      setIsAddOpen(false);
      setNewLead({ full_name: "", email: "", phone: "", company_name: "", source: "manual", notes: "" });
      toast.success("Lead added");
    },
    onError: () => toast.error("Failed to add lead"),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, stage, lead }: { id: string; stage: string; lead?: any }) => {
      const update: any = { stage };
      if (stage === "won") {
        update.converted_at = new Date().toISOString();
      }
      const { error } = await supabase.from("leads").update(update).eq("id", id);
      if (error) throw error;
      // If won and not yet converted, open the conversion dialog
      if (stage === "won" && lead && !lead.converted_company_id) {
        setConvertLead(lead);
        setConvertData({
          company_name: lead.company_name || lead.full_name,
          email: lead.email || "",
          phone: lead.phone || "",
          status: "prospect",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Stage updated");
    },
  });

  const convertToCompany = useMutation({
    mutationFn: async () => {
      if (!convertLead || !user) return;
      // Create the company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          company_name: convertData.company_name,
          email: convertData.email || null,
          phone: convertData.phone || null,
          status: convertData.status as any,
          user_id: user.id,
        })
        .select("id")
        .single();
      if (companyError) throw companyError;

      // Create a primary contact from the lead
      const { error: contactError } = await supabase
        .from("company_contacts")
        .insert({
          company_id: company.id,
          full_name: convertLead.full_name,
          email: convertLead.email || null,
          phone: convertLead.phone || null,
          role: "general",
          is_primary: true,
        });
      if (contactError) throw contactError;

      // Link the lead to the company
      const { error: linkError } = await supabase
        .from("leads")
        .update({ converted_company_id: company.id, converted_at: new Date().toISOString() })
        .eq("id", convertLead.id);
      if (linkError) throw linkError;

      return company.id;
    },
    onSuccess: (companyId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      setConvertLead(null);
      toast.success("Lead converted to company successfully!");
    },
    onError: (err: any) => toast.error(err.message || "Conversion failed"),
  });

  const searchFields = useCallback((l: any) => [l.full_name, l.email, l.company_name, l.phone], []);
  const statusField = useCallback((l: any) => l.stage, []);
  const dateField = useCallback((l: any) => l.created_at, []);

  const { search, setSearch, filterValues, onFilterChange, dateRange, setDateRange, filtered } = useAdminFilters({
    data: leads, searchFields, statusField, dateField,
  });

  // Apply source filter manually
  const sourceFilter = filterValues.source;
  const finalFiltered = sourceFilter && sourceFilter !== "all"
    ? filtered.filter((l: any) => l.source === sourceFilter)
    : filtered;

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = finalFiltered.filter((l: any) => l.stage === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-5 w-5 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white">Sales Pipeline</h1>
          </div>
          <p className="text-sm text-[hsl(220,10%,50%)]">Manage leads from cold outreach to conversion</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" /> New Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,18%)] text-white">
            <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-[hsl(220,10%,50%)]">Full Name *</Label><Input className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white" value={newLead.full_name} onChange={e => setNewLead(p => ({ ...p, full_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-[hsl(220,10%,50%)]">Email</Label><Input className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white" value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label className="text-xs text-[hsl(220,10%,50%)]">Phone</Label><Input className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white" value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div><Label className="text-xs text-[hsl(220,10%,50%)]">Company</Label><Input className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white" value={newLead.company_name} onChange={e => setNewLead(p => ({ ...p, company_name: e.target.value }))} /></div>
              <div><Label className="text-xs text-[hsl(220,10%,50%)]">Source</Label>
                <Select value={newLead.source} onValueChange={v => setNewLead(p => ({ ...p, source: v }))}>
                  <SelectTrigger className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs text-[hsl(220,10%,50%)]">Notes</Label><Textarea className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white" value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button className="w-full bg-gradient-to-r from-red-500 to-orange-600" disabled={!newLead.full_name || addLead.isPending} onClick={() => addLead.mutate(newLead)}>
                {addLead.isPending ? "Adding…" : "Add Lead"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stage pipeline summary */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 shrink-0">
            <div className={`rounded-lg border px-3 py-2 text-center min-w-[100px] ${stageColors[s]} border-current/20`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider">{s}</p>
              <p className="text-lg font-bold mt-0.5">{stageCounts[s]}</p>
            </div>
            {i < STAGES.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-[hsl(220,10%,25%)] shrink-0" />}
          </div>
        ))}
      </div>

      <AdminFilterBar
        searchPlaceholder="Search leads by name, email, company…"
        search={search} onSearchChange={setSearch}
        filters={filters} filterValues={filterValues} onFilterChange={onFilterChange}
        dateRange={dateRange} onDateRangeChange={setDateRange} showDateRange
        resultCount={finalFiltered.length} resultLabel="leads"
      />

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Lead</th>
                <th className="text-left px-4 py-3">Company</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-center px-4 py-3">Score</th>
                <th className="text-center px-4 py-3">Stage</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {finalFiltered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-xs text-[hsl(220,10%,40%)]">No leads match your filters</td></tr>
              ) : finalFiltered.map((l: any) => (
                <tr key={l.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-white">{l.full_name}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {l.email && <span className="text-[10px] text-[hsl(220,10%,45%)] flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{l.email}</span>}
                      {l.phone && <span className="text-[10px] text-[hsl(220,10%,45%)] flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{l.phone}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{l.company_name || "—"}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] bg-[hsl(220,10%,15%)] text-[hsl(220,10%,55%)] border-[hsl(220,15%,20%)]">{l.source.replace(/_/g, " ")}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`h-3 w-3 ${s <= (l.score / 20) ? "text-amber-400 fill-amber-400" : "text-[hsl(220,10%,25%)]"}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Select value={l.stage} onValueChange={stage => updateStage.mutate({ id: l.id, stage })}>
                      <SelectTrigger className={`h-7 text-[10px] border ${stageColors[l.stage]} bg-transparent w-28`}><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,45%)]">{new Date(l.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    {l.converted_company_id ? (
                      <Link to={`/admin/crm/${l.converted_company_id}`} className="text-[10px] text-emerald-400 hover:text-emerald-300">View Company →</Link>
                    ) : l.stage === "won" ? (
                      <span className="text-[10px] text-amber-400">Ready to convert</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSalesPipeline;
