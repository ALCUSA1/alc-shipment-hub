import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ShieldAlert, UserPlus, CreditCard, Ban } from "lucide-react";
import { Link } from "react-router-dom";

export function FraudSignalsWidget() {
  const [stats, setStats] = useState({ newAccounts: 0, failed: 0, blocked: 0, alerts: 0 });

  useEffect(() => {
    (async () => {
      const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      const [a, b, c, d] = await Promise.all([
        (supabase as any).from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since24),
        (supabase as any).from("payments").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since7d),
        (supabase as any).from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "blocked"),
        (supabase as any).from("admin_alerts").select("id", { count: "exact", head: true }).gte("created_at", since24),
      ]);

      setStats({
        newAccounts: a.count || 0,
        failed: b.count || 0,
        blocked: c.count || 0,
        alerts: d.count || 0,
      });
    })();
  }, []);

  const items = [
    { label: "New accounts (24h)", value: stats.newAccounts, icon: UserPlus, to: "/admin/users" },
    { label: "Failed payments (7d)", value: stats.failed, icon: CreditCard, to: "/admin/trust/failed-payments" },
    { label: "Blocked users", value: stats.blocked, icon: Ban, to: "/admin/trust/blocked" },
    { label: "Alerts (24h)", value: stats.alerts, icon: ShieldAlert, to: "/admin/trust/alerts" },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Fraud signals</h2>
        <Link to="/admin/trust/alerts" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              to={it.to}
              className="rounded-md border border-border p-3 hover:bg-muted transition-colors"
            >
              <Icon className="h-4 w-4 text-muted-foreground mb-2" />
              <div className="text-2xl font-semibold text-foreground">{it.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{it.label}</div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
