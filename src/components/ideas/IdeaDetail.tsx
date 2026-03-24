import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, ThumbsUp, User, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface IdeaDetailProps {
  ideaId: string;
  onBack: () => void;
}

const STATUSES = ["under_review", "planned", "in_progress", "released"];

export function IdeaDetail({ ideaId, onBack }: IdeaDetailProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: idea } = useQuery({
    queryKey: ["feature-request", ideaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_requests").select("*").eq("id", ideaId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["idea-comments", ideaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_request_comments").select("*").eq("feature_request_id", ideaId).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("feature_request_comments").insert({
        feature_request_id: ideaId,
        user_id: user!.id,
        user_name: user?.email?.split("@")[0] || "User",
        content: comment,
        is_staff: isAdmin,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["idea-comments", ideaId] });
      setComment("");
      toast.success("Comment added");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from("feature_requests").update({ status: newStatus }).eq("id", ideaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-request", ideaId] });
      queryClient.invalidateQueries({ queryKey: ["feature-requests"] });
      toast.success("Status updated");
    },
  });

  if (!idea) return null;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Back to ideas</Button>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{idea.category}</Badge>
                <div className="flex items-center gap-1 text-primary">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span className="text-sm font-bold">{idea.vote_count} votes</span>
                </div>
              </div>
              <h2 className="text-lg font-semibold text-foreground">{idea.title}</h2>
            </div>
            {isAdmin && (
              <Select value={idea.status} onValueChange={(v) => updateStatus.mutate(v)}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{idea.description}</p>
          {idea.admin_response && (
            <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs font-medium text-primary mb-1">Official Response</p>
              <p className="text-sm text-foreground">{idea.admin_response}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">{format(new Date(idea.created_at), "MMM d, yyyy")}</p>
        </CardContent>
      </Card>

      {/* Comments */}
      <h3 className="text-sm font-semibold text-foreground">Comments</h3>
      <div className="space-y-3 max-h-[350px] overflow-y-auto">
        {comments.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No comments yet</p>}
        {comments.map((c: any) => (
          <div key={c.id} className="flex gap-3">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${c.is_staff ? "bg-primary/10" : "bg-muted"}`}>
              {c.is_staff ? <Shield className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{c.user_name}</span>
                {c.is_staff && <Badge variant="default" className="text-[9px] h-4">Staff</Badge>}
                <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), "MMM d, h:mm a")}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Textarea placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="flex-1" />
        <Button size="icon" className="shrink-0 self-end" disabled={!comment.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
