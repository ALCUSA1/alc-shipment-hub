import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Loader2, Printer, ChevronDown, ChevronRight, Ship, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { DOC_CATEGORIES, getDocLabel } from "@/lib/document-types";
import { useDocumentPdf } from "@/hooks/useDocumentPdf";
import { useMemo, useState } from "react";

interface DocRow {
  id: string;
  doc_type: string;
  status: string;
  file_url: string | null;
  created_at: string;
  shipment_id: string;
  shipments: { shipment_ref: string } | null;
}

const Documents = () => {
  const { user } = useAuth();
  const { generatePdf, generating } = useDocumentPdf();
  const [openShipments, setOpenShipments] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, doc_type, status, file_url, created_at, shipment_id, shipments(shipment_ref)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DocRow[];
    },
    enabled: !!user,
  });

  // Group documents by shipment
  const shipmentGroups = useMemo(() => {
    if (!documents) return [];
    const map = new Map<string, { shipmentId: string; shipmentRef: string; docs: DocRow[] }>();
    for (const doc of documents) {
      const sid = doc.shipment_id;
      if (!map.has(sid)) {
        map.set(sid, {
          shipmentId: sid,
          shipmentRef: doc.shipments?.shipment_ref || sid.slice(0, 8),
          docs: [],
        });
      }
      map.get(sid)!.docs.push(doc);
    }
    return Array.from(map.values());
  }, [documents]);

  // Category counts across all docs
  const countByCategory = useMemo(() => {
    if (!documents) return {};
    const counts: Record<string, number> = { all: documents.length };
    for (const cat of DOC_CATEGORIES) {
      counts[cat.key] = documents.filter((d) => cat.docTypes.includes(d.doc_type)).length;
    }
    return counts;
  }, [documents]);

  const toggleShipment = (sid: string) => {
    setOpenShipments((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const expandAll = () => setOpenShipments(new Set(shipmentGroups.map((g) => g.shipmentId)));
  const collapseAll = () => setOpenShipments(new Set());

  // Filter docs by category
  const filterDocs = (docs: DocRow[], categoryKey: string) => {
    if (categoryKey === "all") return docs;
    const cat = DOC_CATEGORIES.find((c) => c.key === categoryKey);
    return cat ? docs.filter((d) => cat.docTypes.includes(d.doc_type)) : docs;
  };

  const renderDocCard = (d: DocRow) => {
    const isGenerating = generating === d.doc_type + d.shipment_id;
    return (
      <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{getDocLabel(d.doc_type)}</p>
            <p className="text-[10px] text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="text-[10px]">{d.status}</Badge>
          {d.file_url ? (
            <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
              <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                <Download className="mr-1 h-3 w-3" /> File
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            disabled={isGenerating}
            onClick={() => generatePdf(d.shipment_id, d.doc_type, getDocLabel(d.doc_type))}
          >
            {isGenerating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Printer className="mr-1 h-3 w-3" />}
            PDF
          </Button>
        </div>
      </div>
    );
  };

  const renderShipmentGroups = (categoryKey: string) => {
    if (shipmentGroups.length === 0) {
      return (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No documents in this category</p>
        </div>
      );
    }

    // Filter groups that have docs in this category
    const filtered = shipmentGroups
      .map((g) => ({ ...g, docs: filterDocs(g.docs, categoryKey) }))
      .filter((g) => g.docs.length > 0);

    if (filtered.length === 0) {
      return (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No documents in this category</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map((group) => {
          const isOpen = openShipments.has(group.shipmentId);
          return (
            <Collapsible key={group.shipmentId} open={isOpen} onOpenChange={() => toggleShipment(group.shipmentId)}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <Ship className="h-4 w-4 text-accent" />
                    <span className="text-sm font-semibold text-foreground">{group.shipmentRef}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {group.docs.length} doc{group.docs.length !== 1 ? "s" : ""}
                  </Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 ml-7 space-y-1.5">
                {group.docs.map(renderDocCard)}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-4">
        <BackButton />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground">Shipping documents organized by shipment — generate PDFs on demand</p>
        </div>
        {shipmentGroups.length > 0 && (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="text-[11px] h-7" onClick={expandAll}>Expand All</Button>
            <Button variant="ghost" size="sm" className="text-[11px] h-7" onClick={collapseAll}>Collapse All</Button>
          </div>
        )}
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

          <TabsContent value="all">{renderShipmentGroups("all")}</TabsContent>
          {DOC_CATEGORIES.map((cat) => (
            <TabsContent key={cat.key} value={cat.key}>
              {renderShipmentGroups(cat.key)}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </DashboardLayout>
  );
};

export default Documents;
