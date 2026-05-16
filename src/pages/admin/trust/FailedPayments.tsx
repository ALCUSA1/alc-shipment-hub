import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

type Row = {
  user_id: string | null;
  count: number;
  total: number;
  last_at: string | null;
};

export default function FailedPayments() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("payments")
        .select("user_id, amount, created_at")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(1000);
      const map = new Map<string, Row>();
      for (const p of (data || []) as any[]) {
        const k = p.user_id || "unknown";
        const cur = map.get(k) || { user_id: p.user_id, count: 0, total: 0, last_at: null };
        cur.count += 1;
        cur.total += Number(p.amount || 0);
        if (!cur.last_at || p.created_at > cur.last_at) cur.last_at = p.created_at;
        map.set(k, cur);
      }
      setRows(Array.from(map.values()).sort((a, b) => b.count - a.count));
      setLoading(false);
    })();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-semibold">Failed Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Users with declined or failed payment attempts. Investigate repeats for fraud signals.
          </p>
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">User ID</th>
                <th className="text-right px-4 py-2 font-medium">Failures</th>
                <th className="text-right px-4 py-2 font-medium">Total $</th>
                <th className="text-left px-4 py-2 font-medium">Last attempt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No failed payments.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.user_id || "unknown"} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">{r.user_id ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{r.count}</td>
                    <td className="px-4 py-2 text-right">${r.total.toFixed(2)}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {r.last_at ? new Date(r.last_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </AdminLayout>
  );
}
