import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

const statusColor: Record<string, string> = {
  in_transit: "bg-accent/10 text-accent",
  booking_confirmed: "bg-yellow-100 text-yellow-700",
  cargo_received: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  draft: "bg-secondary text-muted-foreground",
  pending: "bg-secondary text-muted-foreground",
};

const formatStatus = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const Shipments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["shipments-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, companies(company_name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
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
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !shipments || shipments.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No shipments yet. Create your first shipment to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground p-4">Reference</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Customer</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Route</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Type</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => {
                    const companyName = (s.companies as any)?.company_name;
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/shipments/${s.id}`)}>
                        <td className="p-4 font-mono font-medium text-accent">{s.shipment_ref}</td>
                        <td className="p-4 text-foreground">{companyName || <span className="text-muted-foreground">—</span>}</td>
                        <td className="p-4 text-muted-foreground">{s.origin_port || "—"} → {s.destination_port || "—"}</td>
                        <td className="p-4 text-muted-foreground capitalize">{s.shipment_type}</td>
                        <td className="p-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[s.status] || "bg-secondary text-muted-foreground"}`}>
                            {formatStatus(s.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
