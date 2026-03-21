import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Heart, MessageCircle, Share2, Send, Globe, Users2, Megaphone,
  TrendingUp, Newspaper, Loader2, MoreHorizontal, Trash2, Pin
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const POST_TYPES = [
  { value: "update", label: "Update", icon: Globe },
  { value: "promotion", label: "Promotion", icon: Megaphone },
  { value: "rate_alert", label: "Rate Alert", icon: TrendingUp },
  { value: "article", label: "Article", icon: Newspaper },
];

function PostComposer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("update");

  const { data: profile } = useQuery({
    queryKey: ["community-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, company_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("feed_posts").insert({
        user_id: user!.id,
        content,
        post_type: postType,
        author_name: profile?.full_name || user!.email?.split("@")[0],
        author_avatar_url: profile?.avatar_url,
        company_name: profile?.company_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast({ title: "Post published!" });
    },
    onError: () => toast({ title: "Failed to post", variant: "destructive" }),
  });

  return (
    <Card className="mb-6">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {(profile?.full_name || "U")[0]}
            </AvatarFallback>
          </Avatar>
          <Textarea
            placeholder="Share an update, promotion, or insight with the community..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>
        <div className="flex items-center justify-between">
          <Select value={postType} onValueChange={setPostType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POST_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-2">
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!content.trim() || createPost.isPending}
            onClick={() => createPost.mutate()}
          >
            {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PostCard({ post, currentUserId }: { post: any; currentUserId: string }) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: reactions = [] } = useQuery({
    queryKey: ["feed-reactions", post.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("feed_reactions")
        .select("*")
        .eq("post_id", post.id);
      return data || [];
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["feed-comments", post.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("feed_comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: showComments,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["community-profile", currentUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, company_name")
        .eq("user_id", currentUserId)
        .maybeSingle();
      return data;
    },
  });

  const hasLiked = reactions.some((r: any) => r.user_id === currentUserId && r.reaction_type === "like");
  const likeCount = reactions.filter((r: any) => r.reaction_type === "like").length;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (hasLiked) {
        await supabase
          .from("feed_reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId)
          .eq("reaction_type", "like");
      } else {
        await supabase.from("feed_reactions").insert({
          post_id: post.id,
          user_id: currentUserId,
          reaction_type: "like",
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-reactions", post.id] }),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("feed_comments").insert({
        post_id: post.id,
        user_id: currentUserId,
        content: commentText,
        author_name: myProfile?.full_name || "User",
        author_avatar_url: myProfile?.avatar_url,
        company_name: myProfile?.company_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["feed-comments", post.id] });
    },
  });

  const sharePost = useMutation({
    mutationFn: async () => {
      await supabase.from("feed_posts").insert({
        user_id: currentUserId,
        content: `Shared: "${post.content.slice(0, 120)}${post.content.length > 120 ? "..." : ""}"`,
        post_type: "update",
        original_post_id: post.id,
        author_name: myProfile?.full_name || "User",
        author_avatar_url: myProfile?.avatar_url,
        company_name: myProfile?.company_name,
      });
      await supabase
        .from("feed_posts")
        .update({ share_count: (post.share_count || 0) + 1 })
        .eq("id", post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast({ title: "Post shared!" });
    },
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      await supabase.from("feed_posts").delete().eq("id", post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast({ title: "Post deleted" });
    },
  });

  const typeInfo = POST_TYPES.find((t) => t.value === post.post_type) || POST_TYPES[0];
  const TypeIcon = typeInfo.icon;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author_avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {(post.author_name || "?")[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{post.author_name || "Unknown"}</span>
                {post.company_name && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {post.company_name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TypeIcon className="h-3 w-3" />
                <span>{typeInfo.label}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          {post.user_id === currentUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deletePost.mutate()}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-foreground whitespace-pre-wrap mb-4 leading-relaxed">
          {post.content}
        </p>

        {/* Original post reference */}
        {post.original_post_id && (
          <div className="border rounded-md p-3 mb-3 bg-muted/30">
            <p className="text-xs text-muted-foreground italic">Shared post</p>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1 border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs gap-1.5 ${hasLiked ? "text-red-500" : "text-muted-foreground"}`}
            onClick={() => toggleLike.mutate()}
          >
            <Heart className={`h-4 w-4 ${hasLiked ? "fill-red-500" : ""}`} />
            {likeCount > 0 && likeCount}
            {likeCount === 0 ? "Like" : ""}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4" />
            Comment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground"
            onClick={() => sharePost.mutate()}
            disabled={sharePost.isPending}
          >
            <Share2 className="h-4 w-4" />
            {post.share_count > 0 ? post.share_count : "Share"}
          </Button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-3 border-t pt-3 space-y-3">
            {comments.map((c: any) => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={c.author_avatar_url || ""} />
                  <AvatarFallback className="text-[10px] bg-muted">
                    {(c.author_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted/50 rounded-lg px-3 py-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{c.author_name}</span>
                    {c.company_name && (
                      <span className="text-[10px] text-muted-foreground">· {c.company_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground mt-0.5">{c.content}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="min-h-[36px] h-9 text-xs resize-none py-2"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                disabled={!commentText.trim() || addComment.isPending}
                onClick={() => addComment.mutate()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const Community = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("all");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["feed-posts", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Community</h1>
          <p className="text-sm text-muted-foreground">
            Share updates, promote services, and engage with your logistics network
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="gap-1.5">
              <Globe className="h-3.5 w-3.5" /> All Posts
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-1.5">
              <Users2 className="h-3.5 w-3.5" /> My Network
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <PostComposer />
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No posts yet. Be the first to share!</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post: any) => (
                <PostCard key={post.id} post={post} currentUserId={user!.id} />
              ))
            )}
          </TabsContent>

          <TabsContent value="network">
            <PostComposer />
            <Card>
              <CardContent className="py-12 text-center">
                <Users2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Network feed shows posts from companies you've transacted with
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Complete shipments with partners to grow your network
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Community;
