import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { RecommendedForYou } from "@/components/smart/RecommendedForYou";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Package, Ship, Handshake,
  DollarSign, TrendingUp, Clock, Flame, Sparkles, Zap,
  Bookmark, BookmarkCheck, ArrowUpDown, MapPin, Building2,
  Globe, Calendar, ArrowRight, Users, Share2,
} from "lucide-react";

type RfqPost = {
  id: string;
  user_id: string;
  title: string;
  origin: string | null;
  destination: string | null;
  cargo_type: string | null;
  container_type: string | null;
  company_name: string | null;
  deadline: string | null;
  description: string | null;
  status: string;
  created_at: string;
};

const CARGO_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "fcl", label: "FCL" },
  { value: "lcl", label: "LCL" },
  { value: "air", label: "Air" },
  { value: "breakbulk", label: "Breakbulk" },
];

const TIMELINE_OPTIONS = [
  { value: "all", label: "Any Timeline" },
  { value: "urgent", label: "Urgent (< 3 days)" },
  { value: "7days", label: "Within 7 days" },
  { value: "30days", label: "Within 30 days" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "urgency", label: "Most Urgent" },
];

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

const Opportunities = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cargoType, setCargoType] = useState("all");
  const [timeline, setTimeline] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [engageModal, setEngageModal] = useState<RfqPost | null>(null);
  const [showMine, setShowMine] = useState(false);

  const { data: rfqs, isLoading } = useQuery({
    queryKey: ["opportunities-rfqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfq_posts")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RfqPost[];
    },
    enabled: !!user,
  });

  const { data: myRfqIds } = useQuery({
    queryKey: ["my-rfqs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfq_posts")
        .select("id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data || []).map(r => r.id));
    },
    enabled: !!user,
  });

  const { data: savedIds } = useQuery({
    queryKey: ["saved-opps", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_matches")
        .select("source_id")
        .eq("user_id", user!.id)
        .eq("status", "saved")
        .eq("source_type", "rfq");
      if (error) throw error;
      return new Set((data || []).map(r => r.source_id).filter(Boolean));
    },
    enabled: !!user,
  });

  const { data: matchCount } = useQuery({
    queryKey: ["ai-matches-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("ai_matches")
        .select("id", { count: "exact" })
        .eq("user_id", user!.id)
        .eq("status", "active");
      return count || 0;
    },
    enabled: !!user,
  });

  const engageMutation = useMutation({
    mutationFn: async ({ rfq, action }: { rfq: RfqPost; action: string }) => {
      const { error } = await supabase.from("pipeline_deals").insert({
        user_id: user!.id,
        stage: "engaged",
        title: rfq.title,
        company_name: rfq.company_name || "Unknown",
        deal_type: "shipment",
        trade_lane: rfq.origin && rfq.destination ? `${rfq.origin} → ${rfq.destination}` : null,
        origin: rfq.origin,
        destination: rfq.destination,
        volume: rfq.container_type,
        timeline: rfq.deadline,
        estimated_earnings: 150,
        source_type: "rfq",
        source_id: rfq.id,
        notes: `Engaged via Opportunities — Action: ${action}`,
      });
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      toast({ title: "Engaged!", description: `Opportunity added to your Pipeline as "${action}".` });
      setEngageModal(null);
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (rfq: RfqPost) => {
      await supabase.from("ai_matches").insert({
        user_id: user!.id,
        match_type: "shipment",
        title: rfq.title,
        trade_lane: rfq.origin && rfq.destination ? `${rfq.origin} → ${rfq.destination}` : null,
        origin: rfq.origin,
        destination: rfq.destination,
        deal_type: "shipment",
        estimated_earnings: 100,
        match_score: 75,
        reason: "Saved from Opportunities page",
        source_type: "rfq",
        source_id: rfq.id,
        status: "saved",
      });
    },
    onSuccess: () => {
      toast({ title: "Saved!" });
      queryClient.invalidateQueries({ queryKey: ["saved-opps"] });
    },
  });

  const filtered = useMemo(() => {
    if (!rfqs) return [];
    let list = [...rfqs];

    if (showMine && myRfqIds) list = list.filter(r => myRfqIds.has(r.id));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.origin?.toLowerCase().includes(q) ||
        r.destination?.toLowerCase().includes(q) ||
        r.company_name?.toLowerCase().includes(q)
      );
    }
    if (cargoType !== "all") list = list.filter(r => r.cargo_type?.toLowerCase() === cargoType);
    if (timeline !== "all") {
      list = list.filter(r => {
        const d = daysUntil(r.deadline);
        if (d === null) return timeline === "30days";
        if (timeline === "urgent") return d <= 3;
        if (timeline === "7days") return d <= 7;
        return d <= 30;
      });
    }

    list.sort((a, b) => {
      if (sortBy === "urgency") return (daysUntil(a.deadline) ?? 999) - (daysUntil(b.deadline) ?? 999);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [rfqs, search, cargoType, timeline, sortBy, showMine, myRfqIds]);

  const todayCount = rfqs?.filter(r => (Date.now() - new Date(r.created_at).getTime()) < 86400000).length || 0;

  const stats = [
    { label: "Total Opportunities", value: rfqs?.length || 0, icon: Package, accent: "text-accent" },
    { label: "New Today", value: todayCount, icon: Flame, accent: "text-orange-500" },
    { label: "Your Matches", value: matchCount || 0, icon: Sparkles, accent: "text-violet-500" },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Opportunities</h1>
          <p className="text-sm text-muted-foreground">Browse and engage with revenue-generating logistics deals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showMine ? "default" : "outline"} size="sm" onClick={() => setShowMine(!showMine)}>
            <Users className="mr-2 h-4 w-4" /> My Opportunities
          </Button>
          <Button variant="electric" size="sm" asChild>
            <Link to="/dashboard/spark?tab=rfqs"><Plus className="mr-2 h-4 w-4" /> Create Opportunity</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map(s => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                <s.icon className={`h-4 w-4 ${s.accent}`} />
              </div>
              <div>
                {isLoading ? <Skeleton className="h-6 w-10" /> : (
                  <div className="text-xl font-bold text-foreground tabular-nums">{s.value}</div>
                )}
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Recommendations */}
      <div className="mb-6">
        <RecommendedForYou variant="full" maxItems={4} />
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40 -mx-4 px-4 py-3 mb-4 lg:-mx-6 lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search opportunities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={cargoType} onValueChange={setCargoType}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{CARGO_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={timeline} onValueChange={setTimeline}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMELINE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>{SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Package className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No opportunities available right now</p>
                <p className="text-xs text-muted-foreground mb-4">Check back soon or create your own opportunity</p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard/spark"><Sparkles className="mr-2 h-4 w-4" /> Go to Spark</Link>
                  </Button>
                  <Button variant="electric" size="sm" asChild>
                    <Link to="/dashboard/spark?tab=rfqs"><Plus className="mr-2 h-4 w-4" /> Create Opportunity</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {filtered.map((rfq, idx) => {
                  const days = daysUntil(rfq.deadline);
                  const isUrgent = days !== null && days <= 3;
                  const isNew = (Date.now() - new Date(rfq.created_at).getTime()) < 86400000;
                  const isSaved = savedIds?.has(rfq.id);

                  return (
                    <motion.div
                      key={rfq.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group rounded-xl border border-border/60 bg-card hover:border-accent/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4 p-3.5">
                        {/* Left: Company */}
                        <div className="w-[140px] shrink-0 hidden md:block">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{rfq.company_name || "Anonymous"}</p>
                              {rfq.origin && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Globe className="h-2.5 w-2.5" /> {rfq.origin}</p>}
                            </div>
                          </div>
                        </div>

                        {/* Center: Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-semibold text-foreground truncate">{rfq.title}</span>
                            {isNew && <Badge variant="secondary" className="text-[9px] py-0 bg-accent/10 text-accent">New</Badge>}
                            {isUrgent && <Badge variant="secondary" className="text-[9px] py-0 bg-destructive/10 text-destructive">Urgent</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {rfq.origin && rfq.destination && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {rfq.origin} → {rfq.destination}</span>
                            )}
                            {rfq.container_type && <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {rfq.container_type}</span>}
                            {rfq.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {days !== null ? (days <= 0 ? "Expired" : `${days}d left`) : rfq.deadline}
                              </span>
                            )}
                            {rfq.cargo_type && <Badge variant="outline" className="text-[10px] py-0">{rfq.cargo_type}</Badge>}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="electric"
                            size="sm"
                            className="text-xs h-8 opacity-80 group-hover:opacity-100 transition-opacity"
                            onClick={() => setEngageModal(rfq)}
                          >
                            <Zap className="mr-1 h-3.5 w-3.5" /> Engage & Earn
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-accent"
                            onClick={() => saveMutation.mutate(rfq)}
                            title={isSaved ? "Saved" : "Save"}
                          >
                            {isSaved ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 hidden lg:block">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" /> Earnings Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <EarningsSummaryWidget />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" /> Trending Lanes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendingLanesWidget rfqs={rfqs || []} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Engage & Earn Modal */}
      <Dialog open={!!engageModal} onOpenChange={open => !open && setEngageModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" /> Engage & Earn
            </DialogTitle>
          </DialogHeader>
          {engageModal && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">{engageModal.title}</p>
              {engageModal.origin && engageModal.destination && (
                <p className="text-xs text-muted-foreground mb-4">
                  <MapPin className="inline h-3 w-3 mr-1" /> {engageModal.origin} → {engageModal.destination}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-4">How would you like to engage with this opportunity?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { action: "Refer", icon: Share2, desc: "Refer to your network", color: "hover:border-accent/40" },
                  { action: "Collaborate", icon: Handshake, desc: "Work together on this", color: "hover:border-violet-400" },
                  { action: "Fulfill", icon: Ship, desc: "Handle this shipment", color: "hover:border-emerald-400" },
                  { action: "Resell", icon: DollarSign, desc: "Resell the capacity", color: "hover:border-orange-400" },
                ].map(opt => (
                  <button
                    key={opt.action}
                    onClick={() => engageMutation.mutate({ rfq: engageModal, action: opt.action })}
                    className={`rounded-xl border border-border bg-card p-4 text-left transition-all hover:shadow-md ${opt.color} group`}
                  >
                    <opt.icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground mb-2 transition-colors" />
                    <p className="text-sm font-semibold text-foreground">{opt.action}</p>
                    <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

function EarningsSummaryWidget() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["opp-earnings-summary", user?.id],
    queryFn: async () => {
      const { data: balance } = await supabase
        .from("earnings_balance")
        .select("available_balance, pending_balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      return balance;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Available</span>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">${(data?.available_balance || 0).toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Pending</span>
        <span className="text-sm font-semibold text-foreground tabular-nums">${(data?.pending_balance || 0).toLocaleString()}</span>
      </div>
      <Separator />
      <Button variant="outline" size="sm" className="w-full text-xs" asChild>
        <Link to="/dashboard/earnings">View Full Earnings <ArrowRight className="ml-1 h-3 w-3" /></Link>
      </Button>
    </div>
  );
}

function TrendingLanesWidget({ rfqs }: { rfqs: RfqPost[] }) {
  const lanes = useMemo(() => {
    const map: Record<string, number> = {};
    rfqs.forEach(r => {
      if (r.origin && r.destination) {
        const key = `${r.origin} → ${r.destination}`;
        map[key] = (map[key] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [rfqs]);

  if (lanes.length === 0) return <p className="text-xs text-muted-foreground">No trending lanes yet</p>;

  return (
    <div className="space-y-2">
      {lanes.map(([lane, count]) => (
        <div key={lane} className="flex items-center justify-between text-xs">
          <span className="text-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3 text-accent" /> {lane}</span>
          <Badge variant="secondary" className="text-[10px] py-0">{count}</Badge>
        </div>
      ))}
    </div>
  );
}

export default Opportunities;
