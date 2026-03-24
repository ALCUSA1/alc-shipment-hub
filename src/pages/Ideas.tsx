import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, ThumbsUp, MessageCircle, Search, Lightbulb, Rocket, Eye, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { IdeaDetail } from "@/components/ideas/IdeaDetail";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  under_review: { label: "Under Review", icon: Eye, color: "text-muted-foreground" },
  planned: { label: "Planned", icon: Rocket, color: "text-primary" },
  in_progress: { label: "In Progress", icon: Lightbulb, color: "text-accent" },
  released: { label: "Released", icon: CheckCircle2, color: "text-green-500" },
};

const IDEA_CATEGORIES = ["UI", "Features", "Performance", "Integration"];

export default function Ideas() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"votes" | "recent">("votes");
  const [form, setForm] = useState({ title: "", description: "", category: "" });

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["feature-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_requests").select("*").order("vote_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: userVotes = [] } = useQuery({
    queryKey: ["user-votes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_request_votes").select("feature_request_id").eq("user_id", user!.id);
      if (error) throw error;
      return data.map((v: any) => v.feature_request_id);
    },
    enabled: !!user,
  });

  const submitIdea = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("feature_requests").insert({
        user_id: user!.id,
        title: form.title,
        description: form.description,
        category: form.category.toLowerCase(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-requests"] });
      setCreateOpen(false);
      setForm({ title: "", description: "", category: "" });
      toast.success("Idea submitted!");
    },
  });

  const toggleVote = useMutation({
    mutationFn: async (ideaId: string) => {
      const hasVoted = userVotes.includes(ideaId);
      if (hasVoted) {
        await supabase.from("feature_request_votes").delete().eq("feature_request_id", ideaId).eq("user_id", user!.id);
        await supabase.from("feature_requests").update({ vote_count: (ideas.find((i: any) => i.id === ideaId)?.vote_count || 1) - 1 }).eq("id", ideaId);
      } else {
        await supabase.from("feature_request_votes").insert({ feature_request_id: ideaId, user_id: user!.id });
        await supabase.from("feature_requests").update({ vote_count: (ideas.find((i: any) => i.id === ideaId)?.vote_count || 0) + 1 }).eq("id", ideaId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-requests"] });
      queryClient.invalidateQueries({ queryKey: ["user-votes"] });
    },
  });

  const filtered = ideas
    .filter((i: any) => {
      if (filterCategory !== "all" && i.category !== filterCategory.toLowerCase()) return false;
      if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a: any, b: any) => sortBy === "votes" ? b.vote_count - a.vote_count : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (selectedIdea) {
    return (
      <DashboardLayout>
        <IdeaDetail ideaId={selectedIdea} onBack={() => setSelectedIdea(null)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ideas</h1>
            <p className="text-sm text-muted-foreground">Share feedback and vote on product improvements</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Submit Idea</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Submit an Idea</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {IDEA_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="A short, descriptive title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe your idea and how it would help..." rows={5} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <Button className="w-full" disabled={!form.category || !form.title || !form.description || submitIdea.isPending} onClick={() => submitIdea.mutate()}>
                  {submitIdea.isPending ? "Submitting..." : "Submit Idea"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search ideas..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {IDEA_CATEGORIES.map((c) => <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="votes">Most Voted</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ideas List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading ideas...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No ideas yet. Be the first to share one!</CardContent></Card>
          ) : (
            filtered.map((idea: any) => {
              const sc = STATUS_CONFIG[idea.status] || STATUS_CONFIG.under_review;
              const StatusIcon = sc.icon;
              const voted = userVotes.includes(idea.id);
              return (
                <Card key={idea.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4 flex items-start gap-4">
                    {/* Vote button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleVote.mutate(idea.id); }}
                      className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-colors shrink-0 ${voted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      <ThumbsUp className={`h-4 w-4 ${voted ? "fill-current" : ""}`} />
                      <span className="text-sm font-bold">{idea.vote_count}</span>
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedIdea(idea.id)}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{idea.category}</Badge>
                        <span className={`flex items-center gap-1 text-[10px] font-medium ${sc.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </div>
                      <p className="font-medium text-sm text-foreground">{idea.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{idea.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(idea.created_at), "MMM d, yyyy")}</p>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                      <MessageCircle className="h-3.5 w-3.5" />
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
