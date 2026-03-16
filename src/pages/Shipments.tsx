import { useState, useMemo } from "react";
import { BulkOperationsPanel } from "@/components/shipment/BulkOperationsPanel";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, X, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Trash2, Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusColor: Record<string, string> = {
  in_transit: "bg-accent/10 text-accent",
  booked: "bg-yellow-100 text-yellow-800",
  booking_confirmed: "bg-yellow-100 text-yellow-700",
  cargo_received: "bg-blue-100 text-blue-700",
  arrived: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  draft: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "booked", label: "Booked" },
  { value: "booking_confirmed", label: "Booking Confirmed" },
  { value: "cargo_received", label: "Cargo Received" },
  { value: "in_transit", label: "In Transit" },
  { value: "arrived", label: "Arrived" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "export", label: "Export" },
  { value: "import", label: "Import" },
];

const formatStatus = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const PAGE_SIZE = 20;

type SortKey = "shipment_ref" | "customer" | "origin_port" | "shipment_type" | "status";
type SortDir = "asc" | "desc";

const SEED_SHIPMENTS = [
  { shipment_ref: "ALC-2026-0101", shipment_type: "export" as const, status: "pending", origin_port: "USLAX", destination_port: "CNSHA", mode: "ocean", carrier: "Maersk", incoterms: "FOB" },
  { shipment_ref: "ALC-2026-0102", shipment_type: "import" as const, status: "pending", origin_port: "DEHAM", destination_port: "USNYC", mode: "ocean", carrier: "Hapag-Lloyd", incoterms: "CIF" },
  { shipment_ref: "ALC-2026-0103", shipment_type: "export" as const, status: "pending", origin_port: "USHOU", destination_port: "BRSSZ", mode: "ocean", carrier: "MSC", incoterms: "EXW" },
  { shipment_ref: "ALC-2026-0104", shipment_type: "export" as const, status: "pending", origin_port: "USSAV", destination_port: "GBFXT", mode: "ocean", carrier: "CMA CGM", incoterms: "FOB" },
  { shipment_ref: "ALC-2026-0105", shipment_type: "import" as const, status: "pending", origin_port: "JPYOK", destination_port: "USLGB", mode: "ocean", carrier: "ONE", incoterms: "CFR" },
];

const Shipments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const seedPendingShipments = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const rows = SEED_SHIPMENTS.map((s) => ({ ...s, user_id: user.id }));
      const { error } = await supabase.from("shipments").insert(rows);
      if (error) throw error;
      toast({ title: "Seed data created", description: `${rows.length} pending shipments added.` });
      queryClient.invalidateQueries({ queryKey: ["shipments-list"] });
    } catch (err: any) {
      toast({ title: "Seed failed", description: err.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, shipmentId: string, ref: string) => {
    e.stopPropagation();
  };

  const confirmDelete = async (shipmentId: string, ref: string) => {
    setDeletingId(shipmentId);
    try {
      const { error } = await supabase.from("shipments").delete().eq("id", shipmentId);
      if (error) throw error;
      toast({ title: "Shipment deleted", description: `${ref} has been removed.` });
      queryClient.invalidateQueries({ queryKey: ["shipments-list"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("shipment_ref");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["shipments-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, companies(company_name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    if (!shipments) return [];
    const list = shipments.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (typeFilter !== "all" && s.shipment_type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const companyName = ((s.companies as any)?.company_name || "").toLowerCase();
        const ref = (s.shipment_ref || "").toLowerCase();
        const route = `${s.origin_port || ""} ${s.destination_port || ""}`.toLowerCase();
        if (!ref.includes(q) && !companyName.includes(q) && !route.includes(q)) return false;
      }
      return true;
    });

    // Sort
    const getValue = (s: any): string => {
      switch (sortKey) {
        case "shipment_ref": return s.shipment_ref || "";
        case "customer": return (s.companies as any)?.company_name || "";
        case "origin_port": return s.origin_port || "";
        case "shipment_type": return s.shipment_type || "";
        case "status": return s.status || "";
        default: return "";
      }
    };
    list.sort((a, b) => {
      const va = getValue(a).toLowerCase();
      const vb = getValue(b).toLowerCase();
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [shipments, search, statusFilter, typeFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Reset page when filters change
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginatedRows = filtered.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  const hasActiveFilters = search || statusFilter !== "all" || typeFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shipments</h1>
          <p className="text-sm text-muted-foreground">Manage your shipment operations</p>
        </div>
        <Button variant="electric" asChild>
          <Link to="/dashboard/shipments/new"><Plus className="mr-2 h-4 w-4" /> New Shipment</Link>
        </Button>
      </div>

      {/* Bulk Operations */}
      <div className="mb-6">
        <BulkOperationsPanel shipments={shipments || []} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ref, customer, port…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              {hasActiveFilters ? "No shipments match your filters." : "No shipments yet. Create your first shipment to get started."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground p-4 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("shipment_ref")}>
                      <span className="inline-flex items-center">Reference<SortIcon col="shipment_ref" /></span>
                    </th>
                    <th className="text-left font-medium text-muted-foreground p-4 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("customer")}>
                      <span className="inline-flex items-center">Customer<SortIcon col="customer" /></span>
                    </th>
                    <th className="text-left font-medium text-muted-foreground p-4 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("origin_port")}>
                      <span className="inline-flex items-center">Route<SortIcon col="origin_port" /></span>
                    </th>
                    <th className="text-left font-medium text-muted-foreground p-4 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("shipment_type")}>
                      <span className="inline-flex items-center">Type<SortIcon col="shipment_type" /></span>
                    </th>
                    <th className="text-left font-medium text-muted-foreground p-4 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort("status")}>
                      <span className="inline-flex items-center">Status<SortIcon col="status" /></span>
                    </th>
                    <th className="p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((s) => {
                    const companyName = (s.companies as any)?.company_name;
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/shipments/${s.id}`)}>
                        <td className="p-4 font-mono font-medium text-accent">{s.shipment_ref}</td>
                        <td className="p-4 text-foreground">{companyName || <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-4 text-muted-foreground">{s.origin_port || "—"} → {s.destination_port || "—"}</td>
                        <td className="p-4 text-muted-foreground capitalize">{s.shipment_type}</td>
                        <td className="p-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[s.status] || "bg-secondary text-muted-foreground"}`}>
                            {formatStatus(s.status)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent" title="Clone shipment"
                              onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/shipments/new?clone=${s.id}`); }}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            {s.status === "draft" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete draft shipment?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete <strong>{s.shipment_ref}</strong> and all associated data. This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => confirmDelete(s.id, s.shipment_ref)}
                                      disabled={deletingId === s.id}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deletingId === s.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalFiltered > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {(safeCurrentPage - 1) * PAGE_SIZE + 1}–{Math.min(safeCurrentPage * PAGE_SIZE, totalFiltered)} of {totalFiltered}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safeCurrentPage <= 1} onClick={() => setPage(safeCurrentPage - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                  .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "ellipsis" ? (
                      <span key={`e${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                    ) : (
                      <Button key={p} variant={p === safeCurrentPage ? "default" : "ghost"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p as number)}>
                        {p}
                      </Button>
                    )
                  )}
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safeCurrentPage >= totalPages} onClick={() => setPage(safeCurrentPage + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Shipments;
