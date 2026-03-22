import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Receipt, ArrowRight, ChevronDown } from "lucide-react";
import { ALLOWED_TRANSITIONS } from "@/hooks/usePipelineMove";

export interface PipelineItem {
  id: string;
  ref: string;
  type: "quote" | "shipment";
  stage: string;
  route: string;
  customer: string | null;
  carrier: string | null;
  amount: number | null;
  date: string;
  link: string;
  status: string;
  shipmentId?: string;
}

const STAGE_LABELS: Record<string, string> = {
  quote_pending: "Quote Pending",
  quote_accepted: "Accepted",
  booked: "Booked",
  in_transit: "In Transit",
  arrived: "Arrived",
  delivered: "Delivered",
};

interface PipelineCardProps {
  item: PipelineItem;
  onPnl: (item: PipelineItem) => void;
  onMove: (item: PipelineItem, toStage: string) => void;
}

export function PipelineCard({ item, onPnl, onMove }: PipelineCardProps) {
  const transitions = ALLOWED_TRANSITIONS[item.stage] || [];

  return (
    <div className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow group relative">
      <Link to={item.link} className="block">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-semibold text-foreground">{item.ref}</span>
          <Badge variant="outline" className="text-[10px]">
            {item.type === "quote" ? "Quote" : "Shipment"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{item.route}</p>
        {item.customer && <p className="text-xs font-medium text-foreground truncate">{item.customer}</p>}
        {item.carrier && <p className="text-[10px] text-muted-foreground">{item.carrier}</p>}
        {item.amount != null && <p className="text-xs font-semibold text-foreground mt-1">${item.amount.toLocaleString()}</p>}
        <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(item.date), "MMM d, yyyy")}</p>
      </Link>

      {/* Action buttons — visible on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* P&L */}
        {(item.type === "shipment" || item.shipmentId) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-accent"
            title="Edit P&L"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPnl(item); }}
          >
            <Receipt className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Move status dropdown */}
        {transitions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-accent"
                title="Move to…"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]" onClick={(e) => e.stopPropagation()}>
              {transitions.map((t) => (
                <DropdownMenuItem key={t} onClick={() => onMove(item, t)} className="text-xs gap-2">
                  <ArrowRight className="h-3 w-3" />
                  {STAGE_LABELS[t] || t}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
