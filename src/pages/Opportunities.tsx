import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { RecommendedForYou } from "@/components/smart/RecommendedForYou";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Plus, Package, Ship, Plane, Handshake,
  DollarSign, TrendingUp, Clock, Flame, Sparkles, Zap,
  Bookmark, BookmarkCheck, ArrowUpDown, MapPin, Building2,
  Globe, Calendar, ChevronRight, Eye, Users, Share2,
  Truck, ArrowRight, Star, X,
} from "lucide-react";

type RfqPost = {
  id: string;
  user_id: string;
  title: string;
  origin: string | null;
  destination: string | null;
  volume: string | null;
  category: string | null;
  budget_range: string | null;
  deadline: string | null;
  description: string | null;
  status: string;
  created_at: string;
  bid_count: number | null;
  profiles?: { full_name: string | null; company_name: string | null } | null;
};

const SHIPMENT_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "fcl", label: "FCL" },
  { value: "lcl", label: "LCL" },
  { value: "air", label: "Air" },
  { value: "breakbulk", label: "Breakbulk" },
];

const OPP_TYPE_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "shipment", label: "Shipment" },
  { value: "capacity", label: "Capacity" },
  { value: "partnership", label: "Partnership" },
];

const EARNINGS_OPTIONS = [
  { value: "all", label: "All Earnings" },
  { value: "low", label: "$ (Under $100)" },
  { value: "mid", label: "$$ ($100–$500)" },
  { value: "high", label: "$$$ ($500+)" },
];

const TIMELINE_OPTIONS = [
  { value: "all", label: "Any Timeline" },
  { value: "urgent", label: "Urgent (< 3 days)" },
  { value: "7days", label: "Within 7 days" },
  { value: "30days", label: "Within 30 days" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "earnings", label: "Highest Earnings" },
  { value: "urgency", label: "Most Urgent" },
];

function estimateEarnings(budgetRange: string | null): { low: number; high: number } {
  if (!budgetRange) return { low: 25, high: 150 };
  const nums = budgetRange.match(/[\d,]+/g)?.map(n => parseInt(n.replace(/,/g, ""))) || [];
  if (nums.length >= 2) return { low: Math.round(nums[0] * 0.05), high: Math.round(nums[1] * 0.1) };
  if (nums.length === 1) return { low: Math.round(nums[0] * 0.03), high: Math.round(nums[0] * 0.08) };
  return { low: 25, high: 150 };
}

function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = (new Date(deadline).getTime() - Date.now()) / 86400000;
  return Math.ceil(diff);
}

