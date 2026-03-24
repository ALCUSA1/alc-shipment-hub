import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Layers, DollarSign, Handshake, MessageSquare, CheckCircle2, Truck, PackageCheck,
  Filter, Search, Sparkles, ArrowRight, TrendingUp, Eye, MessageCircle, Plus
} from "lucide-react";

/* ─── Stage definitions ─── */
const STAGES = [
  { key: "opportunity", label: "Opportunities", icon: Sparkles, color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" },
  { key: "engaged", label: "Engaged", icon: Handshake, color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" },
  { key: "in_discussion", label: "In Discussion", icon: MessageSquare, color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  { key: "deal_confirmed", label: "Deal Confirmed", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" },
  { key: "booked", label: "Booked / In Transit", icon: Truck, color: "bg-accent/10 text-accent border-accent/20" },
  { key: "completed", label: "Completed", icon: PackageCheck, color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
];

const ALLOWED_MOVES: Record<string, string[]> = {
  opportunity: ["engaged"],
  engaged: ["in_discussion"],
  in_discussion: ["deal_confirmed"],
  deal_confirmed: ["booked"],
  booked: ["completed"],
  completed: [],
};

interface DealRow {
  id: string;
  stage: string;
  title: string;
  company_name: string | null;
  deal_type: string;
  trade_lane: string | null;
  volume: string | null;
  timeline: string | null;
  carrier: string | null;
  estimated_earnings: number | null;
  confirmed_earnings: number | null;
  paid_earnings: number | null;
  deal_amount: number | null;
  created_at: string;
  shipment_id: string | null;
}

interface Filters {
  search: string;
  status: string;
  tradeLane: string;
}

const Pipeline = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ search: "", status: "all", tradeLane: "all" });

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["pipeline-deals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_deals")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DealRow[];
    },
    enabled: !!user,
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, toStage }: { id: string; toStage: string }) => {
      const { error } = await supabase
        .from("pipeline_deals")
        .update({ stage: toStage })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-deals"] });
      toast.success("Stage updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (filters.status !== "all" && d.stage !== filters.status) return false;
      if (filters.tradeLane !== "all" && d.trade_lane !== filters.tradeLane) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (d.company_name?.toLowerCase().includes(q) || d.trade_lane?.toLowerCase().includes(q) || d.title.toLowerCase().includes(q));
      }
      return true;
    });
  }, [deals, filters]);

  const stageItems = (key: string) => filteredDeals.filter((d) => d.stage === key);

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const deal = deals.find((d) => d.id === draggableId);
    if (!deal) return;
    const allowed = ALLOWED_MOVES[deal.stage] || [];
    if (!allowed.includes(destination.droppableId)) return;
    moveMutation.mutate({ id: deal.id, toStage: destination.droppableId });
  };

  const handleMove = (deal: DealRow, toStage: string) => {
    moveMutation.mutate({ id: deal.id, toStage });
  };

  /* Summary stats */
  const totalActive = deals.filter((d) => d.stage !== "completed").length;
  const inProgress = deals.filter((d) => ["in_discussion", "deal_confirmed", "booked"].includes(d.stage)).length;
  const completed = deals.filter((d) => d.stage === "completed").length;
  const totalEarnings = deals.reduce((sum, d) => sum + (d.paid_earnings || d.confirmed_earnings || d.estimated_earnings || 0), 0);
  const tradeLanes = [...new Set(deals.map((d) => d.trade_lane).filter(Boolean))] as string[];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-5 w-5 text-accent" />
              <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
            </div>
            <p className="text-sm text-muted-foreground">Track opportunities from Spark all the way to completed shipments & earnings</p>
          </div>
          <Link to="/dashboard/earnings">
            <Button variant="electric" size="sm" className="gap-1.5"><DollarSign className="h-4 w-4" /> View Earnings</Button>
          </Link>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Active Deals", value: totalActive, icon: TrendingUp, accent: "text-accent" },
            { label: "In Progress", value: inProgress, icon: MessageSquare, accent: "text-blue-500" },
            { label: "Completed", value: completed, icon: CheckCircle2, accent: "text-green-500" },
            { label: "Pipeline Earnings", value: `$${totalEarnings.toLocaleString()}`, icon: DollarSign, accent: "text-emerald-500" },
          ].map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${s.accent}`}><s.icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search pipeline..." className="pl-9" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
          </div>
          <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.tradeLane} onValueChange={(v) => setFilters((f) => ({ ...f, tradeLane: v }))}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Trade Lane" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trade Lanes</SelectItem>
              {tradeLanes.map((tl) => <SelectItem key={tl} value={tl}>{tl}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
          </div>
        ) : deals.length === 0 ? (
          <EmptyPipeline />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
              {STAGES.map((stage) => {
                const cards = stageItems(stage.key);
                return (
                  <div key={stage.key} className="space-y-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${stage.color}`}>
                      <stage.icon className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{stage.label}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] h-5">{cards.length}</Badge>
                    </div>
                    <Droppable droppableId={stage.key}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[80px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-accent/5 ring-2 ring-accent/20" : ""}`}
                        >
                          {cards.length === 0 && !snapshot.isDraggingOver ? (
                            <div className="border border-dashed rounded-lg p-4 text-center">
                              <p className="text-xs text-muted-foreground">No items</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {cards.map((deal, index) => (
                                <Draggable key={deal.id} draggableId={deal.id} index={index}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={dragSnapshot.isDragging ? "opacity-80 rotate-1" : ""}
                                    >
                                      <DealCard deal={deal} onMove={handleMove} />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>
    </DashboardLayout>
  );
};

/* ─── Deal Card ─── */
function DealCard({ deal, onMove }: { deal: DealRow; onMove: (deal: DealRow, to: string) => void }) {
  const transitions = ALLOWED_MOVES[deal.stage] || [];
  const earnings = deal.paid_earnings || deal.confirmed_earnings || deal.estimated_earnings || 0;
  const earningsLabel = deal.paid_earnings ? "Paid" : deal.confirmed_earnings ? "Confirmed" : "Estimated";
  const earningsColor = deal.paid_earnings ? "text-green-600 dark:text-green-400" : deal.confirmed_earnings ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground";

  const kindLabel = deal.deal_type === "capacity" ? "Capacity" : deal.deal_type === "partnership" ? "Partnership" : "Shipment";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono font-semibold text-foreground truncate">{deal.title}</span>
        <Badge variant="outline" className="text-[10px] shrink-0">{kindLabel}</Badge>
      </div>
      {deal.trade_lane && <p className="text-xs text-muted-foreground mb-1">{deal.trade_lane}</p>}
      {deal.company_name && <p className="text-xs text-foreground/80 truncate">{deal.company_name}</p>}
      {(deal.volume || deal.timeline) && (
        <p className="text-[10px] text-muted-foreground">{[deal.volume, deal.timeline].filter(Boolean).join(" · ")}</p>
      )}

      {/* Earnings */}
      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">{earningsLabel} Earnings</p>
          <p className={`text-sm font-bold tabular-nums ${earningsColor}`}>${earnings.toLocaleString()}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" title="View Details"><Eye className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Message"><MessageCircle className="h-3 w-3" /></Button>
        </div>
      </div>

      {/* Move button */}
      {transitions.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs text-accent hover:text-accent gap-1"
          onClick={() => onMove(deal, transitions[0])}
        >
          Move to {STAGES.find((s) => s.key === transitions[0])?.label} <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
}

/* ─── Empty State ─── */
function EmptyPipeline() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-full bg-accent/10 mb-4"><Sparkles className="h-8 w-8 text-accent" /></div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Your pipeline is empty</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">Start engaging with opportunities in Spark to build your pipeline and track deals all the way to completed shipments.</p>
      <Link to="/dashboard/spark">
        <Button variant="electric" className="gap-2"><Sparkles className="h-4 w-4" /> Go to Spark</Button>
      </Link>
    </motion.div>
  );
}

export default Pipeline;
