import { ForwarderLayout } from "@/components/forwarder/ForwarderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Ship, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  booked: "bg-accent/10 text-accent",
  in_transit: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-destructive/10 text-destructive",
};

const ForwarderShipments = () => {
  const { user } = useAuth();

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["forwarder-shipments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, status, origin_port, destination_port, mode, etd, eta, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <ForwarderLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Active Shipments</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage all shipment workspaces</p>
        </div>
        <Link to="/dashboard/shipments/new">
          <Button variant="electric">
            <Ship className="h-4 w-4 mr-2" />
            New Shipment
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETD</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : shipments && shipments.length > 0 ? (
                shipments.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium font-mono text-sm">{s.shipment_ref}</TableCell>
                    <TableCell className="text-sm">
                      {s.origin_port || "—"} → {s.destination_port || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{s.mode || "ocean"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[s.status] || "bg-secondary"} variant="secondary">
                        {s.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.etd ? format(new Date(s.etd), "MMM d") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(s.created_at), "MMM d")}
                    </TableCell>
                    <TableCell>
                      <Link to={`/dashboard/shipments/${s.id}`}>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Ship className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No shipments yet</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ForwarderLayout>
  );
};

export default ForwarderShipments;
