import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-secondary text-muted-foreground",
  "booking-confirmed": "bg-yellow-100 text-yellow-700",
  "in-transit": "bg-accent/10 text-accent",
  "cargo-received": "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
};

const formatStatus = (status: string) =>
  status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const Shipments = () => {
  const navigate = useNavigate();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, origin_port, destination_port, status, shipment_type, created_at, etd, eta")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shipments</h1>
          <p className="text-sm text-muted-foreground">View and manage all your shipments</p>
        </div>
        <Button variant="electric" asChild>
          <Link to="/dashboard/shipments/new"><Plus className="mr-2 h-4 w-4" /> New Shipment</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No shipments yet</p>
              <p className="text-sm mt-1">Create your first shipment to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground p-4">Reference</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Origin</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Destination</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Type</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Created</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/shipments/${s.id}`)}
                    >
                      <td className="p-4 font-mono font-medium text-accent hover:underline">{s.shipment_ref}</td>
                      <td className="p-4 text-muted-foreground">{s.origin_port || "—"}</td>
                      <td className="p-4 text-muted-foreground">{s.destination_port || "—"}</td>
                      <td className="p-4 text-muted-foreground capitalize">{s.shipment_type}</td>
                      <td className="p-4 text-muted-foreground">{format(new Date(s.created_at), "MMM d, yyyy")}</td>
                      <td className="p-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[s.status] || "bg-secondary text-muted-foreground"}`}>
                          {formatStatus(s.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Shipments;
