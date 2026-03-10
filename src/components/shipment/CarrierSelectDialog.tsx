import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, Search, Building2, User, Loader2 } from "lucide-react";

interface CarrierOption {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
}

interface CarrierSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (carrier: CarrierOption, instructions: string) => Promise<void>;
}

export function CarrierSelectDialog({ open, onOpenChange, onSelect }: CarrierSelectDialogProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CarrierOption | null>(null);
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: carriers, isLoading } = useQuery({
    queryKey: ["trucker-carriers"],
    queryFn: async () => {
      // Get all users with trucker role, join with profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, company_name")
        .in("user_id", 
          (await supabase.rpc("get_trucker_user_ids")).data || []
        );
      if (error) {
        // Fallback: query profiles that have role = trucker
        const { data: fallback } = await supabase
          .from("profiles")
          .select("user_id, full_name, company_name")
          .eq("role", "trucker");
        return (fallback || []) as CarrierOption[];
      }
      return (data || []) as CarrierOption[];
    },
    enabled: open,
  });

  const filtered = (carriers || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(q) ||
      c.full_name?.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await onSelect(selected, instructions);
      setSelected(null);
      setInstructions("");
      setSearch("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-accent" />
            Select Carrier
          </DialogTitle>
          <DialogDescription>
            Choose a carrier company to send this trucking order to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search carriers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Carrier List */}
          <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-1">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No carriers found. Ensure carrier accounts are registered.
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                    selected?.user_id === c.user_id
                      ? "bg-accent/10 border border-accent/30"
                      : "hover:bg-secondary/60"
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    {c.company_name ? (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {c.company_name || c.full_name || "Unknown Carrier"}
                    </p>
                    {c.company_name && c.full_name && (
                      <p className="text-xs text-muted-foreground truncate">{c.full_name}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <Label className="text-xs">Instructions (optional)</Label>
            <Textarea
              placeholder="Special pickup/delivery instructions for the carrier..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            disabled={!selected || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Truck className="h-4 w-4 mr-2" />
            )}
            Send Order to {selected?.company_name || selected?.full_name || "Carrier"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
