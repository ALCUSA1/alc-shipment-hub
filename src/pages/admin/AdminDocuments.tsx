import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminFilterBar, FilterConfig } from "@/components/admin/AdminFilterBar";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { FileCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useCallback } from "react";

const STATUSES = ["all", "pending", "approved", "rejected"];
import { getDocLabel, DOC_TYPE_LABELS } from "@/lib/document-types";

const DOC_TYPES = ["all", ...Object.keys(DOC_TYPE_LABELS)];

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: STATUSES.map(s => ({ value: s, label: s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1) })) },
  { key: "docType", label: "Doc Type", options: DOC_TYPES.map(t => ({ value: t, label: t === "all" ? "All Types" : getDocLabel(t) })) },
];

const AdminDocuments = () => {
  const { data: docs, isLoading } = useQuery({
    queryKey: ["admin-all-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, shipments(shipment_ref)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const searchFields = useCallback((d: any) => [
    d.doc_type, (d.shipments as any)?.shipment_ref,
  ], []);
  const statusField = useCallback((d: any) => d.status, []);
  const dateField = useCallback((d: any) => d.created_at, []);

  const { search, setSearch, filterValues, onFilterChange, dateRange, setDateRange, filtered: preFiltered } = useAdminFilters({
    data: docs, searchFields, statusField, dateField,
  });

  const filtered = filterValues.docType && filterValues.docType !== "all"
    ? preFiltered.filter((d: any) => d.doc_type === filterValues.docType)
    : preFiltered;

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FileCheck className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">All Documents</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Cross-tenant document tracking — BLs, invoices, customs forms</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total", value: filtered.length, color: "text-white" },
          { label: "Pending", value: filtered.filter((d: any) => d.status === "pending").length, color: "text-amber-400" },
          { label: "Approved", value: filtered.filter((d: any) => d.status === "approved").length, color: "text-emerald-400" },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <AdminFilterBar
        searchPlaceholder="Search by document type, shipment ref…"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange
        resultCount={filtered.length}
        resultLabel="documents"
      />

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Shipment</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-xs text-[hsl(220,10%,40%)]">No documents match your filters</td></tr>
              ) : filtered.map((d: any) => (
                <tr key={d.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{(d.shipments as any)?.shipment_ref || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)]">{d.doc_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{format(new Date(d.created_at), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3 text-center"><Badge variant="outline" className="text-[10px]">{d.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDocuments;
