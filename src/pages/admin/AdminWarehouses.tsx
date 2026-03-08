import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Warehouse } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const AdminWarehouses = () => {
  const { data: ops, isLoading } = useQuery({
    queryKey: ["admin-all-warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_operations")
        .select("*, shipments(shipment_ref)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

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
          { label: "Pending", value: ops?.filter(o => o.status === "pending").length || 0, color: "text-amber-400" },
          { label: "In Storage", value: ops?.filter(o => o.status === "in_storage").length || 0, color: "text-blue-400" },
          { label: "Released", value: ops?.filter(o => o.status === "released").length || 0, color: "text-emerald-400" },
        ].map(m => (
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
                <th className="text-left px-4 py-3">Warehouse</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Cargo</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {ops?.map(o => (
                <tr key={o.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                  <td className="px-4 py-3 text-xs font-medium text-white">{(o.shipments as any)?.shipment_ref || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)]">{o.warehouse_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{o.operation_type}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)] truncate max-w-[200px]">{o.cargo_description || "—"}</td>
                  <td className="px-4 py-3 text-center"><Badge variant="outline" className="text-[10px]">{o.status}</Badge></td>
                </tr>
              ))}
              {ops?.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-[hsl(220,10%,40%)]">No warehouse operations</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminWarehouses;
