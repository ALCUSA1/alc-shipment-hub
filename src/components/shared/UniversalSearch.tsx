import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ResolverRow = {
  shipment_id: string;
  shipment_ref: string;
  reference_type: string;
  reference_value: string;
  match_type: string;
  origin_port: string | null;
  destination_port: string | null;
  status: string | null;
  carrier_code: string | null;
};

const REF_LABELS: Record<string, string> = {
  shipment_ref: "ALC Ref",
  carrier_booking_number: "Booking #",
  bill_of_lading: "B/L #",
  master_bl: "MBL",
  house_bl: "HBL",
  container_number: "Container",
  customer_reference: "Customer Ref",
  invoice_number: "Invoice #",
};

export function UniversalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResolverRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("resolve_shipment_reference", {
        _query: query.trim(),
      });
      setLoading(false);
      if (!error && data) {
        // Dedupe by shipment_id (resolver may return multiple ref hits per shipment)
        const seen = new Set<string>();
        const unique = (data as ResolverRow[]).filter((r) => {
          if (seen.has(r.shipment_id)) return false;
          seen.add(r.shipment_id);
          return true;
        });
        setResults(unique);
        setOpen(true);
      } else {
        setResults([]);
      }
    }, 250);
  }, [query]);

  const handleSelect = (shipmentId: string) => {
    setOpen(false);
    setQuery("");
    navigate(`/dashboard/shipments/${shipmentId}`);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search by shipment ref, booking #, B/L, container…"
        className="pl-9 pr-9 h-9 bg-secondary/60 border-transparent focus:border-border text-sm"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
      )}

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-96 overflow-auto">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-6 text-sm text-muted-foreground text-center">
              No shipments found for "{query}"
            </div>
          ) : (
            <ul className="py-1">
              {results.map((r) => (
                <li key={r.shipment_id}>
                  <button
                    onClick={() => handleSelect(r.shipment_id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 hover:bg-secondary/80 flex items-start gap-3 transition-colors"
                    )}
                  >
                    <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{r.shipment_ref}</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                          {REF_LABELS[r.reference_type] || r.reference_type}: {r.reference_value}
                        </Badge>
                        {r.carrier_code && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                            {r.carrier_code}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {r.origin_port || "—"} → {r.destination_port || "—"}
                        {r.status && <span className="ml-2 capitalize">· {r.status.replace(/_/g, " ")}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
