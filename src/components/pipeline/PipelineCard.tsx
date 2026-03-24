import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Receipt, ArrowRight, ChevronDown } from "lucide-react";

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
  meta?: {
    title?: string;
    kind?: string;
    volume?: string;
    timeline?: string;
    estimatedEarnings?: number;
    confirmedEarnings?: number;
    paidEarnings?: number;
  };
}

export function PipelineCard({ item, onPnl, onMove }: { item: PipelineItem; onPnl?: (item: PipelineItem) => void; onMove?: (item: PipelineItem, toStage: string) => void }) {
  return (
    <div className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow">
      <Link to={item.link} className="block">
        <span className="text-xs font-mono font-semibold text-foreground">{item.ref}</span>
        <p className="text-xs text-muted-foreground mt-1">{item.route}</p>
        {item.customer && <p className="text-xs font-medium text-foreground truncate">{item.customer}</p>}
        {item.amount != null && <p className="text-xs font-semibold text-foreground mt-1">${item.amount.toLocaleString()}</p>}
        <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(item.date), "MMM d, yyyy")}</p>
      </Link>
    </div>
  );
}
