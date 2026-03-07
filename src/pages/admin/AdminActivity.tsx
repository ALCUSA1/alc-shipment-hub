import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, Package, DollarSign, FileText, Truck } from "lucide-react";

const AdminActivity = () => {
  const { data: recentShipments, isLoading: loadingShipments } = useQuery({
    queryKey: ["admin-recent-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, status, origin_port, destination_port, created_at, updated_at, companies(company_name)")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentQuotes, isLoading: loadingQuotes } = useQuery({
    queryKey: ["admin-recent-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, status, origin_port, destination_port, customer_name, carrier, customer_price, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentDocuments, isLoading: loadingDocs } = useQuery({
    queryKey: ["admin-recent-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, doc_type, status, shipment_id, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentEdi, isLoading: loadingEdi } = useQuery({
    queryKey: ["admin-recent-edi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edi_messages")
        .select("id, message_type, carrier, direction, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-secondary text-muted-foreground",
      pending: "bg-yellow-100 text-yellow-700",
      accepted: "bg-green-100 text-green-700",
      converted: "bg-accent/10 text-accent",
      in_transit: "bg-accent/10 text-accent",
      delivered: "bg-green-100 text-green-700",
      booked: "bg-blue-100 text-blue-700",
      error: "bg-destructive/10 text-destructive",
    };
    return <Badge variant="secondary" className={`text-[10px] ${colors[status] || "bg-secondary text-muted-foreground"}`}>{status}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-bold text-foreground">Activity Feed</h1>
        </div>
        <p className="text-sm text-muted-foreground">Real-time log of all platform operations across all users</p>
      </div>

      <Tabs defaultValue="shipments">
        <TabsList>
          <TabsTrigger value="shipments" className="gap-1"><Package className="h-3.5 w-3.5" /> Shipments</TabsTrigger>
          <TabsTrigger value="quotes" className="gap-1"><DollarSign className="h-3.5 w-3.5" /> Quotes</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1"><FileText className="h-3.5 w-3.5" /> Documents</TabsTrigger>
          <TabsTrigger value="edi" className="gap-1"><Truck className="h-3.5 w-3.5" /> EDI Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="shipments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingShipments ? <div className="p-6"><Skeleton className="h-48 w-full" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left font-medium text-muted-foreground p-4">Ref</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Customer</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Route</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recentShipments || []).map((s: any) => (
                        <tr key={s.id} className="border-b last:border-0 hover:bg-secondary/50">
                          <td className="p-4 font-mono font-medium text-accent">{s.shipment_ref}</td>
                          <td className="p-4 text-foreground">{s.companies?.company_name || "—"}</td>
                          <td className="p-4 text-muted-foreground">{s.origin_port || "—"} → {s.destination_port || "—"}</td>
                          <td className="p-4">{statusBadge(s.status)}</td>
                          <td className="p-4 text-xs text-muted-foreground">{format(new Date(s.updated_at), "MMM d, HH:mm")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingQuotes ? <div className="p-6"><Skeleton className="h-48 w-full" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left font-medium text-muted-foreground p-4">Route</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Customer</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Carrier</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Price</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recentQuotes || []).map((q: any) => (
                        <tr key={q.id} className="border-b last:border-0 hover:bg-secondary/50">
                          <td className="p-4 text-foreground">{q.origin_port && q.destination_port ? `${q.origin_port} → ${q.destination_port}` : "—"}</td>
                          <td className="p-4 text-muted-foreground">{q.customer_name || "—"}</td>
                          <td className="p-4 text-muted-foreground">{q.carrier || "—"}</td>
                          <td className="p-4 font-medium text-foreground">{q.customer_price ? `$${q.customer_price.toLocaleString()}` : "—"}</td>
                          <td className="p-4">{statusBadge(q.status)}</td>
                          <td className="p-4 text-xs text-muted-foreground">{format(new Date(q.updated_at), "MMM d, HH:mm")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingDocs ? <div className="p-6"><Skeleton className="h-48 w-full" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left font-medium text-muted-foreground p-4">Document Type</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recentDocuments || []).map((d: any) => (
                        <tr key={d.id} className="border-b last:border-0 hover:bg-secondary/50">
                          <td className="p-4 text-foreground">{d.doc_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</td>
                          <td className="p-4">{statusBadge(d.status)}</td>
                          <td className="p-4 text-xs text-muted-foreground">{format(new Date(d.updated_at), "MMM d, HH:mm")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edi" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingEdi ? <div className="p-6"><Skeleton className="h-48 w-full" /></div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left font-medium text-muted-foreground p-4">Type</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Carrier</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Direction</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                        <th className="text-left font-medium text-muted-foreground p-4">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recentEdi || []).map((e: any) => (
                        <tr key={e.id} className="border-b last:border-0 hover:bg-secondary/50">
                          <td className="p-4 font-mono text-foreground">{e.message_type}</td>
                          <td className="p-4 text-muted-foreground">{e.carrier}</td>
                          <td className="p-4">
                            <Badge variant={e.direction === "inbound" ? "secondary" : "default"} className="text-[10px]">
                              {e.direction === "inbound" ? "← IN" : "→ OUT"}
                            </Badge>
                          </td>
                          <td className="p-4">{statusBadge(e.status)}</td>
                          <td className="p-4 text-xs text-muted-foreground">{format(new Date(e.created_at), "MMM d, HH:mm")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminActivity;
