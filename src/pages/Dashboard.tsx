import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, FileText, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const stats = [
  { label: "Active Shipments", value: "12", icon: Package, change: "+3 this week" },
  { label: "Pending Quotes", value: "5", icon: DollarSign, change: "2 awaiting response" },
  { label: "Documents Generated", value: "48", icon: FileText, change: "+8 today" },
  { label: "Recent Updates", value: "7", icon: Clock, change: "Last 24 hours" },
];

const recentShipments = [
  { id: "SHP-2024-001", route: "Shanghai → Los Angeles", status: "In Transit", date: "Mar 5, 2026" },
  { id: "SHP-2024-002", route: "Rotterdam → New York", status: "Booking Confirmed", date: "Mar 4, 2026" },
  { id: "SHP-2024-003", route: "Singapore → Dubai", status: "Cargo Received", date: "Mar 3, 2026" },
  { id: "SHP-2024-004", route: "Hamburg → Santos", status: "Delivered", date: "Mar 1, 2026" },
];

const statusColor: Record<string, string> = {
  "In Transit": "bg-accent/10 text-accent",
  "Booking Confirmed": "bg-yellow-100 text-yellow-700",
  "Cargo Received": "bg-blue-100 text-blue-700",
  "Delivered": "bg-green-100 text-green-700",
};

const Dashboard = () => (
  <DashboardLayout>
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your logistics operations overview</p>
      </div>
      <Button variant="electric" asChild>
        <Link to="/dashboard/shipments/new">New Shipment <ArrowRight className="ml-2 h-4 w-4" /></Link>
      </Button>
    </div>

    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            <s.icon className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{s.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Shipments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentShipments.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/80 transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono font-medium text-foreground">{s.id}</span>
                <span className="text-sm text-muted-foreground">{s.route}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[s.status] || "bg-secondary text-muted-foreground"}`}>
                  {s.status}
                </span>
                <span className="text-xs text-muted-foreground">{s.date}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </DashboardLayout>
);

export default Dashboard;
