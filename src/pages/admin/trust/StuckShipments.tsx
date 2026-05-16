import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StuckShipments() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("admin_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows(
        (data || []).filter(
          (a: any) =>
            a.alert_type?.includes("stuck") || a.alert_type?.includes("shipment_stalled")
        )
      );
      setLoading(false);
    })();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-semibold">Stuck Shipments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Shipments flagged by the system as stalled or overdue for a milestone update.
          </p>
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Severity</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Message</th>
                <th className="text-left px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No stuck shipments.</td></tr>
              ) : (
                rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <Badge variant={r.severity === "high" ? "destructive" : "secondary"}>
                        {r.severity || "info"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{r.alert_type}</td>
                    <td className="px-4 py-2">{r.message || r.title || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
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
