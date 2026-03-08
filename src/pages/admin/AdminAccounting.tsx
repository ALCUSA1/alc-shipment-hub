import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminFilterBar, FilterConfig } from "@/components/admin/AdminFilterBar";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback } from "react";

const ENTRY_TYPES = ["all", "revenue", "cost"];
const CATEGORIES = ["all", "freight", "handling", "customs", "demurrage_detention", "insurance", "other"];

const filters: FilterConfig[] = [
  { key: "status", label: "Type", options: ENTRY_TYPES.map(s => ({ value: s, label: s === "all" ? "All Types" : s.charAt(0).toUpperCase() + s.slice(1) })) },
  { key: "category", label: "Category", options: CATEGORIES.map(c => ({ value: c, label: c === "all" ? "All Categories" : c.replace(/_/g, " ").replace(/\b\w/g, ch => ch.toUpperCase()) })) },
];

const AdminAccounting = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-accounting"],
    queryFn: async () => {
      const { data: financials, error } = await supabase
        .from("shipment_financials")
        .select("*, shipments(shipment_ref)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return financials || [];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["admin-payments-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("status, amount").limit(500);
      if (error) throw error;
      const completed = (data || []).filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0);
      const pending = (data || []).filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
      const failed = (data || []).filter(p => p.status === "failed").length;
      return { completed, pending, failed };
    },
  });

  const searchFields = useCallback((f: any) => [
    f.description, f.vendor, f.invoice_ref, (f.shipments as any)?.shipment_ref,
  ], []);
  const statusField = useCallback((f: any) => f.entry_type, []);
  const dateField = useCallback((f: any) => f.date || f.created_at, []);

  const { search, setSearch, filterValues, onFilterChange, dateRange, setDateRange, filtered: preFiltered } = useAdminFilters({
    data, searchFields, statusField, dateField,
  });

  const filtered = filterValues.category && filterValues.category !== "all"
    ? preFiltered.filter((f: any) => f.category === filterValues.category)
    : preFiltered;

  const revenue = filtered.filter((f: any) => f.entry_type === "revenue").reduce((s: number, f: any) => s + (f.amount || 0), 0);
  const costs = filtered.filter((f: any) => f.entry_type === "cost").reduce((s: number, f: any) => s + (f.amount || 0), 0);
  const profit = revenue - costs;

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Accounting Overview</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Platform-wide revenue, costs, and payment health</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Revenue", value: `$${revenue.toLocaleString()}`, color: "text-emerald-400" },
          { label: "Total Costs", value: `$${costs.toLocaleString()}`, color: "text-red-400" },
          { label: "Net Profit", value: `$${profit.toLocaleString()}`, color: profit >= 0 ? "text-emerald-400" : "text-red-400" },
          { label: "Failed Payments", value: payments?.failed || 0, color: (payments?.failed || 0) > 0 ? "text-red-400" : "text-emerald-400" },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Payments Collected</h2>
          <p className="text-2xl font-bold text-emerald-400">${(payments?.completed || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <h2 className="text-sm font-semibold text-white mb-1">Payments Pending</h2>
          <p className="text-2xl font-bold text-amber-400">${(payments?.pending || 0).toLocaleString()}</p>
        </div>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search by description, vendor, invoice ref, shipment…"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange
        resultCount={filtered.length}
        resultLabel="entries"
      />

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Shipment</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-xs text-[hsl(220,10%,40%)]">No entries match your filters</td></tr>
              ) : filtered.slice(0, 50).map((f: any) => (
                <tr key={f.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{(f.shipments as any)?.shipment_ref || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)] truncate max-w-[200px]">{f.description}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{f.category.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{f.entry_type}</td>
                  <td className={`px-4 py-3 text-xs text-right font-medium ${f.entry_type === "revenue" ? "text-emerald-400" : "text-red-400"}`}>
                    ${f.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAccounting;
