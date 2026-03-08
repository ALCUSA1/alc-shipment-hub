import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const AdminTrucking = () => {
  const { data: pickups, isLoading } = useQuery({
    queryKey: ["admin-all-trucking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("truck_pickups")
        .select("*, shipments(shipment_ref, user_id)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const statusCounts = {
    scheduled: pickups?.filter(p => p.status === "scheduled").length || 0,
    in_progress: pickups?.filter(p => p.status === "in_progress").length || 0,
    completed: pickups?.filter(p => p.status === "completed").length || 0,
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Truck className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">All Trucking</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Cross-tenant truck pickup operations</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Scheduled", value: statusCounts.scheduled, color: "text-amber-400" },
          { label: "In Progress", value: statusCounts.in_progress, color: "text-blue-400" },
          { label: "Completed", value: statusCounts.completed, color: "text-emerald-400" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" /> : (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                <th className="text-left px-4 py-3">Shipment</th>
                <th className="text-left px-4 py-3">Pickup</th>
                <th className="text-left px-4 py-3">Delivery</th>
                <th className="text-left px-4 py-3">Driver</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {pickups?.map((p) => (
                <tr key={p.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{(p.shipments as any)?.shipment_ref || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)] truncate max-w-[150px]">{p.pickup_location || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)] truncate max-w-[150px]">{p.delivery_location || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)]">{p.driver_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{p.pickup_date || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                  </td>
                </tr>
              ))}
              {pickups?.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-[hsl(220,10%,40%)]">No truck pickups found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminTrucking;
