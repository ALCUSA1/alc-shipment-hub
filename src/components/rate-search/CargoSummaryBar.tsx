import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Pencil } from "lucide-react";

const CONTAINER_LABELS: Record<string, string> = {
  "20gp": "20ft Std",
  "40gp": "40ft Std",
  "40hc": "40ft HC",
  "45hc": "45ft HC",
};

interface CargoSummaryBarProps {
  containerSize: string;
}

export function CargoSummaryBar({ containerSize }: CargoSummaryBarProps) {
  const [containers, setContainers] = useState("1");
  const [weight, setWeight] = useState("18000");
  const [commodity, setCommodity] = useState("General Cargo");
  const [open, setOpen] = useState(false);

  const label = CONTAINER_LABELS[containerSize] || containerSize;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2.5 text-sm">
      <Package className="h-4 w-4 text-accent shrink-0" />
      <span className="text-foreground font-medium">
        {containers} × {label}
      </span>
      <span className="text-muted-foreground">|</span>
      <span className="text-muted-foreground">{Number(weight).toLocaleString()} kg</span>
      <span className="text-muted-foreground">|</span>
      <span className="text-muted-foreground truncate max-w-[160px]">{commodity}</span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="ml-auto flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium transition-colors shrink-0">
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="end">
          <p className="text-sm font-semibold text-foreground">Cargo Details</p>
          <div>
            <Label className="text-xs text-muted-foreground">Commodity</Label>
            <Input value={commodity} onChange={(e) => setCommodity(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Containers</Label>
            <Select value={containers} onValueChange={setContainers}>
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Weight per Container (kg)</Label>
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <Button size="sm" className="w-full" onClick={() => setOpen(false)}>Apply</Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
