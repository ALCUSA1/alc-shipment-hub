import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminFilterBar, FilterConfig } from "@/components/admin/AdminFilterBar";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Package, ArrowRight, Eye } from "lucide-react";
import { useMemo, useCallback } from "react";
import { Link } from "react-router-dom";

const STATUSES = ["all", "draft", "booked", "in_transit", "arrived", "delivered", "cancelled"];

const statusColors: Record<string, string> = {
  draft: "bg-[hsl(220,15%,20%)] text-[hsl(220,10%,55%)]",
  pending: "bg-amber-500/15 text-amber-400",
  booked: "bg-blue-500/15 text-blue-400",
  in_transit: "bg-indigo-500/15 text-indigo-400",
  arrived: "bg-purple-500/15 text-purple-400",
  delivered: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
};

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: STATUSES.map(s => ({ value: s, label: s === "all" ? "All Statuses" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) })) },
];

const AdminShipments = () => {
  const { data: shipments, isLoading } = useQuery({
    queryKey: ["admin-all-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, status, origin_port, destination_port, vessel, etd, eta, created_at, updated_at, user_id, companies(company_name)")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, company_name");
      if (error) throw error;
      return data || [];
    },
  });

  const profileMap = useMemo(() => {
    const map: Record<string, { name: string; company: string }> = {};
    for (const p of profiles || []) {
      map[p.user_id] = { name: p.full_name || "Unknown", company: p.company_name || "—" };
    }
    return map;
  }, [profiles]);

  const searchFields = useCallback((s: any) => [
    s.shipment_ref, s.origin_port, s.destination_port, s.vessel,
    profileMap[s.user_id]?.name, profileMap[s.user_id]?.company,
    (s as any).companies?.company_name,
  ], [profileMap]);
  const statusField = useCallback((s: any) => s.status, []);
  const dateField = useCallback((s: any) => s.created_at, []);

  const { search, setSearch, filterValues, onFilterChange, dateRange, setDateRange, filtered } = useAdminFilters({
    data: shipments, searchFields, statusField, dateField,
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-5 w-5 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Shipment Management</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Search, view, and manage any customer's shipments</p>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search by ref, port, vessel, customer…"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange
        resultCount={filtered.length}
        resultLabel="shipments"
      />

      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full bg-[hsl(220,15%,15%)]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[hsl(220,10%,35%)] text-center py-12">No shipments match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(220,15%,15%)]">
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Ref</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Owner</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Route</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Vessel</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Status</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">ETD / ETA</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => {
                  const owner = profileMap[s.user_id];
                  return (
                    <tr key={s.id} className="border-b border-[hsl(220,15%,12%)] last:border-0 hover:bg-[hsl(220,15%,12%)] transition-colors">
                      <td className="p-4 font-mono font-medium text-blue-400">{s.shipment_ref}</td>
                      <td className="p-4">
                        <div>
                          <p className="text-white text-xs font-medium">{owner?.name || "Unknown"}</p>
                          <p className="text-[10px] text-[hsl(220,10%,40%)]">{(s as any).companies?.company_name || owner?.company || "—"}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[hsl(220,10%,55%)]">
                          {s.origin_port || "—"} <ArrowRight className="inline h-3 w-3 mx-1 text-[hsl(220,10%,30%)]" /> {s.destination_port || "—"}
                        </span>
                      </td>
                      <td className="p-4 text-[hsl(220,10%,55%)]">{s.vessel || "—"}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className={`text-[10px] border-0 ${statusColors[s.status] || statusColors.draft}`}>
                          {s.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-[hsl(220,10%,45%)]">
                        {s.etd ? format(new Date(s.etd), "MMM d") : "—"} / {s.eta ? format(new Date(s.eta), "MMM d") : "—"}
                      </td>
                      <td className="p-4">
                        <Link
                          to={`/admin/shipments/${s.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminShipments;
