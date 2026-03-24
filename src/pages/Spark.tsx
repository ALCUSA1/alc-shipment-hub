import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Send, Globe, Users2, Megaphone,
  TrendingUp, Newspaper, Loader2, MoreHorizontal, Trash2,
  Sparkles, Flame, Zap, Image as ImageIcon, Hash, Pin, PinOff,
  Plus, AtSign, ExternalLink, MapPin, Building2, Briefcase,
  Search, ArrowLeft, Edit3, Globe2, Phone, Mail, Handshake,
  ShoppingCart, Star, Calendar, Check, X, Clock, Award, Video,
  Mic, ChevronRight, DollarSign, Ship, Package, MapPinned,
  Bookmark, ThumbsUp, PartyPopper, Rocket, UserCheck
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { RecommendedForYou } from "@/components/smart/RecommendedForYou";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const POST_TYPES = [
  { value: "update", label: "General Post", icon: Globe, color: "text-primary" },
  { value: "shipment_update", label: "Shipment Update", icon: Ship, color: "text-sky-500" },
  { value: "capacity_available", label: "Capacity Available", icon: Package, color: "text-emerald-500" },
  { value: "shipment_request", label: "Shipment Request", icon: MapPinned, color: "text-orange-500" },
  { value: "collaboration", label: "Collaboration Request", icon: Handshake, color: "text-violet-500" },
  { value: "promotion", label: "Promotion", icon: Megaphone, color: "text-amber-500" },
  { value: "rate_alert", label: "Rate Alert", icon: TrendingUp, color: "text-emerald-500" },
];


const REACTION_TYPES = [
  { type: "like", emoji: "❤️", icon: Heart, label: "Like" },
  { type: "fire", emoji: "🔥", icon: Flame, label: "Fire" },
  { type: "insightful", emoji: "⚡", icon: Zap, label: "Insightful" },
  { type: "congrats", emoji: "👏", icon: PartyPopper, label: "Congrats" },
];

