import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminFilterBar, FilterConfig } from "@/components/admin/AdminFilterBar";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Warehouse } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCallback } from "react";

const STATUSES = ["all", "pending", "in_storage", "released", "completed"];
const TYPES = ["all", "receiving", "storage", "release"];

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: STATUSES.map(s => ({ value: s, label: s === "all" ? "All Statuses" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) })) },
  { key: "type", label: "Type", options: TYPES.map(t => ({ value: t, label: t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1) })) },
];

const AdminWarehouses = () => {
  const { data: ops, isLoading } = useQuery({
    queryKey: ["admin-all-warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_operations")
        .select("*, shipments(shipment_ref)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const searchFields = useCallback((o: any) => [
    o.warehouse_name, o.warehouse_location, o.cargo_description,
    (o.shipments as any)?.shipment_ref,
  ], []);
  const statusField = useCallback((o: any) => o.status, []);
  const dateField = useCallback((o: any) => o.created_at, []);

  const { search, setSearch, filterValues, onFilterChange, dateRange, setDateRange, filtered: preFiltered } = useAdminFilters({
    data: ops, searchFields, statusField, dateField,
  });

  const filtered = filterValues.type && filterValues.type !== "all"
    ? preFiltered.filter((o: any) => o.operation_type === filterValues.type)
    : preFiltered;

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Warehouse className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">All Warehouse Operations</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Cross-tenant warehouse receiving, storage & release</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pending", value: filtered.filter((o: any) => o.status === "pending").length, color: "text-amber-400" },
          { label: "In Storage", value: filtered.filter((o: any) => o.status === "in_storage").length, color: "text-blue-400" },
          { label: "Released", value: filtered.filter((o: any) => o.status === "released").length, color: "text-emerald-400" },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <AdminFilterBar
        searchPlaceholder="Search by warehouse, cargo, shipment ref…"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange
        resultCount={filtered.length}
        resultLabel="operations"
      />

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Shipment</th>
                <th className="text-left px-4 py-3">Warehouse</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Cargo</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-xs text-[hsl(220,10%,40%)]">No operations match your filters</td></tr>
              ) : filtered.map((o: any) => (
                <tr key={o.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{(o.shipments as any)?.shipment_ref || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)]">{o.warehouse_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{o.operation_type}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)] truncate max-w-[200px]">{o.cargo_description || "—"}</td>
                  <td className="px-4 py-3 text-center"><Badge variant="outline" className="text-[10px]">{o.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminWarehouses;
