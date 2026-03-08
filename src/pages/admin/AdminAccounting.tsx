import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminAccounting = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-accounting"],
    queryFn: async () => {
      const { data: financials, error } = await supabase
        .from("shipment_financials")
        .select("entry_type, category, amount, currency, description, shipments(shipment_ref)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const revenue = (financials || []).filter(f => f.entry_type === "revenue").reduce((s, f) => s + (f.amount || 0), 0);
      const costs = (financials || []).filter(f => f.entry_type === "cost").reduce((s, f) => s + (f.amount || 0), 0);

      return { financials: financials || [], revenue, costs, profit: revenue - costs };
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

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Accounting Overview</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Platform-wide revenue, costs, and payment health</p>
      </div>

      {isLoading ? <Skeleton className="h-32 w-full bg-[hsl(220,15%,15%)]" /> : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Revenue", value: `$${(data?.revenue || 0).toLocaleString()}`, color: "text-emerald-400" },
              { label: "Total Costs", value: `$${(data?.costs || 0).toLocaleString()}`, color: "text-red-400" },
              { label: "Net Profit", value: `$${(data?.profit || 0).toLocaleString()}`, color: (data?.profit || 0) >= 0 ? "text-emerald-400" : "text-red-400" },
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

          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[hsl(220,15%,13%)]">
              <h2 className="text-sm font-semibold text-white">Recent Financial Entries</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                  <th className="text-left px-4 py-3">Shipment</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data?.financials.slice(0, 20).map(f => (
                  <tr key={f.description + Math.random()} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                    <td className="px-4 py-3 text-xs font-medium text-white">{(f.shipments as any)?.shipment_ref || "—"}</td>
                    <td className="px-4 py-3 text-xs text-[hsl(220,10%,60%)] truncate max-w-[200px]">{f.description}</td>
                    <td className="px-4 py-3 text-xs text-[hsl(220,10%,50%)]">{f.entry_type}</td>
                    <td className={`px-4 py-3 text-xs text-right font-medium ${f.entry_type === "revenue" ? "text-emerald-400" : "text-red-400"}`}>
                      ${f.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminAccounting;