/* ─── Welcome Banner ─── */
function WelcomeBanner({ onAction }: { onAction: (tab: string) => void }) {
  const { data: stats } = useQuery({
    queryKey: ["spark-stats"],
    queryFn: async () => {
      const [companies, rfqs, events] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("rfq_posts").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return { companies: companies.count || 0, rfqs: rfqs.count || 0 };
    },
    staleTime: 60_000,
  });

  const statItems = [
    { label: "Companies", value: stats?.companies || 0, icon: Building2 },
    { label: "Active RFQs", value: stats?.rfqs || 0, icon: ShoppingCart },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl mb-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80" />
      <div className="absolute inset-0">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/[0.06] blur-2xl" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-white/[0.04] blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 bg-white/[0.03] rounded-full blur-3xl rotate-12" />
      </div>

      <div className="relative z-10 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-bold text-white/60 uppercase tracking-[0.2em]">Spark Network</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Connect. Share. Grow.</h2>
            <p className="text-sm text-white/60 mt-1.5 max-w-md">Your logistics community hub — post updates, browse RFQs, and find partners.</p>
          </div>

          {/* Stat pills */}
          <div className="flex items-center gap-3">
            {statItems.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-center min-w-[90px]">
                <s.icon className="h-4 w-4 text-white/50 mx-auto mb-1" />
                <p className="text-xl font-extrabold text-white tabular-nums">{s.value}</p>
                <p className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 mt-6">
          <Button size="sm" className="rounded-full px-6 gap-2 bg-white text-primary hover:bg-white/90 shadow-lg shadow-black/10 font-semibold"
            onClick={() => onAction("rfqs")}>
            <ShoppingCart className="h-3.5 w-3.5" /> Browse RFQs
          </Button>
          <Button size="sm" className="rounded-full px-6 gap-2 bg-white/15 text-white border border-white/20 hover:bg-white/25 backdrop-blur-sm font-semibold"
            onClick={() => onAction("directory")}>
            <Users2 className="h-3.5 w-3.5" /> Find Partners
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Trending Sidebar ─── */
function TrendingSidebar() {
  const { data: latestRfqs = [] } = useQuery({
    queryKey: ["spark-trending-rfqs"],
    queryFn: async () => {
      const { data } = await supabase.from("rfq_posts").select("id, title, origin, destination, created_at")
        .eq("status", "open").order("created_at", { ascending: false }).limit(3);
      return data || [];
    },
    staleTime: 30_000,
  });


  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gradient-to-r from-primary/8 to-accent/5 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Trending</h3>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          {latestRfqs.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Latest RFQs</p>
              <div className="space-y-1.5">
                {latestRfqs.map((rfq: any) => (
                  <div key={rfq.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-xs">
                    <Package className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                    <span className="text-foreground font-medium truncate">
                      {rfq.origin && rfq.destination ? `${rfq.origin} → ${rfq.destination}` : rfq.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {latestRfqs.length === 0 && (
            <p className="text-xs text-muted-foreground/50 italic text-center py-3">No trending activity yet</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Profile Completeness ─── */
function ProfileCompleteness({ profile, company }: { profile: CompanyProfile; company: CompanyData | null }) {
  const navigate = useNavigate();
  const checks = [
    { label: "Avatar", done: !!profile.avatar_url },
    { label: "Tagline", done: !!profile.tagline },
    { label: "About", done: !!profile.about },
    { label: "Services", done: !!(profile.services && profile.services.length > 0) },
    { label: "Cover photo", done: !!profile.cover_url },
  ];
  const completed = checks.filter((c) => c.done).length;
  const pct = Math.round((completed / checks.length) * 100);

  if (pct === 100) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      <Card className="border-border/50 shadow-sm border-l-4 border-l-primary">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Profile strength
            </h3>
            <span className="text-xs font-bold text-primary">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2 mb-3" />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {checks.map((c) => (
              <Badge key={c.label} variant="secondary"
                className={`text-[10px] ${c.done ? "bg-emerald-500/10 text-emerald-600 line-through opacity-60" : "bg-muted text-muted-foreground"}`}>
                {c.done && <Check className="h-2.5 w-2.5 mr-0.5" />}{c.label}
              </Badge>
            ))}
          </div>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 rounded-full w-full" onClick={() => navigate("/dashboard/account")}>
            <Edit3 className="h-3 w-3" /> Complete Profile
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Types ─── */
interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  tagline: string | null;
  cover_url: string | null;
  about: string | null;
  services: string[] | null;
  portfolio_urls: string[] | null;
  social_links: Record<string, string> | null;
}

interface CompanyData {
  id: string;
  company_name: string;
  company_type: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  service_area: string | null;
  port_coverage: string[] | null;
  user_id: string;
}

/* ─── Mention Popover ─── */
function MentionPopover({ open, search, onSelect }: { open: boolean; search: string; onSelect: (name: string) => void }) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["mention-users", search],
    queryFn: async () => {
      const query = supabase.from("profiles").select("user_id, full_name, company_name, avatar_url").limit(8);
      if (search) query.ilike("full_name", `%${search}%`);
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
          <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : users.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
        ) : (
          users.map((u: any) => (
            <button key={u.user_id} onClick={() => onSelect(u.full_name || "User")}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/10 transition-colors text-left">
              <Avatar className="h-7 w-7">
                <AvatarImage src={u.avatar_url || ""} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{(u.full_name || "U")[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{u.full_name || "User"}</p>
                {u.company_name && <p className="text-[10px] text-muted-foreground truncate">{u.company_name}</p>}
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}

/* ─── Rich Content with +mentions ─── */
function RichContent({ content, className = "" }: { content: string; className?: string }) {
  const parts = content.split(/(\+[A-Za-z\s]+(?=\s|$|[.,!?]))/g);
  return (
    <p className={`text-sm text-foreground whitespace-pre-wrap leading-relaxed ${className}`}>
      {parts.map((part, i) =>
        part.startsWith("+") ? (
          <span key={i} className="inline-flex items-center gap-0.5 text-primary font-semibold bg-primary/5 rounded px-1 py-0.5 text-[13px]">
            <AtSign className="h-3 w-3 inline" />{part.slice(1).trim()}
          </span>
        ) : (<span key={i}>{part}</span>)
      )}
    </p>
  );
}

/* ─── Star Rating ─── */
function StarRating({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange?.(star)}
          className={`${onChange ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}>
          <Star className={`${sz} ${star <= value ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

/* ─── Company Brand Hero (with Partnership) ─── */
function BrandHero({ profile, company, isOwner, ownCompanyId, onEdit }: {
  profile: CompanyProfile; company: CompanyData | null; isOwner: boolean; ownCompanyId: string | null; onEdit?: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = [company?.city, company?.state, company?.country].filter(Boolean).join(", ");

  // Partnership status
  const { data: partnershipStatus } = useQuery({
    queryKey: ["partnership-status", ownCompanyId, company?.id],
    queryFn: async () => {
      if (!ownCompanyId || !company?.id || ownCompanyId === company.id) return null;
      const { data } = await supabase.from("partnership_requests").select("*")
        .or(`and(requester_company_id.eq.${ownCompanyId},target_company_id.eq.${company.id}),and(requester_company_id.eq.${company.id},target_company_id.eq.${ownCompanyId})`)
        .maybeSingle();
      return data;
    },
    enabled: !isOwner && !!ownCompanyId && !!company?.id,
  });

  const sendRequest = useMutation({
    mutationFn: async () => {
      await supabase.from("partnership_requests").insert({
        requester_company_id: ownCompanyId!,
        target_company_id: company!.id,
        requester_user_id: user!.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnership-status"] });
      toast({ title: "Partnership request sent!" });
    },
    onError: () => toast({ title: "Failed to send request", variant: "destructive" }),
  });

  const respondRequest = useMutation({
    mutationFn: async (accept: boolean) => {
      await supabase.from("partnership_requests")
        .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
        .eq("id", partnershipStatus?.id);
    },
    onSuccess: (_, accept) => {
      queryClient.invalidateQueries({ queryKey: ["partnership-status"] });
      queryClient.invalidateQueries({ queryKey: ["partner-count"] });
      toast({ title: accept ? "Partnership accepted!" : "Request declined" });
    },
  });

  const getConnectButton = () => {
    if (isOwner || !ownCompanyId) return null;
    if (!partnershipStatus) {
      return (
        <Button size="sm" className="rounded-full px-5 gap-1.5 shadow-sm" onClick={() => sendRequest.mutate()}
          disabled={sendRequest.isPending}>
          {sendRequest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="h-3.5 w-3.5" />} Connect
        </Button>
      );
    }
    if (partnershipStatus.status === "accepted") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1"><Check className="h-3 w-3 mr-1" /> Partner</Badge>;
    }
    if (partnershipStatus.status === "pending") {
      // If I'm the target, show accept/decline
      if (partnershipStatus.target_company_id === ownCompanyId) {
        return (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-full px-3 gap-1 text-xs" onClick={() => respondRequest.mutate(false)}>
              <X className="h-3 w-3" /> Decline
            </Button>
            <Button size="sm" className="rounded-full px-3 gap-1 text-xs" onClick={() => respondRequest.mutate(true)}>
              <Check className="h-3 w-3" /> Accept
            </Button>
          </div>
        );
      }
      return <Badge variant="secondary" className="px-3 py-1 text-xs"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="relative h-48 md:h-56 rounded-t-2xl overflow-hidden bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.8)] to-[hsl(220,80%,20%)]">
        {profile.cover_url && <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {!profile.cover_url && (
          <>
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5 blur-sm" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 blur-sm" />
          </>
        )}
        {isOwner && (
          <Button size="sm" variant="secondary" className="absolute top-4 right-4 gap-1.5 text-xs bg-white/20 backdrop-blur-sm border-white/10 text-white hover:bg-white/30"
            onClick={onEdit}>
            <Edit3 className="h-3 w-3" /> Edit Profile
          </Button>
        )}
      </div>

      <Card className="rounded-t-none border-t-0 border-border/50">
        <CardContent className="px-6 pb-6 pt-0">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 relative z-10">
            <div className="h-24 w-24 rounded-2xl border-4 border-background bg-card shadow-xl overflow-hidden shrink-0 flex items-center justify-center">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-primary/40" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">{profile.company_name || "My Company"}</h1>
                  {profile.tagline && <p className="text-sm text-muted-foreground mt-0.5">{profile.tagline}</p>}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {company?.company_type && (
                      <Badge variant="secondary" className="text-[10px] bg-primary/5 text-primary border-primary/10">
                        <Briefcase className="h-3 w-3 mr-1" />{company.company_type}
                      </Badge>
                    )}
                    {company?.industry && <Badge variant="secondary" className="text-[10px] bg-muted/60">{company.industry}</Badge>}
                    {location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {location}</span>}
                  </div>
                </div>
                {getConnectButton()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            {company?.website && (
              <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <Globe2 className="h-3 w-3" /> {company.website}
              </a>
            )}
            {company?.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {company.phone}</span>}
            {company?.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {company.email}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── About Section ─── */
function AboutSection({ profile, company }: { profile: CompanyProfile; company: CompanyData | null }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-3">About</h3>
          {profile.about ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.about}</p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">No description yet.</p>
          )}
          {profile.services && profile.services.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2">Services</h4>
              <div className="flex flex-wrap gap-2">
                {profile.services.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs bg-primary/5 text-primary border-primary/10 px-3 py-1">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {company?.port_coverage && company.port_coverage.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2">Port Coverage</h4>
              <div className="flex flex-wrap gap-2">
                {company.port_coverage.map((p) => <Badge key={p} variant="outline" className="text-xs px-3 py-1">{p}</Badge>)}
              </div>
            </div>
          )}
          {company?.service_area && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1">Service Area</h4>
              <p className="text-sm text-muted-foreground">{company.service_area}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Partners Card (sidebar) ─── */
function PartnersCard({ companyId }: { companyId: string }) {
  const { data: partners = [] } = useQuery({
    queryKey: ["partner-count", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("partnership_requests").select("requester_company_id, target_company_id")
        .eq("status", "accepted")
        .or(`requester_company_id.eq.${companyId},target_company_id.eq.${companyId}`);
      return data || [];
    },
    enabled: !!companyId,
  });

  if (partners.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Handshake className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Partners</h3>
            <Badge variant="secondary" className="text-[10px] ml-auto">{partners.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{partners.length} verified partner{partners.length !== 1 ? "s" : ""} in the network</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Reviews Card (sidebar) ─── */
function ReviewsCard({ companyId, onWriteReview }: { companyId: string; onWriteReview?: () => void }) {
  const { data: reviews = [] } = useQuery({
    queryKey: ["company-reviews", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("company_reviews").select("*")
        .eq("reviewed_company_id", companyId).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!companyId,
  });

  const avg = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Reviews</h3>
            {onWriteReview && <Button size="sm" variant="ghost" className="text-xs gap-1 h-7" onClick={onWriteReview}><Edit3 className="h-3 w-3" /> Write</Button>}
          </div>
          {reviews.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <StarRating value={Math.round(avg)} size="sm" />
                <span className="text-sm font-semibold text-foreground">{avg.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({reviews.length})</span>
              </div>
              <div className="space-y-3">
                {reviews.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="border-t border-border/30 pt-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating value={r.rating} size="sm" />
                      {r.transaction_type && <Badge variant="secondary" className="text-[9px]">{r.transaction_type}</Badge>}
                    </div>
                    {r.title && <p className="text-xs font-medium text-foreground">{r.title}</p>}
                    {r.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.content}</p>}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">No reviews yet</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Write Review Dialog ─── */
function WriteReviewDialog({ open, onOpenChange, targetCompanyId, targetCompanyName }: {
  open: boolean; onOpenChange: (o: boolean) => void; targetCompanyId: string; targetCompanyName: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [txnType, setTxnType] = useState("shipment");

  const { data: ownCompany } = useQuery({
    queryKey: ["spark-own-company-review", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  const submit = useMutation({
    mutationFn: async () => {
      await supabase.from("company_reviews").insert({
        reviewer_user_id: user!.id,
        reviewer_company_id: ownCompany?.id || null,
        reviewed_company_id: targetCompanyId,
        rating, title: title.trim() || null, content: content.trim() || null,
        transaction_type: txnType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-reviews", targetCompanyId] });
      toast({ title: "Review submitted!" });
      onOpenChange(false);
      setRating(5); setTitle(""); setContent("");
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review {targetCompanyName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs mb-1.5 block">Rating</Label>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Transaction type</Label>
            <Select value={txnType} onValueChange={setTxnType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shipment">Shipment</SelectItem>
                <SelectItem value="trucking">Trucking</SelectItem>
                <SelectItem value="warehousing">Warehousing</SelectItem>
                <SelectItem value="customs">Customs</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief summary…" className="h-9" maxLength={100} />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Review</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share your experience…" className="min-h-[80px]" maxLength={1000} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="gap-1.5">
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />} Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Portfolio / Gallery ─── */
function PortfolioSection({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-3">Portfolio</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {urls.map((url, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-muted/30 border border-border/30 aspect-video">
                <img src={url} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Team Members ─── */
function TeamSection({ userId }: { userId: string }) {
  const { data: team = [] } = useQuery({
    queryKey: ["spark-team", userId],
    queryFn: async () => {
      const { data: ownerProfile } = await supabase.from("profiles").select("company_name").eq("user_id", userId).maybeSingle();
      if (!ownerProfile?.company_name) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url, role").eq("company_name", ownerProfile.company_name).limit(12);
      return data || [];
    },
  });

  if (team.length <= 1) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-3">Team ({team.length})</h3>
          <div className="grid grid-cols-2 gap-3">
            {team.map((m: any) => (
              <div key={m.user_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.avatar_url || ""} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{(m.full_name || "U")[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.full_name || "Team Member"}</p>
                  {m.role && <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Post Composer ─── */
function PostComposer({ profile }: { profile: CompanyProfile | null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("update");
  const [isFocused, setIsFocused] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
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
        user_id: user!.id, content, post_type: postType,
        author_name: profile?.full_name || user!.email?.split("@")[0],
        author_avatar_url: profile?.avatar_url, company_name: profile?.company_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent(""); setIsFocused(false);
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      toast({ title: "Post published!" });
    },
    onError: () => toast({ title: "Failed to post", variant: "destructive" }),
  });

  return (
    <Card className={`mb-4 border-border/50 transition-all duration-300 ${isFocused ? "ring-2 ring-primary/20 shadow-xl shadow-primary/5" : "shadow-sm"}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-primary/10">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">{(profile?.full_name || "U")[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Textarea ref={textareaRef} placeholder="Share an update, insight, or promote a service… Use + to tag"
              value={content} onChange={handleContentChange} onFocus={() => setIsFocused(true)}
              onBlur={() => { if (!content) setIsFocused(false); }}
              className="min-h-[72px] resize-none border-0 bg-muted/40 focus-visible:ring-0 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/50" />
            <MentionPopover open={mentionOpen} search={mentionSearch} onSelect={handleMentionSelect} />
          </div>
        </div>
        <AnimatePresence>
          {(isFocused || content) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between overflow-hidden">
              <div className="flex items-center gap-2">
                <Select value={postType} onValueChange={setPostType}>
                  <SelectTrigger className="w-[140px] h-9 text-xs border-border/50 bg-muted/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2"><t.icon className={`h-3.5 w-3.5 ${t.color}`} />{t.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary"><ImageIcon className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary"
                  onClick={() => { setContent(content + "+"); setMentionOpen(true); setMentionSearch(""); textareaRef.current?.focus(); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button size="sm" disabled={!content.trim() || createPost.isPending} onClick={() => createPost.mutate()}
                className={`rounded-full px-5 gap-2 shadow-md shadow-primary/20 transition-all ${content.trim() && !createPost.isPending ? "animate-pulse hover:animate-none" : ""}`}>
                {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Publish
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

/* ─── External Share Dialog ─── */
function ExternalShareDialog({ open, onOpenChange, post }: { open: boolean; onOpenChange: (o: boolean) => void; post: any }) {
  const shareUrl = `${window.location.origin}/dashboard/spark`;
  const shareText = post.content?.slice(0, 200) || "Check out this post on Spark";
  const postTypeLabel = POST_TYPES.find((t) => t.value === post.post_type)?.label || "Post";

  const messageBody = `${postTypeLabel}: ${shareText}${post.content?.length > 200 ? "…" : ""}\n\nView on Spark: ${shareUrl}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied to clipboard!" });
    onOpenChange(false);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(messageBody)}`, "_blank");
    onOpenChange(false);
  };

  const shareSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(messageBody)}`, "_blank");
    onOpenChange(false);
  };

  const shareEmail = () => {
    const subject = `Spark: ${postTypeLabel} from ${post.company_name || post.author_name || "ALC Platform"}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageBody)}`, "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Share Externally</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-3">
          <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm" onClick={copyLink}>
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><ExternalLink className="h-4 w-4 text-foreground" /></div>
            Copy Link
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm" onClick={shareWhatsApp}>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Phone className="h-4 w-4 text-emerald-600" /></div>
            Share via WhatsApp
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm" onClick={shareSMS}>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0"><MessageCircle className="h-4 w-4 text-sky-600" /></div>
            Share via SMS
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm" onClick={shareEmail}>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Mail className="h-4 w-4 text-primary" /></div>
            Share via Email
          </Button>
        </div>
        <div className="bg-muted/40 rounded-lg p-3 mt-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Preview</p>
          <p className="text-xs text-foreground line-clamp-3">{messageBody}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Post Card ─── */
function PostCard({ post, currentUserId, index, isAdmin }: { post: any; currentUserId: string; index: number; isAdmin?: boolean }) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [externalShareOpen, setExternalShareOpen] = useState(false);

  const { data: reactions = [] } = useQuery({
    queryKey: ["feed-reactions", post.id],
    queryFn: async () => { const { data } = await supabase.from("feed_reactions").select("*").eq("post_id", post.id); return data || []; },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["feed-comments", post.id],
    queryFn: async () => { const { data } = await supabase.from("feed_comments").select("*").eq("post_id", post.id).order("created_at", { ascending: true }); return data || []; },
    enabled: showComments,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["spark-profile", currentUserId],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("full_name, avatar_url, company_name").eq("user_id", currentUserId).maybeSingle(); return data; },
  });

  const getReactionsByType = (type: string) => reactions.filter((r: any) => r.reaction_type === type);
  const hasReacted = (type: string) => reactions.some((r: any) => r.user_id === currentUserId && r.reaction_type === type);
  const totalReactions = reactions.length;

  const toggleReaction = useMutation({
    mutationFn: async (type: string) => {
      if (hasReacted(type)) {
        await supabase.from("feed_reactions").delete().eq("post_id", post.id).eq("user_id", currentUserId).eq("reaction_type", type);
      } else {
        await supabase.from("feed_reactions").insert({ post_id: post.id, user_id: currentUserId, reaction_type: type });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-reactions", post.id] }),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("feed_comments").insert({
        post_id: post.id, user_id: currentUserId, content: commentText,
        author_name: myProfile?.full_name || "User", author_avatar_url: myProfile?.avatar_url, company_name: myProfile?.company_name,
      });
      if (error) throw error;
    },
    onSuccess: () => { setCommentText(""); queryClient.invalidateQueries({ queryKey: ["feed-comments", post.id] }); },
  });

  const sharePost = useMutation({
    mutationFn: async () => {
      await supabase.from("feed_posts").insert({
        user_id: currentUserId, content: `Shared: "${post.content.slice(0, 120)}${post.content.length > 120 ? "..." : ""}"`,
        post_type: "update", original_post_id: post.id, author_name: myProfile?.full_name || "User",
        author_avatar_url: myProfile?.avatar_url, company_name: myProfile?.company_name,
      });
      await supabase.from("feed_posts").update({ share_count: (post.share_count || 0) + 1 }).eq("id", post.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); toast({ title: "Post shared!" }); },
  });

  const deletePost = useMutation({
    mutationFn: async () => { await supabase.from("feed_posts").delete().eq("id", post.id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); toast({ title: "Post deleted" }); },
  });

  const togglePin = useMutation({
    mutationFn: async () => { await supabase.from("feed_posts").update({ is_pinned: !post.is_pinned }).eq("id", post.id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); toast({ title: post.is_pinned ? "Unpinned" : "Pinned" }); },
  });

  const typeInfo = POST_TYPES.find((t) => t.value === post.post_type) || POST_TYPES[0];
  const TypeIcon = typeInfo.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.04 }}>
      <Card className={`mb-3 hover:shadow-md transition-shadow border-border/50 overflow-hidden group ${post.is_pinned ? "ring-1 ring-amber-400/30" : ""}`}>
        {post.is_pinned && (
          <div className="flex items-center gap-1.5 px-5 pt-2.5 pb-0">
            <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Pinned</span>
          </div>
        )}
        <div className={`h-0.5 w-full ${post.post_type === "promotion" ? "bg-amber-500/60" : post.post_type === "rate_alert" ? "bg-emerald-500/60" : post.post_type === "article" ? "bg-violet-500/60" : "bg-primary/40"}`} />
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-border/50">
                <AvatarImage src={post.author_avatar_url || ""} />
                <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-semibold text-sm">{(post.author_name || "?")[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{post.author_name || "Unknown"}</span>
                  {post.company_name && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted/60 font-normal">{post.company_name}</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <TypeIcon className={`h-3 w-3 ${typeInfo.color}`} /><span>{typeInfo.label}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
            {(post.user_id === currentUserId || isAdmin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && <DropdownMenuItem onClick={() => togglePin.mutate()}>{post.is_pinned ? <><PinOff className="h-4 w-4 mr-2" /> Unpin</> : <><Pin className="h-4 w-4 mr-2" /> Pin</>}</DropdownMenuItem>}
                  {post.user_id === currentUserId && <DropdownMenuItem className="text-destructive" onClick={() => deletePost.mutate()}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <RichContent content={post.content} className="pl-[52px] mb-3" />
          {post.media_urls && post.media_urls.length > 0 && (
            <div className={`grid gap-2 mb-3 ml-[52px] ${post.media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {post.media_urls.map((url: string, i: number) => (
                <div key={i} className="rounded-xl overflow-hidden bg-muted/30 border border-border/30">
                  <img src={url} alt="" className="w-full h-40 object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
              ))}
            </div>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 ml-[52px] mb-3">
              {post.tags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-[10px] bg-primary/5 text-primary border-primary/10">#{tag}</Badge>)}
            </div>
          )}
          <div className="flex items-center gap-1 border-t border-border/40 pt-2.5 ml-[52px] flex-wrap">
            {/* Emoji reaction summary */}
            {totalReactions > 0 && (
              <div className="flex items-center gap-1 mr-2 mb-1">
                {REACTION_TYPES.filter((rt) => getReactionsByType(rt.type).length > 0).map((rt) => (
                  <span key={rt.type} className="text-xs flex items-center gap-0.5 bg-muted/50 rounded-full px-1.5 py-0.5">
                    {rt.emoji} <span className="text-muted-foreground">{getReactionsByType(rt.type).length}</span>
                  </span>
                ))}
              </div>
            )}
            {/* Reaction buttons */}
            {REACTION_TYPES.map((rt) => {
              const active = hasReacted(rt.type);
              return (
                <Button key={rt.type} variant="ghost" size="sm"
                  className={`text-xs gap-1 rounded-full px-2.5 h-8 ${active ? "bg-primary/5 text-primary" : "text-muted-foreground hover:text-primary"}`}
                  onClick={() => toggleReaction.mutate(rt.type)} disabled={toggleReaction.isPending}
                  title={rt.label}>
                  <span className="text-sm">{rt.emoji}</span>
                </Button>
              );
            })}
            <Separator orientation="vertical" className="h-5 mx-1" />
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-primary rounded-full px-3 h-8"
              onClick={() => setShowComments(!showComments)}>
              <MessageCircle className="h-3.5 w-3.5" /> Comment
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-primary rounded-full px-3 h-8">
                  <Share2 className="h-3.5 w-3.5" />{post.share_count > 0 ? post.share_count : "Share"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => sharePost.mutate()}>
                  <Rocket className="h-4 w-4 mr-2" /> Share on Spark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExternalShareOpen(true)}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Share Externally
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-primary rounded-full px-3 h-8 ml-auto"
              title="Bookmark">
              <Bookmark className="h-3.5 w-3.5" />
            </Button>
          </div>
          <AnimatePresence>
            {showComments && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="mt-3 border-t border-border/40 pt-3 ml-[52px] space-y-3 overflow-hidden">
                {comments.map((c: any) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar className="h-7 w-7"><AvatarImage src={c.author_avatar_url || ""} /><AvatarFallback className="text-[10px] bg-muted">{(c.author_name || "?")[0]}</AvatarFallback></Avatar>
                    <div className="bg-muted/40 rounded-2xl px-3 py-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{c.author_name}</span>
                        {c.company_name && <span className="text-[10px] text-muted-foreground">· {c.company_name}</span>}
                      </div>
                      <RichContent content={c.content} className="text-xs mt-0.5" />
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Textarea placeholder="Write a comment… use + to tag" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[36px] h-9 text-xs resize-none py-2 rounded-full border-border/50 bg-muted/30" />
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-full hover:bg-primary/10 hover:text-primary"
                    disabled={!commentText.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
        <ExternalShareDialog open={externalShareOpen} onOpenChange={setExternalShareOpen} post={post} />
      </Card>
    </motion.div>
  );
}

/* ─── Company Directory ─── */
function CompanyDirectory({ onSelectCompany }: { onSelectCompany: (id: string) => void }) {
  const [search, setSearch] = useState("");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["spark-directory", search],
    queryFn: async () => {
      const query = supabase.from("companies").select("id, company_name, company_type, industry, city, state, country, user_id").order("company_name");
      if (search) query.ilike("company_name", `%${search}%`);
      const { data } = await query.limit(50);
      return data || [];
    },
  });

  const userIds = companies.map((c: any) => c.user_id);
  const { data: logos = [] } = useQuery({
    queryKey: ["spark-dir-logos", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, logo_url, tagline").in("user_id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const logoMap = new Map(logos.map((l: any) => [l.user_id, l]));

  return (
    <div>
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search companies…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10 rounded-xl bg-muted/40 border-border/50" />
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
      ) : companies.length === 0 ? (
        <Card className="border-dashed border-2 border-border/40">
          <CardContent className="py-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No companies found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {companies.map((c: any, i: number) => {
            const profileData = logoMap.get(c.user_id) as any;
            const location = [c.city, c.state, c.country].filter(Boolean).join(", ");
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border-border/50 hover:shadow-md transition-all cursor-pointer group" onClick={() => onSelectCompany(c.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-muted/50 border border-border/30 flex items-center justify-center shrink-0 overflow-hidden">
                        {profileData?.logo_url ? <img src={profileData.logo_url} alt="" className="w-full h-full object-contain p-1.5" /> : <Building2 className="h-5 w-5 text-muted-foreground/40" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{c.company_name}</h4>
                        {profileData?.tagline && <p className="text-xs text-muted-foreground truncate mt-0.5">{profileData.tagline}</p>}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] bg-muted/60 px-1.5 py-0">{c.company_type}</Badge>
                          {location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {location}</span>}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── RFQ Tab ─── */
function MarketplaceTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRfq, setSelectedRfq] = useState<any>(null);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [bidRfqId, setBidRfqId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [containerType, setContainerType] = useState("20ft");
  const [deadline, setDeadline] = useState("");

  // Bid form state
  const [bidAmount, setBidAmount] = useState("");
  const [bidTransit, setBidTransit] = useState("");
  const [bidNotes, setBidNotes] = useState("");

  const { data: ownCompany } = useQuery({
    queryKey: ["spark-own-company-rfq", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, company_name").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: rfqs = [], isLoading } = useQuery({
    queryKey: ["rfq-posts", search],
    queryFn: async () => {
      let query = supabase.from("rfq_posts").select("*").order("created_at", { ascending: false });
      if (search) query = query.or(`title.ilike.%${search}%,origin.ilike.%${search}%,destination.ilike.%${search}%`);
      const { data } = await query.limit(50);
      return data || [];
    },
  });

  const createRfq = useMutation({
    mutationFn: async () => {
      await supabase.from("rfq_posts").insert({
        user_id: user!.id, company_id: ownCompany?.id || null,
        company_name: ownCompany?.company_name || null,
        title: title.trim(), description: description.trim() || null,
        origin: origin.trim() || null, destination: destination.trim() || null,
        cargo_type: cargoType.trim() || null, container_type: containerType,
        deadline: deadline || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-posts"] });
      setShowCreate(false);
      setTitle(""); setDescription(""); setOrigin(""); setDestination(""); setCargoType(""); setDeadline("");
      toast({ title: "RFQ posted!" });
    },
    onError: () => toast({ title: "Failed to post RFQ", variant: "destructive" }),
  });

  const submitBid = useMutation({
    mutationFn: async () => {
      await supabase.from("rfq_bids").insert({
        rfq_id: bidRfqId!, bidder_user_id: user!.id,
        bidder_company_id: ownCompany?.id || null,
        bidder_company_name: ownCompany?.company_name || null,
        amount: parseFloat(bidAmount), transit_days: bidTransit ? parseInt(bidTransit) : null,
        notes: bidNotes.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-bids"] });
      setBidDialogOpen(false);
      setBidAmount(""); setBidTransit(""); setBidNotes("");
      toast({ title: "Bid submitted!" });
    },
    onError: () => toast({ title: "Failed to submit bid", variant: "destructive" }),
  });

  // Get bids for selected RFQ (only if user owns it)
  const { data: bids = [] } = useQuery({
    queryKey: ["rfq-bids", selectedRfq?.id],
    queryFn: async () => {
      const { data } = await supabase.from("rfq_bids").select("*").eq("rfq_id", selectedRfq!.id).order("amount", { ascending: true });
      return data || [];
    },
    enabled: !!selectedRfq,
  });

  const closeRfq = useMutation({
    mutationFn: async (rfqId: string) => {
      await supabase.from("rfq_posts").update({ status: "closed" }).eq("id", rfqId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-posts"] });
      setSelectedRfq(null);
      toast({ title: "RFQ closed" });
    },
  });

  if (selectedRfq) {
    const isMyRfq = selectedRfq.user_id === user?.id;
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={() => setSelectedRfq(null)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to RFQs
        </Button>
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-foreground">{selectedRfq.title}</h3>
                  <Badge className={selectedRfq.status === "open" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}>
                    {selectedRfq.status}
                  </Badge>
                </div>
                {selectedRfq.company_name && <p className="text-sm text-muted-foreground">{selectedRfq.company_name}</p>}
              </div>
              {isMyRfq && selectedRfq.status === "open" && (
                <Button size="sm" variant="outline" onClick={() => closeRfq.mutate(selectedRfq.id)} className="text-xs gap-1">
                  <X className="h-3 w-3" /> Close RFQ
                </Button>
              )}
            </div>
            {selectedRfq.description && <p className="text-sm text-muted-foreground mb-4">{selectedRfq.description}</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {selectedRfq.origin && (
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Origin</p>
                  <p className="text-sm font-medium text-foreground">{selectedRfq.origin}</p>
                </div>
              )}
              {selectedRfq.destination && (
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Destination</p>
                  <p className="text-sm font-medium text-foreground">{selectedRfq.destination}</p>
                </div>
              )}
              {selectedRfq.cargo_type && (
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cargo</p>
                  <p className="text-sm font-medium text-foreground">{selectedRfq.cargo_type}</p>
                </div>
              )}
              {selectedRfq.container_type && (
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Container</p>
                  <p className="text-sm font-medium text-foreground">{selectedRfq.container_type}</p>
                </div>
              )}
            </div>
            {selectedRfq.deadline && (
              <p className="text-xs text-muted-foreground mb-4">
                <Clock className="h-3 w-3 inline mr-1" />Deadline: {format(new Date(selectedRfq.deadline), "MMM d, yyyy")}
              </p>
            )}

            {/* Bids section */}
            {isMyRfq ? (
              <div className="mt-6">
                <h4 className="font-semibold text-foreground mb-3">Bids ({bids.length})</h4>
                {bids.length === 0 ? (
                  <p className="text-sm text-muted-foreground/50 italic">No bids yet</p>
                ) : (
                  <div className="space-y-2">
                    {bids.map((bid: any) => (
                      <Card key={bid.id} className="border-border/40">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{bid.bidder_company_name || "Anonymous"}</p>
                            {bid.notes && <p className="text-xs text-muted-foreground mt-0.5">{bid.notes}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">${Number(bid.amount).toLocaleString()}</p>
                            {bid.transit_days && <p className="text-xs text-muted-foreground">{bid.transit_days} days transit</p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedRfq.status === "open" ? (
              <Button className="mt-4 gap-1.5" onClick={() => { setBidRfqId(selectedRfq.id); setBidDialogOpen(true); }}>
                <DollarSign className="h-4 w-4" /> Submit Bid
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Bid Dialog */}
        <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Submit Bid</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs mb-1.5 block">Amount (USD)</Label>
                <Input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="0.00" className="h-9" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Transit days (optional)</Label>
                <Input type="number" value={bidTransit} onChange={(e) => setBidTransit(e.target.value)} placeholder="e.g. 14" className="h-9" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Notes</Label>
                <Textarea value={bidNotes} onChange={(e) => setBidNotes(e.target.value)} placeholder="Additional details…" className="min-h-[60px]" maxLength={500} />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={!bidAmount || submitBid.isPending} onClick={() => submitBid.mutate()} className="gap-1.5">
                {submitBid.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search RFQs…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-muted/40 border-border/50" />
        </div>
        <Button size="sm" className="gap-1.5 rounded-full px-5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Post RFQ
        </Button>
      </div>

      {/* Create RFQ Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Post a Request for Quote</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1.5 block">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 40ft FCL Los Angeles → Shanghai" className="h-9" maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Origin</Label>
                <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Port / City" className="h-9" maxLength={100} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Destination</Label>
                <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Port / City" className="h-9" maxLength={100} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Cargo type</Label>
                <Input value={cargoType} onChange={(e) => setCargoType(e.target.value)} placeholder="e.g. Electronics" className="h-9" maxLength={100} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Container</Label>
                <Select value={containerType} onValueChange={setContainerType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20ft">20ft</SelectItem>
                    <SelectItem value="40ft">40ft</SelectItem>
                    <SelectItem value="40ft HC">40ft HC</SelectItem>
                    <SelectItem value="LCL">LCL</SelectItem>
                    <SelectItem value="Air">Air</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Deadline</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional requirements…" className="min-h-[60px]" maxLength={1000} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={!title.trim() || createRfq.isPending} onClick={() => createRfq.mutate()} className="gap-1.5">
              {createRfq.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />} Post RFQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RFQ List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
      ) : rfqs.length === 0 ? (
        <Card className="border-dashed border-2 border-border/40">
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No RFQs posted yet. Be the first!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rfqs.map((rfq: any, i: number) => (
            <motion.div key={rfq.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border-border/50 hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedRfq(rfq)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{rfq.title}</h4>
                        <Badge className={rfq.status === "open" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]" : "text-[10px]"}>
                          {rfq.status}
                        </Badge>
                      </div>
                      {rfq.company_name && <p className="text-xs text-muted-foreground">{rfq.company_name}</p>}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {rfq.origin && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPinned className="h-3 w-3" /> {rfq.origin}</span>}
                        {rfq.origin && rfq.destination && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                        {rfq.destination && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPinned className="h-3 w-3" /> {rfq.destination}</span>}
                        {rfq.container_type && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{rfq.container_type}</Badge>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true })}</p>
                      {rfq.deadline && <p className="text-[10px] text-muted-foreground mt-0.5">Due: {format(new Date(rfq.deadline), "MMM d")}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   ─── Main Page ───
   ═══════════════════════════════════════ */
const Spark = () => {
  const { user } = useAuth();
  const { companyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<"page" | "directory" | "rfqs">("page");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const isViewingOther = !!companyId;

  const { data: targetCompany } = useQuery({
    queryKey: ["spark-company", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").eq("id", companyId!).maybeSingle();
      return data as CompanyData | null;
    },
    enabled: !!companyId,
  });

  const { data: ownCompany } = useQuery({
    queryKey: ["spark-own-company", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").eq("user_id", user!.id).maybeSingle();
      return data as CompanyData | null;
    },
    enabled: !!user,
  });

  const viewingUserId = isViewingOther ? targetCompany?.user_id : user?.id;
  const activeCompany = isViewingOther ? targetCompany : ownCompany;
  const isOwner = !isViewingOther;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["spark-full-profile", viewingUserId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", viewingUserId!).maybeSingle();
      return data as CompanyProfile | null;
    },
    enabled: !!viewingUserId,
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles-spark", user?.id],
    queryFn: async () => { const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id); return data || []; },
    enabled: !!user,
  });
  const isAdmin = userRoles.some((r: any) => r.role === "admin");

  const companyName = profile?.company_name;
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["feed-posts", companyName],
    queryFn: async () => {
      let query = supabase.from("feed_posts").select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false }).limit(50);
      if (companyName) query = query.eq("company_name", companyName);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!companyName,
  });

  useEffect(() => {
    const channel = supabase.channel("spark-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_posts" }, (payload) => {
        const newPost = payload.new as any;
        if (newPost.user_id !== user?.id) {
          toast({ title: "New post on Spark", description: `${newPost.author_name || "Someone"} shared a ${newPost.post_type || "post"}` });
        }
        queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "partnership_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["partnership-status"] });
        queryClient.invalidateQueries({ queryKey: ["partner-count"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rfq_posts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["rfq-posts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const handleSelectCompany = (id: string) => {
    navigate(`/dashboard/spark/${id}`);
    setMainTab("page");
  };

  if (profileLoading && (mainTab === "page" || isViewingOther)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary/40" /></div>
      </DashboardLayout>
    );
  }

  const displayProfile: CompanyProfile = profile || {
    id: "", user_id: user?.id || "", company_name: null, full_name: null,
    avatar_url: null, logo_url: null, tagline: null, cover_url: null,
    about: null, services: null, portfolio_urls: null, social_links: null,
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* ── Spark Network Header Banner ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80" />
          <div className="absolute inset-0">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/[0.06] blur-2xl" />
            <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-white/[0.04] blur-2xl" />
          </div>
          <div className="relative z-10 px-6 py-5 md:px-8 md:py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                {isViewingOther && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white hover:bg-white/10" onClick={() => navigate("/dashboard/spark")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Spark Network</h2>
                  <p className="text-xs text-white/50 font-medium">Connect. Share. Grow.</p>
                </div>
              </div>

              {/* Tab pills */}
              {!isViewingOther && (
                <div className="bg-white/10 backdrop-blur-sm p-1 rounded-full border border-white/10 flex items-center gap-0.5">
                  {[
                    { value: "page", label: "My Page", icon: Building2 },
                    { value: "directory", label: "Explore", icon: Search },
                    { value: "rfqs", label: "RFQs", icon: Package },
                  ].map((tab) => (
                    <button key={tab.value}
                      onClick={() => setMainTab(tab.value as any)}
                      className={`flex items-center gap-1.5 rounded-full text-xs font-semibold px-4 py-2 transition-all ${
                        mainTab === tab.value
                          ? "bg-white text-primary shadow-md"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}>
                      <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tab content */}
        {mainTab === "directory" && !isViewingOther ? (
          <CompanyDirectory onSelectCompany={handleSelectCompany} />
        ) : mainTab === "rfqs" && !isViewingOther ? (
          <MarketplaceTab />
        ) : (
          <>
            <BrandHero profile={displayProfile} company={activeCompany ?? null} isOwner={isOwner}
              ownCompanyId={ownCompany?.id || null} onEdit={() => navigate("/dashboard/account")} />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mt-6">
              <div className="space-y-4">
                {isOwner && <PostComposer profile={displayProfile} />}
                {postsLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
                ) : posts.length === 0 ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                    <Card className="border-dashed border-2 border-border/40 bg-gradient-to-br from-primary/[0.02] to-transparent">
                      <CardContent className="py-16 text-center">
                        <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                          <Sparkles className="h-10 w-10 text-primary/30 mx-auto mb-4" />
                        </motion.div>
                        <h3 className="text-base font-semibold text-foreground mb-1">
                          {isOwner ? "Light up your Spark page" : "No posts yet"}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                          {isOwner ? "Share updates, rate alerts, or promote your services to the Spark community." : "This company hasn't posted yet. Check back soon!"}
                        </p>
                        {isOwner && (
                          <Button size="sm" className="mt-5 rounded-full px-6 gap-1.5 shadow-md shadow-primary/20">
                            <Send className="h-3.5 w-3.5" /> Post your first update
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  posts.map((post: any, i: number) => (
                    <PostCard key={post.id} post={post} currentUserId={user!.id} index={i} isAdmin={isAdmin} />
                  ))
                )}
              </div>

              <div className="space-y-4 hidden lg:block">
                {isOwner && <RecommendedForYou variant="spark" maxItems={3} />}
                {isOwner && <ProfileCompleteness profile={displayProfile} company={activeCompany ?? null} />}
                <AboutSection profile={displayProfile} company={activeCompany ?? null} />
                <TrendingSidebar />
                {activeCompany?.id && <PartnersCard companyId={activeCompany.id} />}
                {activeCompany?.id && (
                  <ReviewsCard
                    companyId={activeCompany.id}
                    onWriteReview={!isOwner ? () => setReviewDialogOpen(true) : undefined}
                  />
                )}
                <PortfolioSection urls={displayProfile.portfolio_urls || []} />
                <TeamSection userId={viewingUserId || ""} />
              </div>
            </div>

            {/* Review Dialog */}
            {activeCompany && (
              <WriteReviewDialog
                open={reviewDialogOpen}
                onOpenChange={setReviewDialogOpen}
                targetCompanyId={activeCompany.id}
                targetCompanyName={activeCompany.company_name}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Spark;
