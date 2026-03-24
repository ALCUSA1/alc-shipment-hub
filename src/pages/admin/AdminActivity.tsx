import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, Package, DollarSign, FileText, Radio } from "lucide-react";

const AdminActivity = () => {
  const { data: recentShipments, isLoading: loadingShipments } = useQuery({
    queryKey: ["admin-recent-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, status, origin_port, destination_port, created_at, updated_at, companies!shipments_company_id_fkey(company_name)")
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

  const statusColors: Record<string, string> = {
    draft: "bg-[hsl(220,15%,20%)] text-[hsl(220,10%,55%)]",
    pending: "bg-amber-500/15 text-amber-400",
    accepted: "bg-emerald-500/15 text-emerald-400",
    converted: "bg-blue-500/15 text-blue-400",
    in_transit: "bg-blue-500/15 text-blue-400",
    delivered: "bg-emerald-500/15 text-emerald-400",
    booked: "bg-indigo-500/15 text-indigo-400",
    error: "bg-red-500/15 text-red-400",
    processed: "bg-emerald-500/15 text-emerald-400",
  };

  const statusBadge = (status: string) => (
    <Badge variant="secondary" className={`text-[10px] border-0 ${statusColors[status] || "bg-[hsl(220,15%,20%)] text-[hsl(220,10%,55%)]"}`}>
      {status}
    </Badge>
  );

  const TableSkeleton = () => <div className="p-6"><Skeleton className="h-48 w-full bg-[hsl(220,15%,15%)]" /></div>;

  const tableHeaderClass = "text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4";
  const tableCellClass = "p-4";
  const tableRowClass = "border-b border-[hsl(220,15%,12%)] last:border-0 hover:bg-[hsl(220,15%,12%)] transition-colors";

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Real-time log of all platform operations across all users</p>
      </div>

      <Tabs defaultValue="shipments">
        <TabsList className="bg-[hsl(220,15%,12%)] border border-[hsl(220,15%,16%)]">
          <TabsTrigger value="shipments" className="gap-1.5 data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]"><Package className="h-3.5 w-3.5" /> Shipments</TabsTrigger>
          <TabsTrigger value="quotes" className="gap-1.5 data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]"><DollarSign className="h-3.5 w-3.5" /> Quotes</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]"><FileText className="h-3.5 w-3.5" /> Documents</TabsTrigger>
          <TabsTrigger value="edi" className="gap-1.5 data-[state=active]:bg-[hsl(220,15%,18%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]"><Radio className="h-3.5 w-3.5" /> EDI</TabsTrigger>
        </TabsList>

        <TabsContent value="shipments" className="mt-4">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            {loadingShipments ? <TableSkeleton /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[hsl(220,15%,15%)]">
                    <th className={tableHeaderClass}>Ref</th>
                    <th className={tableHeaderClass}>Customer</th>
                    <th className={tableHeaderClass}>Route</th>
                    <th className={tableHeaderClass}>Status</th>
                    <th className={tableHeaderClass}>Updated</th>
                  </tr></thead>
                  <tbody>
                    {(recentShipments || []).map((s: any) => (
                      <tr key={s.id} className={tableRowClass}>
                        <td className={`${tableCellClass} font-mono font-medium text-blue-400`}>{s.shipment_ref}</td>
                        <td className={`${tableCellClass} text-white`}>{s.companies?.company_name || "—"}</td>
                        <td className={`${tableCellClass} text-[hsl(220,10%,50%)]`}>{s.origin_port || "—"} → {s.destination_port || "—"}</td>
                        <td className={tableCellClass}>{statusBadge(s.status)}</td>
                        <td className={`${tableCellClass} text-xs text-[hsl(220,10%,40%)]`}>{format(new Date(s.updated_at), "MMM d, HH:mm")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            {loadingQuotes ? <TableSkeleton /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[hsl(220,15%,15%)]">
                    <th className={tableHeaderClass}>Route</th>
                    <th className={tableHeaderClass}>Customer</th>
                    <th className={tableHeaderClass}>Carrier</th>
                    <th className={tableHeaderClass}>Price</th>
                    <th className={tableHeaderClass}>Status</th>
                    <th className={tableHeaderClass}>Updated</th>
                  </tr></thead>
                  <tbody>
                    {(recentQuotes || []).map((q: any) => (
                      <tr key={q.id} className={tableRowClass}>
                        <td className={`${tableCellClass} text-white`}>{q.origin_port && q.destination_port ? `${q.origin_port} → ${q.destination_port}` : "—"}</td>
                        <td className={`${tableCellClass} text-[hsl(220,10%,55%)]`}>{q.customer_name || "—"}</td>
                        <td className={`${tableCellClass} text-[hsl(220,10%,55%)]`}>{q.carrier || "—"}</td>
                        <td className={`${tableCellClass} font-medium text-white`}>{q.customer_price ? `$${q.customer_price.toLocaleString()}` : "—"}</td>
                        <td className={tableCellClass}>{statusBadge(q.status)}</td>
                        <td className={`${tableCellClass} text-xs text-[hsl(220,10%,40%)]`}>{format(new Date(q.updated_at), "MMM d, HH:mm")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            {loadingDocs ? <TableSkeleton /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[hsl(220,15%,15%)]">
                    <th className={tableHeaderClass}>Document Type</th>
                    <th className={tableHeaderClass}>Status</th>
                    <th className={tableHeaderClass}>Updated</th>
                  </tr></thead>
                  <tbody>
                    {(recentDocuments || []).map((d: any) => (
                      <tr key={d.id} className={tableRowClass}>
                        <td className={`${tableCellClass} text-white`}>{d.doc_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</td>
                        <td className={tableCellClass}>{statusBadge(d.status)}</td>
                        <td className={`${tableCellClass} text-xs text-[hsl(220,10%,40%)]`}>{format(new Date(d.updated_at), "MMM d, HH:mm")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="edi" className="mt-4">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            {loadingEdi ? <TableSkeleton /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[hsl(220,15%,15%)]">
                    <th className={tableHeaderClass}>Type</th>
                    <th className={tableHeaderClass}>Carrier</th>
                    <th className={tableHeaderClass}>Direction</th>
                    <th className={tableHeaderClass}>Status</th>
                    <th className={tableHeaderClass}>Time</th>
                  </tr></thead>
                  <tbody>
                    {(recentEdi || []).map((e: any) => (
                      <tr key={e.id} className={tableRowClass}>
                        <td className={`${tableCellClass} font-mono text-white`}>{e.message_type}</td>
                        <td className={`${tableCellClass} text-[hsl(220,10%,55%)]`}>{e.carrier}</td>
                        <td className={tableCellClass}>
                          <Badge variant="secondary" className={`text-[10px] border-0 ${e.direction === "inbound" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}>
                            {e.direction === "inbound" ? "← IN" : "→ OUT"}
                          </Badge>
                        </td>
                        <td className={tableCellClass}>{statusBadge(e.status)}</td>
                        <td className={`${tableCellClass} text-xs text-[hsl(220,10%,40%)]`}>{format(new Date(e.created_at), "MMM d, HH:mm")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminActivity;
