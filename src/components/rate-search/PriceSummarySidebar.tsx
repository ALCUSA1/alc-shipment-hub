import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import type { Json } from "@/integrations/supabase/types";

interface Surcharge {
  code: string;
  description: string;
  amount: number;
}

interface CarrierRate {
  id: string;
  carrier: string;
  base_rate: number;
  currency: string;
  surcharges: Json;
}

function parseSurcharges(surcharges: Json): Surcharge[] {
  if (!Array.isArray(surcharges)) return [];
  return surcharges
    .filter((s) => typeof s === "object" && s !== null && "code" in s && "amount" in s)
    .map((s) => {
      const obj = s as Record<string, Json>;
      return {
        code: String(obj.code ?? ""),
        description: String(obj.description ?? ""),
        amount: Number(obj.amount ?? 0),
      };
    });
}

function categorizeSurcharges(surcharges: Surcharge[]) {
  const origin: Surcharge[] = [];
  const destination: Surcharge[] = [];
  const freight: Surcharge[] = [];
  surcharges.forEach((s) => {
    const code = s.code.toLowerCase();
    if (code.includes("origin") || code === "thc_origin" || code === "doc") origin.push(s);
    else if (code.includes("dest") || code === "thc_dest" || code === "do") destination.push(s);
    else freight.push(s);
  });
  return { origin, destination, freight };
}

interface PriceSummarySidebarProps {
  selectedRate: CarrierRate | null;
  containerSize: string;
  origin?: string;
  destination?: string;
  mode?: string;
}

const CONTAINER_LABELS: Record<string, string> = {
  "20gp": "20ft Standard",
  "40gp": "40ft Standard",
  "40hc": "40ft High Cube",
  "45hc": "45ft High Cube",
};

export function PriceSummarySidebar({ selectedRate, containerSize }: PriceSummarySidebarProps) {
  if (!selectedRate) {
    return (
      <div className="sticky top-24 rounded-xl border bg-card p-5 space-y-4">
        <p className="text-sm text-muted-foreground text-center py-6">
          Select a carrier to see the price breakdown
        </p>
      </div>
    );
  }

  const surcharges = parseSurcharges(selectedRate.surcharges);
  const categories = categorizeSurcharges(surcharges);
  const originTotal = categories.origin.reduce((s, c) => s + c.amount, 0);
  const destTotal = categories.destination.reduce((s, c) => s + c.amount, 0);
  const freightTotal = selectedRate.base_rate + categories.freight.reduce((s, c) => s + c.amount, 0);
  const grandTotal = originTotal + destTotal + freightTotal;

  return (
    <div className="sticky top-24 rounded-xl border bg-card p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Price Breakdown</p>
        <p className="text-sm font-medium text-foreground">{selectedRate.carrier}</p>
        <p className="text-xs text-muted-foreground">{CONTAINER_LABELS[containerSize] || containerSize}</p>
      </div>

      <Separator />

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">FCL Freight</span>
          <span className="font-mono font-medium">${freightTotal.toLocaleString()}</span>
        </div>
        {originTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Origin Local</span>
            <span className="font-mono font-medium">${originTotal.toLocaleString()}</span>
          </div>
        )}
        {destTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Destination Local</span>
            <span className="font-mono font-medium">${destTotal.toLocaleString()}</span>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex justify-between text-base font-bold">
        <span>Total</span>
        <span className="font-mono text-accent">${grandTotal.toLocaleString()}</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">
        *Taxes & duties additional. Subject to carrier confirmation.
      </p>

      <Button variant="electric" className="w-full" asChild>
        <Link to="/signup">
          Book Now
          <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center">
        <Shield className="h-3 w-3" />
        Secure booking · No hidden fees
      </div>
    </div>
  );
}
