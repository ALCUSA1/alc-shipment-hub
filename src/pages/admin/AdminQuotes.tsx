import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  expired: "bg-[hsl(220,10%,25%)]/50 text-[hsl(220,10%,50%)] border-[hsl(220,15%,20%)]",
};

const AdminQuotes = () => {
  const { data: quotes, isLoading } = useQuery({
    queryKey: ["admin-all-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, shipments(shipment_ref)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const totals = {
    pending: quotes?.filter(q => q.status === "pending").length || 0,
    accepted: quotes?.filter(q => q.status === "accepted").length || 0,
    totalValue: quotes?.reduce((sum, q) => sum + (q.customer_price || 0), 0) || 0,
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">All Quotes</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Cross-tenant quote management</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pending", value: totals.pending, color: "text-amber-400" },
          { label: "Accepted", value: totals.accepted, color: "text-emerald-400" },
          { label: "Total Value", value: `$${totals.totalValue.toLocaleString()}`, color: "text-white" },
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
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Route</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-right px-4 py-3">Margin</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes?.map((q) => (
                <tr key={q.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)] transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-white">{(q.shipments as any)?.shipment_ref || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)]">{q.customer_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{q.origin_port} → {q.destination_port}</td>
                  <td className="px-4 py-3 text-xs text-right text-white font-medium">${(q.customer_price || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-right text-emerald-400">${(q.margin_value || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[q.status] || ""}`}>{q.status}</Badge>
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

export default AdminQuotes;
