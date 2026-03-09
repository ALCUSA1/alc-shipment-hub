import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const Documents = () => {
  const { user } = useAuth();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, doc_type, status, file_url, created_at, shipment_id, shipments(shipment_ref)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-foreground mb-2">Documents</h1>
      <p className="text-sm text-muted-foreground mb-8">Auto-generated shipping documents</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">No documents yet</h2>
          <p className="text-sm text-muted-foreground">Documents will appear here as you create shipments.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((d) => (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground">{d.doc_type}</span>
                </div>
                 <h3 className="font-semibold text-sm text-foreground mb-1">
                   {d.doc_type === "seaway_bill" ? "Seaway Bill (SWB)" : d.doc_type}
                 </h3>
                <p className="text-xs text-muted-foreground mb-1">
                  {(d as any).shipments?.shipment_ref || "—"} · {format(new Date(d.created_at), "MMM d, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground mb-3">Status: {d.status}</p>
                {d.file_url ? (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-3 w-3" /> Download
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    <Download className="mr-2 h-3 w-3" /> No file available
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Documents;
