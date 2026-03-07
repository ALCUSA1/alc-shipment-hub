import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

const shipments = [
  { id: "SHP-2024-001", origin: "Shanghai", destination: "Los Angeles", status: "In Transit", commodity: "Electronics", containers: "2x40HC" },
  { id: "SHP-2024-002", origin: "Rotterdam", destination: "New York", status: "Booking Confirmed", commodity: "Machinery", containers: "1x20GP" },
  { id: "SHP-2024-003", origin: "Singapore", destination: "Dubai", status: "Cargo Received", commodity: "Textiles", containers: "3x40HC" },
  { id: "SHP-2024-004", origin: "Hamburg", destination: "Santos", status: "Delivered", commodity: "Auto Parts", containers: "1x40HC" },
  { id: "SHP-2024-005", origin: "Busan", destination: "Sydney", status: "Pending", commodity: "Consumer Goods", containers: "2x20GP" },
];

const statusColor: Record<string, string> = {
  "In Transit": "bg-accent/10 text-accent",
  "Booking Confirmed": "bg-yellow-100 text-yellow-700",
  "Cargo Received": "bg-blue-100 text-blue-700",
  "Delivered": "bg-green-100 text-green-700",
  "Pending": "bg-secondary text-muted-foreground",
};

const Shipments = () => (
  <DashboardLayout>
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Shipments</h1>
        <p className="text-sm text-muted-foreground">Manage your shipment operations</p>
      </div>
      <Button variant="electric" asChild>
        <Link to="/dashboard/shipments/new"><Plus className="mr-2 h-4 w-4" /> New Shipment</Link>
      </Button>
    </div>

    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left font-medium text-muted-foreground p-4">ID</th>
                <th className="text-left font-medium text-muted-foreground p-4">Origin</th>
                <th className="text-left font-medium text-muted-foreground p-4">Destination</th>
                <th className="text-left font-medium text-muted-foreground p-4">Commodity</th>
                <th className="text-left font-medium text-muted-foreground p-4">Containers</th>
                <th className="text-left font-medium text-muted-foreground p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/dashboard/shipments/${s.id}`}>
                  <td className="p-4 font-mono font-medium text-accent hover:underline">{s.id}</td>
                  <td className="p-4 text-muted-foreground">{s.origin}</td>
                  <td className="p-4 text-muted-foreground">{s.destination}</td>
                  <td className="p-4 text-muted-foreground">{s.commodity}</td>
                  <td className="p-4 text-muted-foreground">{s.containers}</td>
                  <td className="p-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[s.status]}`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </DashboardLayout>
);

export default Shipments;
