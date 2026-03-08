import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, Send, Eye, Pencil, Trash2, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const SEGMENTS = ["all_customers", "active_customers", "prospects", "inactive", "leads"];
const STATUSES = ["draft", "scheduled", "sending", "sent", "paused"];

const statusColors: Record<string, string> = {
  draft: "bg-[hsl(220,10%,20%)] text-[hsl(220,10%,60%)] border-[hsl(220,15%,25%)]",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  sending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-red-500/10 text-red-400 border-red-500/20",
};

const AdminCampaigns = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", subject: "", body: "", target_segment: "all_customers" });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addCampaign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_campaigns").insert({ ...newCampaign, created_by: user?.id! });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setIsAddOpen(false);
      setNewCampaign({ name: "", subject: "", body: "", target_segment: "all_customers" });
      toast.success("Campaign created");
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      toast.success("Campaign deleted");
    },
  });

  const stats = {
    total: campaigns?.length || 0,
    sent: campaigns?.filter((c: any) => c.status === "sent").length || 0,
    totalSent: campaigns?.reduce((sum: number, c: any) => sum + (c.sent_count || 0), 0) || 0,
    totalOpens: campaigns?.reduce((sum: number, c: any) => sum + (c.open_count || 0), 0) || 0,
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-5 w-5 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white">Email Campaigns</h1>
          </div>
          <p className="text-sm text-[hsl(220,10%,50%)]">Create and manage outreach campaigns</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[hsl(220,18%,10%)] border-[hsl(220,15%,18%)] text-white max-w-lg">
            <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-[hsl(220,10%,50%)]">Campaign Name *</Label><Input className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white" value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label className="text-xs text-[hsl(220,10%,50%)]">Subject Line</Label><Input className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white" placeholder="e.g. Special Rate Offer — Q1 2026" value={newCampaign.subject} onChange={e => setNewCampaign(p => ({ ...p, subject: e.target.value }))} /></div>
              <div><Label className="text-xs text-[hsl(220,10%,50%)]">Target Segment</Label>
                <Select value={newCampaign.target_segment} onValueChange={v => setNewCampaign(p => ({ ...p, target_segment: v }))}>
                  <SelectTrigger className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEGMENTS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs text-[hsl(220,10%,50%)]">Email Body</Label><Textarea className="bg-[hsl(220,15%,12%)] border-[hsl(220,15%,18%)] text-white min-h-[120px]" placeholder="Write your campaign content…" value={newCampaign.body} onChange={e => setNewCampaign(p => ({ ...p, body: e.target.value }))} /></div>
              <Button className="w-full bg-gradient-to-r from-red-500 to-orange-600" disabled={!newCampaign.name || addCampaign.isPending} onClick={() => addCampaign.mutate()}>
                {addCampaign.isPending ? "Creating…" : "Create Draft"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Campaigns", value: stats.total, color: "text-white" },
          { label: "Campaigns Sent", value: stats.sent, color: "text-emerald-400" },
          { label: "Emails Delivered", value: stats.totalSent, color: "text-blue-400" },
          { label: "Total Opens", value: stats.totalOpens, color: "text-amber-400" },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6">
        <p className="text-xs text-amber-400">
          <strong>Note:</strong> Email sending requires a third-party email service integration (e.g., Resend). Campaigns can be drafted and managed here — connect an email provider to enable sending.
        </p>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="space-y-3">
          {(campaigns || []).length === 0 ? (
            <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-12 text-center text-xs text-[hsl(220,10%,40%)]">No campaigns yet — create your first one above</div>
          ) : (campaigns || []).map((c: any) => (
            <div key={c.id} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[hsl(220,15%,15%)] flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <Badge variant="outline" className={`text-[10px] ${statusColors[c.status] || ""}`}>{c.status}</Badge>
                  </div>
                  {c.subject && <p className="text-xs text-[hsl(220,10%,50%)] mb-1">Subject: {c.subject}</p>}
                  <div className="flex items-center gap-4 text-[10px] text-[hsl(220,10%,40%)]">
                    <span>Segment: {c.target_segment.replace(/_/g, " ")}</span>
                    <span>Created: {new Date(c.created_at).toLocaleDateString()}</span>
                    {c.sent_at && <span>Sent: {new Date(c.sent_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {c.status === "sent" && (
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-center">
                        <p className="text-[10px] text-[hsl(220,10%,40%)]">Sent</p>
                        <p className="font-bold text-white">{c.sent_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-[hsl(220,10%,40%)]">Opens</p>
                        <p className="font-bold text-emerald-400">{c.open_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-[hsl(220,10%,40%)]">Clicks</p>
                        <p className="font-bold text-blue-400">{c.click_count}</p>
                      </div>
                    </div>
                  )}
                  <button onClick={() => deleteCampaign.mutate(c.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCampaigns;
