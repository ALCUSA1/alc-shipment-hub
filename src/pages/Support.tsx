import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { PriorityBadge, type CustomerPriority } from "@/components/shared/PriorityBadge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { TicketDetail } from "@/components/support/TicketDetail";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Open", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "default" },
  waiting_on_customer: { label: "Waiting on You", variant: "outline" },
  resolved: { label: "Resolved", variant: "secondary" },
  closed: { label: "Closed", variant: "secondary" },
};

const CATEGORIES = ["Shipment", "Billing", "Documents", "Booking", "Technical", "General"];
const PRIORITIES: { value: CustomerPriority; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "attention_needed", label: "Attention Needed" },
  { value: "urgent", label: "Urgent" },
  { value: "critical", label: "Critical Issue" },
];

export default function Support() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ category: "", subject: "", description: "", priority: "normal" as CustomerPriority });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const ref = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user!.id,
        ticket_ref: ref,
        category: form.category.toLowerCase(),
        subject: form.subject,
        description: form.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setCreateOpen(false);
      setForm({ category: "", subject: "", description: "" });
      toast.success("Ticket created successfully");
    },
    onError: () => toast.error("Failed to create ticket"),
  });

  const filtered = tickets.filter((t: any) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (searchQuery && !t.subject.toLowerCase().includes(searchQuery.toLowerCase()) && !t.ticket_ref.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (selectedTicket) {
    return (
      <DashboardLayout>
        <TicketDetail ticketId={selectedTicket} onBack={() => setSelectedTicket(null)} />
      </DashboardLayout>
    );
  }

  const stats = {
    open: tickets.filter((t: any) => t.status === "open").length,
    inProgress: tickets.filter((t: any) => t.status === "in_progress").length,
    resolved: tickets.filter((t: any) => t.status === "resolved" || t.status === "closed").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Support</h1>
            <p className="text-sm text-muted-foreground">Get help and track your support requests</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Ticket</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input placeholder="Brief summary of the issue" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe your issue in detail..." rows={5} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <Button className="w-full" disabled={!form.category || !form.subject || !form.description || createTicket.isPending} onClick={() => createTicket.mutate()}>
                  {createTicket.isPending ? "Creating..." : "Submit Ticket"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div><p className="text-2xl font-bold text-foreground">{stats.open}</p><p className="text-xs text-muted-foreground">Open</p></div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div><p className="text-2xl font-bold text-foreground">{stats.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
            </CardContent>
          </Card>
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              <div><p className="text-2xl font-bold text-foreground">{stats.resolved}</p><p className="text-xs text-muted-foreground">Resolved</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tickets..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Ticket List */}
        <div className="space-y-2">
          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading tickets...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No tickets found. Create one to get started.</CardContent></Card>
          ) : (
            filtered.map((ticket: any) => {
              const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
              return (
                <Card key={ticket.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedTicket(ticket.id)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_ref}</span>
                        <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
                        <Badge variant="outline" className="text-[10px]">{ticket.category}</Badge>
                      </div>
                      <p className="font-medium text-sm text-foreground truncate mt-0.5">{ticket.subject}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{format(new Date(ticket.created_at), "MMM d, yyyy")}</p>
                      <p className="text-[10px] text-muted-foreground">Updated {format(new Date(ticket.updated_at), "MMM d")}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
