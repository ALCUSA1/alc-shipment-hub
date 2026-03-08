import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminRateTrends = () => {
  const { data: rates, isLoading } = useQuery({
    queryKey: ["admin-carrier-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carrier_rates")
        .select("*")
        .order("valid_from", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["admin-rate-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rate_alerts").select("*, profiles(full_name)").limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const carriers = [...new Set(rates?.map(r => r.carrier) || [])];
  const avgRate = rates?.length ? Math.round(rates.reduce((s, r) => s + r.base_rate, 0) / rates.length) : 0;

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Rate Trends & Alerts</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Carrier rate monitoring and customer alert subscriptions</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Active Carriers</p>
          <p className="text-2xl font-bold text-white mt-1">{carriers.length}</p>
        </div>
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Avg Base Rate</p>
          <p className="text-2xl font-bold text-white mt-1">${avgRate.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">Active Rate Alerts</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{alerts?.filter(a => a.is_active).length || 0}</p>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[hsl(220,15%,13%)]">
            <h2 className="text-sm font-semibold text-white">Latest Carrier Rates</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Carrier</th>
                <th className="text-left px-4 py-3">Route</th>
                <th className="text-left px-4 py-3">Container</th>
                <th className="text-right px-4 py-3">Base Rate</th>
                <th className="text-left px-4 py-3">Valid</th>
              </tr>
            </thead>
            <tbody>
              {rates?.map(r => (
                <tr key={r.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{r.carrier}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)]">{r.origin_port} → {r.destination_port}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{r.container_type}</td>
                  <td className="px-4 py-3 text-xs text-right font-medium text-white">${r.base_rate.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{r.valid_from} — {r.valid_until}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminRateTrends;
