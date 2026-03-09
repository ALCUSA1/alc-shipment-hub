import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package, FileText, DollarSign, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TruckingDashboard = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["trucking-stats", user?.id],
    queryFn: async () => {
      const [shipmentsRes, quotesRes] = await Promise.all([
        supabase.from("shipments").select("id", { count: "exact", head: true }),
        supabase.from("trucking_quotes").select("*").eq("trucker_user_id", user!.id),
      ]);

      const quotes = quotesRes.data || [];
      const submitted = quotes.filter((q) => q.status === "submitted").length;
      const accepted = quotes.filter((q) => q.status === "accepted").length;
      const totalValue = quotes
        .filter((q) => q.status === "accepted")
        .reduce((sum, q) => sum + Number(q.price), 0);

      return {
        availableOrders: shipmentsRes.count || 0,
        submittedQuotes: submitted,
        acceptedQuotes: accepted,
        totalValue,
      };
    },
    enabled: !!user,
  });

  const statCards = [
    {
      title: "Available Orders",
      value: stats?.availableOrders ?? 0,
      icon: Package,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Submitted Quotes",
      value: stats?.submittedQuotes ?? 0,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Accepted Quotes",
      value: stats?.acceptedQuotes ?? 0,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Total Earnings",
      value: `$${(stats?.totalValue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  return (
    <TruckingLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome to the Carrier Portal</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Link to="/trucking/orders">
            <Button variant="electric">
              <Package className="h-4 w-4 mr-2" />
              Browse Available Orders
            </Button>
          </Link>
          <Link to="/trucking/quotes">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              View My Quotes
            </Button>
          </Link>
        </CardContent>
      </Card>
    </TruckingLayout>
  );
};

export default TruckingDashboard;
