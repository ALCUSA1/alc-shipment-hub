import { ForwarderLayout } from "@/components/forwarder/ForwarderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Ship, Users, FileText, ClipboardList, DollarSign,
  TrendingUp, AlertTriangle, ArrowRight,
} from "lucide-react";

const ForwarderDashboard = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["forwarder-stats", user?.id],
    queryFn: async () => {
      const [customersRes, shipmentsRes, quotesRes] = await Promise.all([
        supabase
          .from("forwarder_customers")
          .select("id", { count: "exact", head: true })
          .eq("forwarder_user_id", user!.id),
        supabase
          .from("shipments")
          .select("id, status", { count: "exact" })
          .eq("user_id", user!.id),
        supabase
          .from("quotes")
          .select("id, status, amount")
          .eq("user_id", user!.id),
      ]);

      const shipments = shipmentsRes.data || [];
      const activeShipments = shipments.filter(
        (s) => !["delivered", "completed", "cancelled"].includes(s.status)
      ).length;
      const pendingDocs = 0; // placeholder
      const quotes = quotesRes.data || [];
      const pendingQuotes = quotes.filter((q) => q.status === "pending").length;
      const revenue = quotes
        .filter((q) => q.status === "accepted")
        .reduce((sum, q) => sum + (q.amount || 0), 0);

      return {
        totalCustomers: customersRes.count || 0,
        activeShipments,
        pendingQuotes,
        pendingDocs,
        totalShipments: shipments.length,
        revenue,
      };
    },
    enabled: !!user,
  });

  const statCards = [
    {
      title: "Customer Accounts",
      value: stats?.totalCustomers ?? 0,
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent/10",
      href: "/forwarder/customers",
    },
    {
      title: "Active Shipments",
      value: stats?.activeShipments ?? 0,
      icon: Ship,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      href: "/forwarder/shipments",
    },
    {
      title: "Pending Quotes",
      value: stats?.pendingQuotes ?? 0,
      icon: ClipboardList,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      href: "/forwarder/quotes",
    },
    {
      title: "Revenue (Accepted)",
      value: `$${(stats?.revenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <ForwarderLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Forwarder Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage shipment requests, customers, and bookings
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
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

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link to="/forwarder/customers">
              <Button variant="electric">
                <Users className="h-4 w-4 mr-2" />
                Invite Customer
              </Button>
            </Link>
            <Link to="/forwarder/shipments">
              <Button variant="outline">
                <Ship className="h-4 w-4 mr-2" />
                View Shipments
              </Button>
            </Link>
            <Link to="/forwarder/quotes">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Quote Queue
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.pendingQuotes ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {stats?.pendingQuotes} quotes awaiting response
                  </span>
                  <Link to="/forwarder/quotes">
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
              {(stats?.pendingDocs ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {stats?.pendingDocs} documents pending validation
                  </span>
                  <Link to="/forwarder/documents">
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
              {(stats?.pendingQuotes ?? 0) === 0 && (stats?.pendingDocs ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">No pending actions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ForwarderLayout>
  );
};

export default ForwarderDashboard;
