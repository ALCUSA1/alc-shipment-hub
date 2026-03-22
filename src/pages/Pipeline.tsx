import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShipmentPnL } from "@/components/shipment/ShipmentPnL";
import { PipelineCard, type PipelineItem } from "@/components/pipeline/PipelineCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { usePipelineMove, ALLOWED_TRANSITIONS } from "@/hooks/usePipelineMove";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Layers, DollarSign, CheckCircle2, Package, Truck, FileText, Receipt } from "lucide-react";

const STAGES = [
  { key: "quote_pending", label: "Quote Pending", icon: DollarSign, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { key: "quote_accepted", label: "Accepted", icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-200" },
  { key: "booked", label: "Booked", icon: Package, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "in_transit", label: "In Transit", icon: Truck, color: "bg-accent/10 text-accent border-accent/20" },
  { key: "arrived", label: "Arrived", icon: FileText, color: "bg-purple-100 text-purple-700 border-purple-200" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, color: "bg-green-100 text-green-700 border-green-200" },
];

const Pipeline = () => {
  const { user } = useAuth();
  const [pnlItem, setPnlItem] = useState<PipelineItem | null>(null);
  const moveMutation = usePipelineMove();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["pipeline", user?.id],
    queryFn: async () => {
      const pipeline: PipelineItem[] = [];

      const { data: quotes } = await supabase
        .from("quotes")
        .select("id, status, origin_port, destination_port, customer_name, carrier, customer_price, created_at, shipment_id")
        .eq("user_id", user!.id)
        .in("status", ["pending", "accepted"]);

      for (const q of quotes || []) {
        pipeline.push({
          id: q.id,
          ref: `Q-${q.id.slice(0, 6).toUpperCase()}`,
          type: "quote",
          stage: q.status === "pending" ? "quote_pending" : "quote_accepted",
          route: q.origin_port && q.destination_port ? `${q.origin_port} → ${q.destination_port}` : "—",
          customer: q.customer_name,
          carrier: q.carrier,
          amount: q.customer_price,
          date: q.created_at,
          link: q.shipment_id ? `/dashboard/shipments/${q.shipment_id}` : "/dashboard/quotes",
          status: q.status,
          shipmentId: q.shipment_id || undefined,
        });
      }

      const { data: shipments } = await supabase
        .from("shipments")
        .select("id, shipment_ref, status, origin_port, destination_port, created_at, companies(company_name)")
        .eq("user_id", user!.id)
        .in("status", ["booked", "in_transit", "arrived", "delivered"]);

      for (const s of shipments || []) {
        pipeline.push({
          id: s.id,
          ref: s.shipment_ref,
          type: "shipment",
          stage: s.status,
          route: s.origin_port && s.destination_port ? `${s.origin_port} → ${s.destination_port}` : "—",
          customer: (s.companies as any)?.company_name || null,
          carrier: null,
          amount: null,
          date: s.created_at,
          link: `/dashboard/shipments/${s.id}`,
          status: s.status,
        });
      }

      return pipeline;
    },
    enabled: !!user,
  });

  const stageItems = (stageKey: string) => items.filter((i) => i.stage === stageKey);

  const handleMove = (item: PipelineItem, toStage: string) => {
    moveMutation.mutate({
      itemId: item.id,
      fromStage: item.stage,
      toStage,
      itemType: item.type,
      shipmentId: item.shipmentId,
    });
  };

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const item = items.find((i) => i.id === draggableId);
    if (!item) return;

    const allowed = ALLOWED_TRANSITIONS[item.stage] || [];
    if (!allowed.includes(destination.droppableId)) return;

    handleMove(item, destination.droppableId);
  };

  const pnlShipmentId = pnlItem
    ? pnlItem.type === "shipment" ? pnlItem.id : pnlItem.shipmentId
    : undefined;

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center gap-3">
        <BackButton />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          </div>
          <p className="text-sm text-muted-foreground">Drag cards or use the ▾ menu to advance transactions</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Stage summary bar */}
          <div className="flex flex-wrap gap-2 mb-6">
            {STAGES.map((stage) => {
              const count = stageItems(stage.key).length;
              return (
                <div key={stage.key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${stage.color}`}>
                  <stage.icon className="h-3 w-3" />
                  {stage.label}
                  <span className="font-bold">{count}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium bg-muted text-muted-foreground">
              Total <span className="font-bold">{items.length}</span>
            </div>
          </div>

          {/* Kanban columns with DnD */}
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
                          className={`min-h-[80px] rounded-lg transition-colors ${
                            snapshot.isDraggingOver ? "bg-accent/5 ring-2 ring-accent/20" : ""
                          }`}
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
                                      <PipelineCard item={item} onPnl={setPnlItem} onMove={handleMove} />
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
        </>
      )}

      {/* P&L Dialog */}
      <Dialog open={!!pnlItem} onOpenChange={(open) => !open && setPnlItem(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-accent" />
              P&L — {pnlItem?.ref}
            </DialogTitle>
          </DialogHeader>
          {pnlShipmentId && (
            <ShipmentPnL
              shipmentId={pnlShipmentId}
              quoteAmount={pnlItem?.amount}
              shipmentStatus={pnlItem?.status}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Pipeline;
