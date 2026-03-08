import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const tables = [
  "profiles", "shipments", "quotes", "documents", "cargo", "containers",
  "tracking_events", "payments", "edi_messages", "carrier_rates", "companies",
  "company_contacts", "company_documents", "company_activities", "truck_pickups",
  "warehouse_operations", "customs_filings", "customs_milestones", "demurrage_charges",
  "shipment_financials", "shipment_parties", "notifications", "notification_preferences",
  "rate_alerts", "user_roles", "admin_alerts", "ports",
];

const AdminDataExplorer = () => {
  const { data: counts, isLoading } = useQuery({
    queryKey: ["admin-data-explorer"],
    queryFn: async () => {
      const results: Record<string, number> = {};
      const promises = tables.map(async (t) => {
        const { count } = await supabase.from(t as any).select("id", { count: "exact", head: true });
        results[t] = count || 0;
      });
      await Promise.all(promises);
      return results;
    },
  });

  const totalRecords = counts ? Object.values(counts).reduce((s, v) => s + v, 0) : 0;
  const activeTables = counts ? Object.values(counts).filter(v => v > 0).length : 0;

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Database className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Data Explorer</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Record counts and data volume across all platform tables</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Total Records</p>
          <p className="text-2xl font-bold text-white mt-1">{totalRecords.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Tables</p>
          <p className="text-2xl font-bold text-white mt-1">{tables.length}</p>
        </div>
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Active Tables</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeTables}</p>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {tables.sort((a, b) => (counts?.[b] || 0) - (counts?.[a] || 0)).map(t => (
            <div key={t} className="rounded-lg border border-[hsl(220,15%,15%)] bg-[hsl(220,15%,8%)] p-4 hover:border-[hsl(220,15%,20%)] transition-colors">
              <p className="text-xs font-medium text-white truncate">{t}</p>
              <p className="text-xl font-bold text-white mt-1">{(counts?.[t] || 0).toLocaleString()}</p>
              <div className="mt-2 h-1 rounded-full bg-[hsl(220,15%,15%)] overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${totalRecords ? Math.max(2, ((counts?.[t] || 0) / totalRecords) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDataExplorer;
