import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Package } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function CargoDetailsForm() {
  const [commodity, setCommodity] = useState("");
  const [containers, setContainers] = useState("1");
  const [weight, setWeight] = useState("");

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Package className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">Get an Exact Quote</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Tell us about your cargo to receive a tailored, all-in quote.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Commodity</Label>
          <Input
            placeholder="e.g. Electronics, Furniture"
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Number of Containers</Label>
          <Select value={containers} onValueChange={setContainers}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} container{n > 1 ? "s" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Weight per Container (kg)</Label>
          <Input
            type="number"
            placeholder="e.g. 18000"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="electric" asChild>
          <Link to="/dashboard/shipments/new">
            Proceed to Book
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
