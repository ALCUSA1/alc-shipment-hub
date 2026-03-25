import { TruckingLayout } from "@/components/trucking/TruckingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package, FileText, DollarSign, TrendingUp, Clock, AlertTriangle, Truck, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      title: "Active Orders",
      value: stats?.acceptedQuotes ?? 0,
      icon: Truck,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Available Orders",
      value: stats?.availableOrders ?? 0,
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pending Quotes",
      value: stats?.submittedQuotes ?? 0,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Total Earnings",
      value: `$${(stats?.totalValue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  // Demo upcoming jobs
  const upcomingJobs = [
    { id: "1", ref: "TRK-2026-001", type: "Pickup", location: "Port Newark, NJ", time: "Today 08:00 AM", status: "confirmed" },
    { id: "2", ref: "TRK-2026-002", type: "Delivery", location: "Edison, NJ", time: "Today 11:30 AM", status: "in_transit" },
    { id: "3", ref: "TRK-2026-003", type: "Pickup", location: "Port Elizabeth, NJ", time: "Tomorrow 09:00 AM", status: "scheduled" },
  ];

  const statusStyle: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    in_transit: "bg-yellow-100 text-yellow-700",
    scheduled: "bg-blue-100 text-blue-700",
  };

  return (
    <TruckingLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome to the Carrier Portal — your work queue at a glance</p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Jobs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Upcoming Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${job.type === "Pickup" ? "bg-blue-500/10" : "bg-green-500/10"}`}>
                      <Truck className={`h-4 w-4 ${job.type === "Pickup" ? "text-blue-500" : "text-green-500"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{job.type} · {job.ref}</p>
                      <p className="text-xs text-muted-foreground">{job.location} · {job.time}</p>
                    </div>
                  </div>
                  <Badge className={statusStyle[job.status] || "bg-secondary"} variant="secondary">
                    {job.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/trucking/orders" className="block">
              <Button variant="electric" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Browse Available Orders
              </Button>
            </Link>
            <Link to="/trucking/schedule" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                View Schedule
              </Button>
            </Link>
            <Link to="/trucking/documents" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            </Link>
            <Link to="/trucking/team" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Manage Team
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </TruckingLayout>
  );
};

export default TruckingDashboard;