const Opportunities = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [shipmentType, setShipmentType] = useState("all");
  const [oppType, setOppType] = useState("all");
  const [earningsRange, setEarningsRange] = useState("all");
  const [timeline, setTimeline] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [engageModal, setEngageModal] = useState<RfqPost | null>(null);
  const [showMine, setShowMine] = useState(false);

  const { data: rfqs, isLoading } = useQuery({
    queryKey: ["opportunities-rfqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfq_posts")
        .select("*, profiles(full_name, company_name)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RfqPost[];
    },
    enabled: !!user,
  });

  const { data: myRfqs } = useQuery({
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

  const { data: matchData } = useQuery({
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
      // Create pipeline deal from engagement
      const earnings = estimateEarnings(rfq.budget_range);
      const { error } = await supabase.from("pipeline_deals").insert({
        user_id: user!.id,
        stage: "engaged",
        title: rfq.title,
        company_name: (rfq.profiles as any)?.company_name || "Unknown",
        deal_type: rfq.category || "shipment",
        trade_lane: rfq.origin && rfq.destination ? `${rfq.origin} → ${rfq.destination}` : null,
        origin: rfq.origin,
        destination: rfq.destination,
        volume: rfq.volume,
        timeline: rfq.deadline,
        estimated_earnings: earnings.high,
        source_type: "rfq",
        source_id: rfq.id,
        notes: `Engaged via Opportunities page — Action: ${action}`,
      });
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      toast({ title: "Engaged!", description: `This opportunity has been added to your Pipeline as "${action}".` });
      setEngageModal(null);
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (rfq: RfqPost) => {
      const earnings = estimateEarnings(rfq.budget_range);
      await supabase.from("ai_matches").insert({
        user_id: user!.id,
        match_type: "shipment",
        title: rfq.title,
        trade_lane: rfq.origin && rfq.destination ? `${rfq.origin} → ${rfq.destination}` : null,
        origin: rfq.origin,
        destination: rfq.destination,
        deal_type: rfq.category || "shipment",
        estimated_earnings: earnings.high,
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

  // Filter + sort
  const filtered = useMemo(() => {
    if (!rfqs) return [];
    let list = [...rfqs];

    if (showMine && myRfqs) list = list.filter(r => myRfqs.has(r.id));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.origin?.toLowerCase().includes(q) ||
        r.destination?.toLowerCase().includes(q) ||
        (r.profiles as any)?.company_name?.toLowerCase().includes(q)
      );
    }
    if (shipmentType !== "all") list = list.filter(r => r.category?.toLowerCase() === shipmentType || r.volume?.toLowerCase().includes(shipmentType));
    if (oppType !== "all") list = list.filter(r => (r.category || "shipment") === oppType);
    if (earningsRange !== "all") {
      list = list.filter(r => {
        const e = estimateEarnings(r.budget_range);
        if (earningsRange === "low") return e.high < 100;
        if (earningsRange === "mid") return e.low >= 100 && e.high <= 500;
        return e.low >= 500;
      });
    }
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
      if (sortBy === "earnings") return estimateEarnings(b.budget_range).high - estimateEarnings(a.budget_range).high;
      if (sortBy === "urgency") return (daysUntil(a.deadline) ?? 999) - (daysUntil(b.deadline) ?? 999);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [rfqs, search, shipmentType, oppType, earningsRange, timeline, sortBy, showMine, myRfqs]);

  const todayCount = rfqs?.filter(r => {
    const diff = Date.now() - new Date(r.created_at).getTime();
    return diff < 86400000;
  }).length || 0;

  const highEarningCount = rfqs?.filter(r => estimateEarnings(r.budget_range).high >= 300).length || 0;

  const stats = [
    { label: "Total Opportunities", value: rfqs?.length || 0, icon: Package, accent: "text-accent" },
    { label: "High Earning", value: highEarningCount, icon: DollarSign, accent: "text-emerald-500" },
    { label: "New Today", value: todayCount, icon: Flame, accent: "text-orange-500" },
    { label: "Your Matches", value: matchData || 0, icon: Sparkles, accent: "text-violet-500" },
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
          <Button
            variant={showMine ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMine(!showMine)}
          >
            <Users className="mr-2 h-4 w-4" />
            My Opportunities
          </Button>
          <Button variant="electric" size="sm" asChild>
            <Link to="/dashboard/spark?tab=rfqs">
              <Plus className="mr-2 h-4 w-4" />
              Create Opportunity
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg bg-secondary flex items-center justify-center`}>
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
            <Input
              placeholder="Search opportunities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={shipmentType} onValueChange={setShipmentType}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{SHIPMENT_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={oppType} onValueChange={setOppType}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{OPP_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={earningsRange} onValueChange={setEarningsRange}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{EARNINGS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={timeline} onValueChange={setTimeline}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMELINE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Opportunity List */}
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
                  const earnings = estimateEarnings(rfq.budget_range);
                  const days = daysUntil(rfq.deadline);
                  const isUrgent = days !== null && days <= 3;
                  const isHigh = earnings.high >= 300;
                  const isNew = (Date.now() - new Date(rfq.created_at).getTime()) < 86400000;
                  const isSaved = savedIds?.has(rfq.id);
                  const companyName = (rfq.profiles as any)?.company_name;

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
                              <p className="text-xs font-medium text-foreground truncate">{companyName || "Anonymous"}</p>
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
                            {isHigh && <Badge variant="secondary" className="text-[9px] py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><Flame className="h-2.5 w-2.5 mr-0.5" /> High Margin</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {rfq.origin && rfq.destination && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {rfq.origin} → {rfq.destination}
                              </span>
                            )}
                            {rfq.volume && <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {rfq.volume}</span>}
                            {rfq.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {days !== null ? (days <= 0 ? "Expired" : `${days}d left`) : rfq.deadline}
                              </span>
                            )}
                            {rfq.category && (
                              <Badge variant="outline" className="text-[10px] py-0">{rfq.category}</Badge>
                            )}
                          </div>
                        </div>

                        {/* Right: Earnings + Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              ${earnings.low} – ${earnings.high}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Est. earnings</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="electric"
                              size="sm"
                              className="text-xs h-8 opacity-80 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEngageModal(rfq)}
                            >
                              <Zap className="mr-1 h-3.5 w-3.5" />
                              Engage & Earn
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
          {/* Earnings Summary */}
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

          {/* Trending Lanes */}
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
              <Zap className="h-5 w-5 text-accent" />
              Engage & Earn
            </DialogTitle>
          </DialogHeader>
          {engageModal && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">{engageModal.title}</p>
              {engageModal.origin && engageModal.destination && (
                <p className="text-xs text-muted-foreground mb-4">
                  <MapPin className="inline h-3 w-3 mr-1" />
                  {engageModal.origin} → {engageModal.destination}
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
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Estimated earnings: <strong className="tabular-nums">${estimateEarnings(engageModal.budget_range).low} – ${estimateEarnings(engageModal.budget_range).high}</strong>
                </p>
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
        .select("available_balance, pending_balance, lifetime_earnings")
        .eq("user_id", user!.id)
        .maybeSingle();
      return balance;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">This Month</span>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          ${(data?.available_balance || 0).toLocaleString()}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Pending</span>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          ${(data?.pending_balance || 0).toLocaleString()}
        </span>
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
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [rfqs]);

  if (lanes.length === 0) {
    return <p className="text-xs text-muted-foreground">No trending lanes yet</p>;
  }

  return (
    <div className="space-y-2">
      {lanes.map(([lane, count]) => (
        <div key={lane} className="flex items-center justify-between text-xs">
          <span className="text-foreground flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-accent" /> {lane}
          </span>
          <Badge variant="secondary" className="text-[10px] py-0">{count}</Badge>
        </div>
      ))}
    </div>
  );
}

export default Opportunities;
