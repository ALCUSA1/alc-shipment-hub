import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STAGES = ["draft", "pending", "accepted", "booked", "in_transit", "arrived", "delivered", "completed", "cancelled"];

const stageColors: Record<string, string> = {
  draft: "border-[hsl(220,15%,25%)] bg-[hsl(220,15%,12%)]",
  pending: "border-amber-500/30 bg-amber-500/5",
  accepted: "border-blue-500/30 bg-blue-500/5",
  booked: "border-indigo-500/30 bg-indigo-500/5",
  in_transit: "border-cyan-500/30 bg-cyan-500/5",
  arrived: "border-emerald-500/30 bg-emerald-500/5",
  delivered: "border-green-500/30 bg-green-500/5",
  completed: "border-green-600/30 bg-green-600/5",
  cancelled: "border-red-500/30 bg-red-500/5",
};

const AdminPipeline = () => {
  const { data: shipments, isLoading } = useQuery({
    queryKey: ["admin-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, status, origin_port, destination_port, etd, eta, user_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: quotes } = useQuery({
    queryKey: ["admin-pipeline-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, status, customer_name, origin_port, destination_port, customer_price, currency")
        .in("status", ["pending", "sent"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const grouped = STAGES.reduce<Record<string, typeof shipments>>((acc, s) => {
    acc[s] = (shipments || []).filter((sh) => sh.status === s);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Cross-tenant view of all transactions across stages</p>
      </div>

      {/* Pending Quotes */}
      {(quotes?.length ?? 0) > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h2 className="text-sm font-semibold text-amber-400 mb-3">Pending Quotes ({quotes?.length})</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quotes?.slice(0, 6).map((q) => (
              <div key={q.id} className="rounded-lg border border-[hsl(220,15%,15%)] bg-[hsl(220,18%,10%)] p-3">
                <p className="text-xs font-medium text-white truncate">{q.customer_name || "—"}</p>
                <p className="text-[10px] text-[hsl(220,10%,45%)] mt-0.5">{q.origin_port} → {q.destination_port}</p>
                {q.customer_price && <p className="text-xs font-semibold text-amber-400 mt-1">${q.customer_price.toLocaleString()} {q.currency}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full bg-[hsl(220,15%,15%)]" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {STAGES.map((stage) => (
            <div key={stage} className={`rounded-xl border p-4 ${stageColors[stage] || stageColors.draft}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  {stage.replace("_", " ")}
                </h3>
                <span className="text-[10px] font-bold bg-white/10 text-white px-2 py-0.5 rounded-full">
                  {grouped[stage]?.length || 0}
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {grouped[stage]?.slice(0, 10).map((sh) => (
                  <div key={sh.id} className="rounded-lg bg-[hsl(220,18%,10%)] border border-[hsl(220,15%,15%)] p-2.5">
                    <p className="text-xs font-medium text-white">{sh.shipment_ref}</p>
                    <p className="text-[10px] text-[hsl(220,10%,45%)] mt-0.5 truncate">
                      {sh.origin_port || "—"} → {sh.destination_port || "—"}
                    </p>
                  </div>
                ))}
                {(grouped[stage]?.length || 0) === 0 && (
                  <p className="text-[10px] text-[hsl(220,10%,35%)] text-center py-4">No shipments</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPipeline;
