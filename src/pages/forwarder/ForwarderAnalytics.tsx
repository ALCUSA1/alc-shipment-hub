import { ForwarderLayout } from "@/components/forwarder/ForwarderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, TrendingUp, Package, DollarSign } from "lucide-react";

const ForwarderAnalytics = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["forwarder-analytics", user?.id],
    queryFn: async () => {
      const [shipmentsRes, quotesRes, customersRes] = await Promise.all([
        supabase.from("shipments").select("id, status, created_at").eq("user_id", user!.id),
        supabase.from("quotes").select("amount, status").eq("user_id", user!.id),
        supabase.from("forwarder_customers").select("id", { count: "exact", head: true }).eq("forwarder_user_id", user!.id),
      ]);
      const shipments = shipmentsRes.data || [];
      const quotes = quotesRes.data || [];
      return {
        totalShipments: shipments.length,
        deliveredShipments: shipments.filter((s) => s.status === "delivered" || s.status === "completed").length,
        totalRevenue: quotes.filter((q) => q.status === "accepted").reduce((s, q) => s + (q.amount || 0), 0),
        totalCustomers: customersRes.count || 0,
        conversionRate: quotes.length > 0
          ? Math.round((quotes.filter((q) => q.status === "accepted").length / quotes.length) * 100)
          : 0,
      };
    },
    enabled: !!user,
  });

  const metrics = [
    { title: "Total Shipments", value: stats?.totalShipments ?? 0, icon: Package, color: "text-accent" },
    { title: "Completed", value: stats?.deliveredShipments ?? 0, icon: TrendingUp, color: "text-green-500" },
    { title: "Total Revenue", value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-blue-500" },
    { title: "Quote Conversion", value: `${stats?.conversionRate ?? 0}%`, icon: BarChart3, color: "text-yellow-500" },
  ];

  return (
    <ForwarderLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance overview and business metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {metrics.map((m) => (
          <Card key={m.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{m.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{m.value}</p>
                </div>
                <m.icon className={`h-8 w-8 ${m.color} opacity-20`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Detailed analytics charts coming soon. Currently showing {stats?.totalCustomers ?? 0} active customer accounts.
          </p>
        </CardContent>
      </Card>
    </ForwarderLayout>
  );
};

export default ForwarderAnalytics;
