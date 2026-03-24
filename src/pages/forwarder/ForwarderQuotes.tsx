import { ForwarderLayout } from "@/components/forwarder/ForwarderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { QuoteShareActions } from "@/components/quotes/QuoteShareActions";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-destructive/10 text-destructive",
  expired: "bg-secondary text-muted-foreground",
};

const ForwarderQuotes = () => {
  const { user } = useAuth();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["forwarder-quotes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, shipment_id, amount, status, valid_until, created_at, shipments(shipment_ref)")
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Quotes & Booking Queue</h1>
        <p className="text-sm text-muted-foreground">Manage pricing and booking confirmations</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : quotes && quotes.length > 0 ? (
                quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-sm">
                      {(q as any).shipments?.shipment_ref || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(q.amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[q.status] || "bg-secondary"} variant="secondary">
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {q.valid_until ? format(new Date(q.valid_until), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(q.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No quotes yet</p>
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

export default ForwarderQuotes;
