import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { DOC_CATEGORIES, getDocLabel } from "@/lib/document-types";
import { useMemo } from "react";

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

  const countByCategory = useMemo(() => {
    if (!documents) return {};
    const counts: Record<string, number> = { all: documents.length };
    for (const cat of DOC_CATEGORIES) {
      counts[cat.key] = documents.filter((d) => cat.docTypes.includes(d.doc_type)).length;
    }
    return counts;
  }, [documents]);

  const docsByCategory = useMemo(() => {
    if (!documents) return {};
    const map: Record<string, typeof documents> = { all: documents };
    for (const cat of DOC_CATEGORIES) {
      map[cat.key] = documents.filter((d) => cat.docTypes.includes(d.doc_type));
    }
    return map;
  }, [documents]);

  const renderDocCards = (docs: typeof documents) => {
    if (!docs || docs.length === 0) {
      return (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No documents in this category</p>
        </div>
      );
    }
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map((d) => (
          <Card key={d.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <Badge variant="secondary" className="text-[10px]">{d.status}</Badge>
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-1">
                {getDocLabel(d.doc_type)}
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {(d as any).shipments?.shipment_ref || "—"} · {format(new Date(d.created_at), "MMM d, yyyy")}
              </p>
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
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-4">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground">Auto-generated shipping documents organized by category</p>
        </div>
      </div>

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
        <Tabs defaultValue="all">
          <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0 mb-6">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5 text-xs font-medium border border-border">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              All
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 min-w-[1rem]">{countByCategory.all || 0}</Badge>
            </TabsTrigger>
            {DOC_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = countByCategory[cat.key] || 0;
              return (
                <TabsTrigger
                  key={cat.key}
                  value={cat.key}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5 text-xs font-medium border border-border"
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {cat.label}
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4 min-w-[1rem]">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="all">{renderDocCards(docsByCategory.all)}</TabsContent>
          {DOC_CATEGORIES.map((cat) => (
            <TabsContent key={cat.key} value={cat.key}>
              {renderDocCards(docsByCategory[cat.key])}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </DashboardLayout>
  );
};

export default Documents;
