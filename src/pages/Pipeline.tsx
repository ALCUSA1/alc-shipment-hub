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
import { PipelineCard, type PipelineItem } from "@/components/pipeline/PipelineCard";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Layers, DollarSign, Handshake, MessageSquare, CheckCircle2, Truck, PackageCheck,
  Filter, Search, Sparkles, ArrowRight, TrendingUp, Eye, MessageCircle
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

/* ─── Demo seed data ─── */
function seedPipeline(): PipelineItem[] {
  return [
    { id: "p1", ref: "OPP-001", type: "shipment", stage: "opportunity", route: "Shanghai → Los Angeles", customer: "Meridian Logistics", carrier: null, amount: null, date: new Date().toISOString(), link: "/dashboard/spark", status: "opportunity", meta: { title: "2x40HC China → LA", kind: "Shipment", volume: "2x40HC", timeline: "Apr 2026", estimatedEarnings: 1200 } },
    { id: "p2", ref: "OPP-002", type: "shipment", stage: "opportunity", route: "Hamburg → New York", customer: "Apex Trade Co", carrier: null, amount: null, date: new Date().toISOString(), link: "/dashboard/spark", status: "opportunity", meta: { title: "1x20GP Germany → NY", kind: "Capacity", volume: "1x20GP", timeline: "May 2026", estimatedEarnings: 650 } },
    { id: "p3", ref: "ENG-003", type: "shipment", stage: "engaged", route: "Ningbo → Savannah", customer: "Pacific Freight", carrier: null, amount: null, date: new Date().toISOString(), link: "/dashboard/spark", status: "engaged", meta: { title: "3x40HC Ningbo → SAV", kind: "Shipment", volume: "3x40HC", timeline: "Apr 2026", estimatedEarnings: 2100 } },
    { id: "p4", ref: "DIS-004", type: "shipment", stage: "in_discussion", route: "Busan → Long Beach", customer: "Global Cargo Inc", carrier: "Evergreen", amount: 1800, date: new Date().toISOString(), link: "/dashboard/spark", status: "in_discussion", meta: { title: "1x40HC Korea → LB", kind: "Partnership", volume: "1x40HC", timeline: "May 2026", estimatedEarnings: 900 } },
    { id: "p5", ref: "DEA-005", type: "shipment", stage: "deal_confirmed", route: "Yantian → Newark", customer: "Allied Shipping", carrier: "MSC", amount: 3200, date: new Date().toISOString(), link: "/dashboard/shipments", status: "deal_confirmed", meta: { title: "2x40HC Yantian → EWR", kind: "Shipment", volume: "2x40HC", timeline: "Apr 2026", confirmedEarnings: 1600 } },
    { id: "p6", ref: "SHP-006", type: "shipment", stage: "booked", route: "Rotterdam → Houston", customer: "TransOcean Ltd", carrier: "Hapag-Lloyd", amount: 2800, date: new Date().toISOString(), link: "/dashboard/shipments/p6", status: "booked", meta: { title: "1x40HC Rotterdam → HOU", kind: "Shipment", volume: "1x40HC", timeline: "Mar 2026", confirmedEarnings: 1400 } },
    { id: "p7", ref: "SHP-007", type: "shipment", stage: "completed", route: "Qingdao → Charleston", customer: "EastWest Logistics", carrier: "COSCO", amount: 2400, date: new Date().toISOString(), link: "/dashboard/shipments/p7", status: "completed", meta: { title: "2x20GP Qingdao → CHS", kind: "Shipment", volume: "2x20GP", timeline: "Feb 2026", paidEarnings: 1200 } },
  ];
}

/* ─── Filters ─── */
interface Filters {
  search: string;
  status: string;
  tradeLane: string;
}

const Pipeline = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<PipelineItem[]>(seedPipeline);
  const [filters, setFilters] = useState<Filters>({ search: "", status: "all", tradeLane: "all" });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filters.status !== "all" && item.stage !== filters.status) return false;
      if (filters.tradeLane !== "all" && !item.route.toLowerCase().includes(filters.tradeLane.toLowerCase())) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return item.customer?.toLowerCase().includes(q) || item.route.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q) || item.meta?.title?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, filters]);

  const stageItems = (key: string) => filteredItems.filter((i) => i.stage === key);

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const item = items.find((i) => i.id === draggableId);
    if (!item) return;
    const allowed = ALLOWED_MOVES[item.stage] || [];
    if (!allowed.includes(destination.droppableId)) return;
    setItems((prev) => prev.map((i) => (i.id === draggableId ? { ...i, stage: destination.droppableId, status: destination.droppableId } : i)));
  };

  const handleMove = (item: PipelineItem, toStage: string) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, stage: toStage, status: toStage } : i)));
  };

  /* Summary stats */
  const totalActive = items.filter((i) => !["completed"].includes(i.stage)).length;
  const inProgress = items.filter((i) => ["in_discussion", "deal_confirmed", "booked"].includes(i.stage)).length;
  const completed = items.filter((i) => i.stage === "completed").length;
  const totalEarnings = items.reduce((sum, i) => sum + (i.meta?.paidEarnings || i.meta?.confirmedEarnings || i.meta?.estimatedEarnings || 0), 0);

  const tradeLanes = [...new Set(items.map((i) => i.route))];

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
            <Button variant="electric" size="sm" className="gap-1.5">
              <DollarSign className="h-4 w-4" /> View Earnings
            </Button>
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
        {filteredItems.length === 0 && !items.length ? (
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
                              {cards.map((item, index) => (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={dragSnapshot.isDragging ? "opacity-80 rotate-1" : ""}
                                    >
                                      <SparkPipelineCard item={item} onMove={handleMove} />
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

/* ─── Pipeline Card (Spark-specific) ─── */
function SparkPipelineCard({ item, onMove }: { item: PipelineItem; onMove: (item: PipelineItem, to: string) => void }) {
  const transitions = ALLOWED_MOVES[item.stage] || [];
  const earnings = item.meta?.paidEarnings || item.meta?.confirmedEarnings || item.meta?.estimatedEarnings || 0;
  const earningsLabel = item.meta?.paidEarnings ? "Paid" : item.meta?.confirmedEarnings ? "Confirmed" : "Estimated";
  const earningsColor = item.meta?.paidEarnings ? "text-green-600 dark:text-green-400" : item.meta?.confirmedEarnings ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono font-semibold text-foreground">{item.ref}</span>
        <Badge variant="outline" className="text-[10px]">{item.meta?.kind || "Shipment"}</Badge>
      </div>
      {item.meta?.title && <p className="text-sm font-medium text-foreground mb-1">{item.meta.title}</p>}
      <p className="text-xs text-muted-foreground mb-1">{item.route}</p>
      {item.customer && <p className="text-xs text-foreground/80 truncate">{item.customer}</p>}
      {item.meta?.volume && <p className="text-[10px] text-muted-foreground">{item.meta.volume} · {item.meta.timeline}</p>}

      {/* Earnings */}
      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">{earningsLabel} Earnings</p>
          <p className={`text-sm font-bold tabular-nums ${earningsColor}`}>${earnings.toLocaleString()}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" title="View Details">
            <Eye className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Message">
            <MessageCircle className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Move button */}
      {transitions.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs text-accent hover:text-accent gap-1"
          onClick={() => onMove(item, transitions[0])}
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
