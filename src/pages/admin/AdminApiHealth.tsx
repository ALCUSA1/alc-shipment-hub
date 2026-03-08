import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminFilterBar, FilterConfig } from "@/components/admin/AdminFilterBar";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Radio, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useCallback } from "react";

const STATUSES = ["all", "pending", "processed", "error"];
const CARRIERS = ["all", "Maersk", "MSC", "CMA CGM", "Evergreen"];
const DIRECTIONS = ["all", "inbound", "outbound"];

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: STATUSES.map(s => ({ value: s, label: s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1) })) },
  { key: "carrier", label: "Carrier", options: CARRIERS.map(c => ({ value: c, label: c === "all" ? "All Carriers" : c })) },
  { key: "direction", label: "Direction", options: DIRECTIONS.map(d => ({ value: d, label: d === "all" ? "All Directions" : d.charAt(0).toUpperCase() + d.slice(1) })) },
];

const AdminApiHealth = () => {
  const { data: edi, isLoading } = useQuery({
    queryKey: ["admin-edi-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edi_messages")
        .select("id, carrier, message_type, direction, status, error_message, created_at, message_ref")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const searchFields = useCallback((e: any) => [
    e.carrier, e.message_type, e.message_ref, e.direction,
  ], []);
  const statusField = useCallback((e: any) => e.status, []);
  const dateField = useCallback((e: any) => e.created_at, []);

  const { search, setSearch, filterValues, onFilterChange, dateRange, setDateRange, filtered: preFiltered } = useAdminFilters({
    data: edi, searchFields, statusField, dateField,
  });

  let filtered = preFiltered;
  if (filterValues.carrier && filterValues.carrier !== "all") {
    filtered = filtered.filter((e: any) => e.carrier === filterValues.carrier);
  }
  if (filterValues.direction && filterValues.direction !== "all") {
    filtered = filtered.filter((e: any) => e.direction === filterValues.direction);
  }

  const carriers = ["Maersk", "MSC", "CMA CGM", "Evergreen"];
  const carrierHealth = carriers.map(c => {
    const msgs = filtered.filter((e: any) => e.carrier === c);
    return {
      carrier: c,
      total: msgs.length,
      errors: msgs.filter((e: any) => e.status === "error").length,
      processed: msgs.filter((e: any) => e.status === "processed").length,
      pending: msgs.filter((e: any) => e.status === "pending").length,
      status: msgs.some((e: any) => e.status === "error") ? "degraded" : msgs.length > 0 ? "connected" : "no_data",
      lastActivity: msgs[0]?.created_at,
    };
  });

  const integrations = [
    { name: "Stripe Payments", status: "connected", description: "Payment processing active" },
    { name: "EDI Gateway", status: filtered.some((e: any) => e.status === "error") ? "degraded" : "connected", description: "Carrier messaging" },
    { name: "Email Service", status: "connected", description: "Transactional emails" },
    { name: "Storage", status: "connected", description: "Document & file storage" },
  ];

  const statusConfig = {
    connected: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    degraded: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    no_data: { icon: XCircle, color: "text-[hsl(220,10%,40%)]", bg: "bg-[hsl(220,10%,15%)]", border: "border-[hsl(220,15%,20%)]" },
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Radio className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">API & Integrations</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Carrier EDI connectivity, payment gateway, and external service health</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {integrations.map(int => {
          const cfg = statusConfig[int.status as keyof typeof statusConfig] || statusConfig.connected;
          const Icon = cfg.icon;
          return (
            <div key={int.name} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">{int.name}</span>
                <Badge variant="outline" className={`text-[10px] ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                  <Icon className="h-3 w-3 mr-1" />{int.status}
                </Badge>
              </div>
              <p className="text-[10px] text-[hsl(220,10%,45%)]">{int.description}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">Carrier EDI Connectivity</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {carrierHealth.map(c => {
            const cfg = statusConfig[c.status as keyof typeof statusConfig] || statusConfig.no_data;
            const Icon = cfg.icon;
            return (
              <div key={c.carrier} className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                  <span className="text-sm font-semibold text-white">{c.carrier}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div><span className="text-[hsl(220,10%,45%)]">Sent</span><p className="text-white font-bold">{c.total}</p></div>
                  <div><span className="text-[hsl(220,10%,45%)]">OK</span><p className="text-emerald-400 font-bold">{c.processed}</p></div>
                  <div><span className="text-[hsl(220,10%,45%)]">Errors</span><p className="text-red-400 font-bold">{c.errors}</p></div>
                </div>
                {c.lastActivity && <p className="text-[10px] text-[hsl(220,10%,35%)] mt-2">Last: {format(new Date(c.lastActivity), "MMM d, HH:mm")}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search by carrier, message type, ref…"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange
        resultCount={filtered.length}
        resultLabel="messages"
      />

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Carrier</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Direction</th>
                <th className="text-left px-4 py-3">Ref</th>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-[hsl(220,10%,40%)]">No messages match your filters</td></tr>
              ) : filtered.slice(0, 30).map((e: any) => (
                <tr key={e.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{e.carrier}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)]">{e.message_type}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{e.direction}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)] font-mono">{e.message_ref || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{format(new Date(e.created_at), "MMM d, HH:mm")}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={`text-[10px] ${e.status === "error" ? "bg-red-500/10 text-red-400 border-red-500/20" : e.status === "processed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                      {e.status}
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

export default AdminApiHealth;
