import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminFilterBar, FilterConfig } from "@/components/admin/AdminFilterBar";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCallback } from "react";
import { Link } from "react-router-dom";

const statusColors: Record<string, string> = {
  prospect: "bg-[hsl(220,10%,20%)] text-[hsl(220,10%,60%)] border-[hsl(220,15%,25%)]",
  pending_compliance: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  inactive: "bg-[hsl(220,10%,15%)] text-[hsl(220,10%,40%)] border-[hsl(220,15%,20%)]",
};

const STATUSES = ["all", "prospect", "pending_compliance", "active", "suspended", "inactive"];

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: STATUSES.map(s => ({ value: s, label: s === "all" ? "All Statuses" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) })) },
];

const AdminCRM = () => {
  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name, status, fmc_license_number, fmc_license_expiry, city, state, country, created_at, email")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const searchFields = useCallback((c: any) => [
    c.company_name, c.email, c.city, c.state, c.fmc_license_number,
  ], []);
  const statusField = useCallback((c: any) => c.status, []);
  const dateField = useCallback((c: any) => c.created_at, []);

  const { search, setSearch, filterValues, onFilterChange, dateRange, setDateRange, filtered } = useAdminFilters({
    data: companies, searchFields, statusField, dateField,
  });

  const counts = {
    active: filtered.filter((c: any) => c.status === "active").length,
    prospect: filtered.filter((c: any) => c.status === "prospect").length,
    pending: filtered.filter((c: any) => c.status === "pending_compliance").length,
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">CRM — All Companies</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Cross-tenant customer & compliance overview</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Active", value: counts.active, color: "text-emerald-400" },
          { label: "Prospects", value: counts.prospect, color: "text-blue-400" },
          { label: "Pending Compliance", value: counts.pending, color: "text-amber-400" },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <AdminFilterBar
        searchPlaceholder="Search by company, email, location, FMC license…"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange
        resultCount={filtered.length}
        resultLabel="companies"
      />

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Company</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">FMC License</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-xs text-[hsl(220,10%,40%)]">No companies match your filters</td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{c.company_name}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{[c.city, c.state, c.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)]">{c.fmc_license_number || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[c.status] || ""}`}>
                      {c.status.replace(/_/g, " ")}
                    </Badge>
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

export default AdminCRM;
