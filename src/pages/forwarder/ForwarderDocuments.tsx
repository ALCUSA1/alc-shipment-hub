import { ForwarderLayout } from "@/components/forwarder/ForwarderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";

const ForwarderDocuments = () => {
  const { user } = useAuth();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["forwarder-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, doc_type, status, file_url, created_at, shipments(shipment_ref)")
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
        <h1 className="text-2xl font-bold text-foreground">Document Center</h1>
        <p className="text-sm text-muted-foreground">Manage all shipment documents and compliance</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Type</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : documents && documents.length > 0 ? (
                documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium capitalize">
                      {d.doc_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {(d as any).shipments?.shipment_ref || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(d.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No documents yet</p>
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

export default ForwarderDocuments;
