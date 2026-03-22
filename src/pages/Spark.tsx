import { useState, useRef, useEffect, useCallback } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Send, Globe, Users2, Megaphone,
  TrendingUp, Newspaper, Loader2, MoreHorizontal, Trash2,
  Sparkles, Flame, Zap, Image as ImageIcon, Hash, Pin, PinOff,
  Bell, BellOff, Plus, AtSign
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

const POST_TYPES = [
  { value: "update", label: "Update", icon: Globe, color: "text-primary" },
  { value: "promotion", label: "Promotion", icon: Megaphone, color: "text-amber-500" },
  { value: "rate_alert", label: "Rate Alert", icon: TrendingUp, color: "text-emerald-500" },
  { value: "article", label: "Article", icon: Newspaper, color: "text-violet-500" },
];

const TRENDING_TOPICS = [
  { tag: "OceanRates", count: 24 },
  { tag: "SupplyChain2026", count: 18 },
  { tag: "GreenLogistics", count: 15 },
  { tag: "PortCongestion", count: 12 },
  { tag: "AirFreight", count: 9 },
];

/* ─── Mention Popover ─── */
function MentionPopover({
  open,
  search,
  anchorRef,
  onSelect,
}: {
  open: boolean;
  search: string;
  anchorRef: React.RefObject<HTMLTextAreaElement>;
  onSelect: (name: string) => void;
}) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["mention-users", search],
    queryFn: async () => {
      const query = supabase
        .from("profiles")
        .select("user_id, full_name, company_name, avatar_url")
        .limit(8);
      if (search) {
        query.ilike("full_name", `%${search}%`);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: open,
  });

  if (!open) return null;

  return (
    <div className="absolute left-0 bottom-full mb-1 z-50 w-72 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
        <Plus className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Tag someone</span>
      </div>
      <ScrollArea className="max-h-48">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
        ) : (
          users.map((u: any) => (
            <button
              key={u.user_id}
              onClick={() => onSelect(u.full_name || "User")}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/10 transition-colors text-left"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={u.avatar_url || ""} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {(u.full_name || "U")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{u.full_name || "User"}</p>
                {u.company_name && (
                  <p className="text-[10px] text-muted-foreground truncate">{u.company_name}</p>
                )}
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}

/* ─── Hero Banner ─── */
function SparkHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.85)] to-[hsl(220,80%,25%)]"
    >
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5 blur-sm" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 blur-sm" />
      <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-white/[0.03]" />

      <div className="relative z-10 px-8 py-10 md:py-12">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/20 text-xs font-medium">
            <Flame className="h-3 w-3 mr-1" /> Live Feed
          </Badge>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
          Spark
        </h1>
        <p className="text-white/70 text-sm md:text-base max-w-lg leading-relaxed">
          Connect with logistics professionals, share market insights, promote your services,
          and stay ahead of industry trends — all in one place.
        </p>
        <div className="flex items-center gap-4 mt-6">
          <div className="flex -space-x-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded-full border-2 border-[hsl(var(--primary))] bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <span className="text-[10px] font-bold text-white">{["JD", "AK", "MR", "SL"][i]}</span>
              </div>
            ))}
          </div>
          <span className="text-white/60 text-xs">
            <span className="text-white font-semibold">128+</span> professionals in your network
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Trending Sidebar Widget ─── */
function TrendingSidebar() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-foreground">Trending Topics</h3>
          </div>
          <div className="space-y-3">
            {TRENDING_TOPICS.map((topic, i) => (
              <motion.div
                key={topic.tag}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors font-medium">
                    {topic.tag}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted/60">
                  {topic.count}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm mt-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Quick Stats</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Posts Today", value: "34" },
              { label: "Active Users", value: "89" },
              { label: "Rate Alerts", value: "12" },
              { label: "Promotions", value: "7" },
            ].map((stat) => (
              <div key={stat.label} className="bg-muted/40 rounded-lg px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-foreground tabular-nums">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Render Content with +mentions ─── */
function RichContent({ content }: { content: string }) {
  // Parse +Name mentions and render them as highlighted
  const parts = content.split(/(\+[A-Za-z\s]+(?=\s|$|[.,!?]))/g);
  return (
    <p className="text-sm text-foreground whitespace-pre-wrap mb-4 leading-relaxed pl-14">
      {parts.map((part, i) =>
        part.startsWith("+") ? (
          <span key={i} className="inline-flex items-center gap-0.5 text-primary font-semibold bg-primary/5 rounded px-1 py-0.5 text-[13px]">
            <AtSign className="h-3 w-3 inline" />
            {part.slice(1).trim()}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

/* ─── Media Gallery ─── */
function MediaGallery({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className={`grid gap-2 mb-3 ml-14 ${urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {urls.map((url, i) => (
        <div key={i} className="relative rounded-xl overflow-hidden bg-muted/30 border border-border/30">
          <img
            src={url}
            alt={`Post media ${i + 1}`}
            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

/* ─── Post Composer ─── */
function PostComposer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("update");
  const [isFocused, setIsFocused] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["spark-profile", user?.id],
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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    // Detect "+" trigger for mentions
    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const lastPlus = textBefore.lastIndexOf("+");
    if (lastPlus >= 0) {
      const afterPlus = textBefore.slice(lastPlus + 1);
      if (!afterPlus.includes(" ") || afterPlus.split(" ").length <= 2) {
        setMentionOpen(true);
        setMentionSearch(afterPlus);
        return;
      }
    }
    setMentionOpen(false);
  };

  const handleMentionSelect = (name: string) => {
    const cursorPos = textareaRef.current?.selectionStart || content.length;
    const textBefore = content.slice(0, cursorPos);
    const lastPlus = textBefore.lastIndexOf("+");
    const newContent = content.slice(0, lastPlus) + "+" + name + " " + content.slice(cursorPos);
    setContent(newContent);
    setMentionOpen(false);
    textareaRef.current?.focus();
  };

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
      setIsFocused(false);
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast({ title: "Post published!" });
    },
    onError: () => toast({ title: "Failed to post", variant: "destructive" }),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`mb-6 transition-all duration-300 ${isFocused ? "ring-2 ring-primary/20 shadow-lg shadow-primary/5" : "shadow-sm"}`}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 ring-2 ring-primary/10">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                {(profile?.full_name || "U")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Share an update, rate insight, or promote a service… Use + to tag someone"
                value={content}
                onChange={handleContentChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => { if (!content) setIsFocused(false); }}
                className="min-h-[80px] resize-none border-0 bg-muted/40 focus-visible:ring-0 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/50"
              />
              <MentionPopover
                open={mentionOpen}
                search={mentionSearch}
                anchorRef={textareaRef}
                onSelect={handleMentionSelect}
              />
            </div>
          </div>
          <AnimatePresence>
            {(isFocused || content) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  <Select value={postType} onValueChange={setPostType}>
                    <SelectTrigger className="w-[150px] h-9 text-xs border-border/50 bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POST_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="flex items-center gap-2">
                            <t.icon className={`h-3.5 w-3.5 ${t.color}`} />
                            {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" title="Add image">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-primary"
                    title="Tag someone (+)"
                    onClick={() => {
                      setContent(content + "+");
                      setMentionOpen(true);
                      setMentionSearch("");
                      textareaRef.current?.focus();
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" title="Add hashtag">
                    <Hash className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  disabled={!content.trim() || createPost.isPending}
                  onClick={() => createPost.mutate()}
                  className="rounded-full px-5 gap-2 shadow-md shadow-primary/20"
                >
                  {createPost.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Publish
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Post Card ─── */
function PostCard({ post, currentUserId, index, isAdmin }: { post: any; currentUserId: string; index: number; isAdmin?: boolean }) {
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
    queryKey: ["spark-profile", currentUserId],
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

  const togglePin = useMutation({
    mutationFn: async () => {
      await supabase
        .from("feed_posts")
        .update({ is_pinned: !post.is_pinned })
        .eq("id", post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast({ title: post.is_pinned ? "Post unpinned" : "Post pinned" });
    },
  });

  const typeInfo = POST_TYPES.find((t) => t.value === post.post_type) || POST_TYPES[0];
  const TypeIcon = typeInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Card className={`mb-4 hover:shadow-md transition-shadow duration-300 border-border/50 overflow-hidden group ${post.is_pinned ? "ring-1 ring-amber-400/30" : ""}`}>
        {/* Pinned indicator */}
        {post.is_pinned && (
          <div className="flex items-center gap-1.5 px-5 pt-3 pb-0">
            <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Pinned</span>
          </div>
        )}
        {/* Accent top bar by post type */}
        <div className={`h-0.5 w-full ${
          post.post_type === "promotion" ? "bg-amber-500/60" :
          post.post_type === "rate_alert" ? "bg-emerald-500/60" :
          post.post_type === "article" ? "bg-violet-500/60" :
          "bg-primary/40"
        }`} />
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 ring-2 ring-border/50">
                <AvatarImage src={post.author_avatar_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-semibold text-sm">
                  {(post.author_name || "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{post.author_name || "Unknown"}</span>
                  {post.company_name && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted/60 font-normal">
                      {post.company_name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <TypeIcon className={`h-3 w-3 ${typeInfo.color}`} />
                  <span>{typeInfo.label}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
            {(post.user_id === currentUserId || isAdmin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => togglePin.mutate()}>
                      {post.is_pinned ? (
                        <><PinOff className="h-4 w-4 mr-2" /> Unpin</>
                      ) : (
                        <><Pin className="h-4 w-4 mr-2" /> Pin to top</>
                      )}
                    </DropdownMenuItem>
                  )}
                  {post.user_id === currentUserId && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deletePost.mutate()}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Content with mentions */}
          <RichContent content={post.content} />

          {/* Media gallery */}
          <MediaGallery urls={post.media_urls || []} />

          {/* Original post reference */}
          {post.original_post_id && (
            <div className="border rounded-xl p-3 mb-3 ml-14 bg-muted/20 border-border/40">
              <p className="text-xs text-muted-foreground italic">Shared post</p>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 ml-14 mb-3">
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-[10px] bg-primary/5 text-primary border-primary/10 cursor-pointer hover:bg-primary/10">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1 border-t border-border/40 pt-3 ml-14">
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs gap-1.5 rounded-full px-4 transition-all ${hasLiked ? "text-red-500 bg-red-500/5 hover:bg-red-500/10" : "text-muted-foreground hover:text-red-500"}`}
              onClick={() => toggleLike.mutate()}
            >
              <Heart className={`h-4 w-4 transition-all ${hasLiked ? "fill-red-500 scale-110" : ""}`} />
              {likeCount > 0 ? likeCount : "Like"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-muted-foreground hover:text-primary rounded-full px-4"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="h-4 w-4" />
              Comment
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-muted-foreground hover:text-primary rounded-full px-4"
              onClick={() => sharePost.mutate()}
              disabled={sharePost.isPending}
            >
              <Share2 className="h-4 w-4" />
              {post.share_count > 0 ? post.share_count : "Share"}
            </Button>
          </div>

          {/* Comments section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 border-t border-border/40 pt-3 ml-14 space-y-3 overflow-hidden"
              >
                {comments.map((c: any) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={c.author_avatar_url || ""} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {(c.author_name || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted/40 rounded-2xl px-3.5 py-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{c.author_name}</span>
                        {c.company_name && (
                          <span className="text-[10px] text-muted-foreground">· {c.company_name}</span>
                        )}
                      </div>
                      <RichContent content={c.content} />
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Textarea
                    placeholder="Write a comment… use + to tag"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[36px] h-9 text-xs resize-none py-2 rounded-full border-border/50 bg-muted/30"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 rounded-full hover:bg-primary/10 hover:text-primary"
                    disabled={!commentText.trim() || addComment.isPending}
                    onClick={() => addComment.mutate()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Empty State ─── */
function EmptyFeed({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      <Card className="border-dashed border-2 border-border/40">
        <CardContent className="py-16 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-foreground/70 mb-1">{title}</p>
          <p className="text-xs text-muted-foreground/60">{subtitle}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Main Page ─── */
const Spark = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");

  // Check if user has admin role for pinning
  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles-spark", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });
  const isAdmin = userRoles.some((r: any) => r.role === "admin");

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

  // Real-time subscription for new posts
  useEffect(() => {
    const channel = supabase
      .channel("spark-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feed_posts" },
        (payload) => {
          const newPost = payload.new as any;
          if (newPost.user_id !== user?.id) {
            toast({
              title: "New post on Spark",
              description: `${newPost.author_name || "Someone"} shared a ${newPost.post_type || "post"}`,
            });
          }
          queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <SparkHero />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Main feed column */}
          <div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-5 bg-muted/50 p-1 rounded-full">
                <TabsTrigger value="all" className="gap-1.5 rounded-full text-xs px-5 data-[state=active]:shadow-sm">
                  <Globe className="h-3.5 w-3.5" /> All Posts
                </TabsTrigger>
                <TabsTrigger value="network" className="gap-1.5 rounded-full text-xs px-5 data-[state=active]:shadow-sm">
                  <Users2 className="h-3.5 w-3.5" /> My Network
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <PostComposer />
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-primary/40" />
                    <p className="text-xs text-muted-foreground">Loading feed…</p>
                  </div>
                ) : posts.length === 0 ? (
                  <EmptyFeed
                    icon={Sparkles}
                    title="No sparks yet"
                    subtitle="Be the first to share an update with the network!"
                  />
                ) : (
                  posts.map((post: any, i: number) => (
                    <PostCard key={post.id} post={post} currentUserId={user!.id} index={i} isAdmin={isAdmin} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="network">
                <PostComposer />
                <EmptyFeed
                  icon={Users2}
                  title="Your network feed is empty"
                  subtitle="Complete shipments with partners to grow your network and see their posts here."
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar column */}
          <div className="hidden lg:block">
            <TrendingSidebar />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Spark;
