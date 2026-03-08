import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useCallback } from "react";
import { FilterConfig } from "@/components/admin/AdminFilterBar";

const TYPES = ["all", "rate_alert", "shipment_update", "demurrage_alert", "payment"];
const READ_STATUS = ["all", "unread", "read"];

const filters: FilterConfig[] = [
  { key: "status", label: "Type", options: TYPES.map(t => ({ value: t, label: t === "all" ? "All Types" : t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) })) },
  { key: "read", label: "Read", options: READ_STATUS.map(r => ({ value: r, label: r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1) })) },
];

const AdminNotifications = () => {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["admin-all-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: prefs } = useQuery({
    queryKey: ["admin-notification-prefs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_preferences").select("*").limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const searchFields = useCallback((n: any) => [n.title, n.message, n.type], []);
  const statusField = useCallback((n: any) => n.type, []);
  const dateField = useCallback((n: any) => n.created_at, []);

  const { search, setSearch, filterValues, onFilterChange, dateRange, setDateRange, filtered: preFiltered } = useAdminFilters({
    data: notifications, searchFields, statusField, dateField,
  });

  let filtered = preFiltered;
  if (filterValues.read === "unread") filtered = filtered.filter((n: any) => !n.is_read);
  else if (filterValues.read === "read") filtered = filtered.filter((n: any) => n.is_read);

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Platform notification log and user preference overview</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Total Notifications</p>
          <p className="text-2xl font-bold text-white mt-1">{notifications?.length || 0}</p>
        </div>
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Unread</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{notifications?.filter((n: any) => !n.is_read).length || 0}</p>
        </div>
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Users with Prefs</p>
          <p className="text-2xl font-bold text-white mt-1">{prefs?.length || 0}</p>
        </div>
      </div>

      <AdminFilterBar
        searchPlaceholder="Search by title, message, type…"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange
        resultCount={filtered.length}
        resultLabel="notifications"
      />

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-center px-4 py-3">Read</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-xs text-[hsl(220,10%,40%)]">No notifications match your filters</td></tr>
              ) : filtered.map((n: any) => (
                <tr key={n.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{n.title}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{n.type}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{format(new Date(n.created_at), "MMM d, HH:mm")}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${n.is_read ? "bg-[hsl(220,10%,30%)]" : "bg-amber-400"}`} />
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

export default AdminNotifications;
