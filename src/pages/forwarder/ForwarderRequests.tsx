import { ForwarderLayout } from "@/components/forwarder/ForwarderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { ClipboardList, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

const ForwarderRequests = () => {
  const { user } = useAuth();

  // Show draft/pending shipments as "requests"
  const { data: requests, isLoading } = useQuery({
    queryKey: ["forwarder-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, status, origin_port, destination_port, mode, created_at")
        .eq("user_id", user!.id)
        .in("status", ["draft", "pending", "quote_requested"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <ForwarderLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Shipment Requests</h1>
        <p className="text-sm text-muted-foreground">
          Incoming shipment requests from your customers
        </p>
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
                <TableHead>Received</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : requests && requests.length > 0 ? (
                requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm font-medium">{r.shipment_ref}</TableCell>
                    <TableCell className="text-sm">
                      {r.origin_port || "—"} → {r.destination_port || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{r.mode || "ocean"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-yellow-100 text-yellow-700" variant="secondary">
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d")}
                    </TableCell>
                    <TableCell>
                      <Link to={`/dashboard/shipments/${r.id}`}>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No pending requests</p>
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

export default ForwarderRequests;
