import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Package, FileText, DollarSign, Search, ExternalLink, Download, Clock, Check, Circle, Ship, Plane, Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusBadge: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  pending: "bg-secondary text-muted-foreground",
  booked: "bg-accent/10 text-accent",
  booking_confirmed: "bg-accent/10 text-accent",
  in_transit: "bg-accent/10 text-accent",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-destructive/10 text-destructive",
};

const CustomerPortal = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);

  const { data: shipments = [], isLoading: loadingShipments } = useQuery({
    queryKey: ["portal-shipments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, shipment_ref, status, mode, origin_port, destination_port, etd, eta, created_at, vessel, airline")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: quotes = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ["portal-quotes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, status, amount, carrier, customer_price, origin_port, destination_port, container_type, transit_days, valid_until, created_at, shipment_id, currency")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["portal-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, doc_type, status, file_url, created_at, shipment_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["portal-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, currency, status, payment_method, created_at, shipment_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const filteredShipments = shipments.filter(s =>
    !search || s.shipment_ref?.toLowerCase().includes(search.toLowerCase()) ||
    s.origin_port?.toLowerCase().includes(search.toLowerCase()) ||
    s.destination_port?.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = loadingShipments || loadingQuotes || loadingDocs;

  if (isLoading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid sm:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Track shipments, review quotes, and download documents</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={Package} label="Active Shipments" value={shipments.filter(s => !["delivered", "completed", "cancelled"].includes(s.status)).length} />
        <SummaryCard icon={DollarSign} label="Pending Quotes" value={quotes.filter(q => q.status === "pending").length} />
        <SummaryCard icon={FileText} label="Documents" value={documents.length} />
        <SummaryCard icon={Clock} label="Payments" value={payments.filter(p => p.status === "completed" || p.status === "succeeded").length} />
      </div>

      <Tabs defaultValue="shipments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="invoices">Invoices & Payments</TabsTrigger>
        </TabsList>

        {/* ── Shipments ── */}
        <TabsContent value="shipments" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search shipments…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-3">Reference</th>
                  <th className="text-left px-4 py-3">Route</th>
                  <th className="text-left px-4 py-3">Mode</th>
                  <th className="text-left px-4 py-3">ETD</th>
                  <th className="text-left px-4 py-3">ETA</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-xs">No shipments found</td></tr>
                ) : filteredShipments.map(s => (
                  <tr key={s.id} className="border-b hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium text-foreground">{s.shipment_ref}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.origin_port || "—"} → {s.destination_port || "—"}</td>
                    <td className="px-4 py-3">{s.mode === "air" ? <Plane className="h-4 w-4 text-muted-foreground" /> : <Ship className="h-4 w-4 text-muted-foreground" />}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.etd ? format(new Date(s.etd), "MMM d") : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.eta ? format(new Date(s.eta), "MMM d") : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${statusBadge[s.status] || "bg-secondary text-muted-foreground"}`}>
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link to={`/dashboard/shipments/${s.id}`}><Eye className="mr-1 h-3 w-3" /> View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Quotes ── */}
        <TabsContent value="quotes" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotes.length === 0 ? (
              <p className="col-span-full text-center text-sm text-muted-foreground py-12">No quotes yet</p>
            ) : quotes.map(q => (
              <Card key={q.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedQuote(q)}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${statusBadge[q.status] || "bg-secondary text-muted-foreground"}`}>
                      {q.status}
                    </span>
                    <span className="text-lg font-bold text-foreground">${(q.customer_price || q.amount || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{q.origin_port || "—"} → {q.destination_port || "—"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">{q.carrier || "Any carrier"}</span>
                    <span className="text-[10px] text-muted-foreground">{q.transit_days ? `${q.transit_days}d transit` : ""}</span>
                  </div>
                  {q.valid_until && (
                    <p className="text-[10px] text-muted-foreground/60 mt-2">Valid until {format(new Date(q.valid_until), "MMM d, yyyy")}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents" className="space-y-4">
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-3">Document</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-xs">No documents</td></tr>
                ) : documents.map(d => (
                  <tr key={d.id} className="border-b hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium text-foreground text-xs">{d.doc_type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <Badge variant={d.status === "completed" ? "default" : "secondary"} className="text-[10px]">{d.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(d.created_at), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3 text-right">
                      {d.file_url ? (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer"><Download className="mr-1 h-3 w-3" /> Download</a>
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Invoices & Payments ── */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-xs">No payments</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id} className="border-b hover:bg-secondary/30">
                    <td className="px-4 py-3 font-semibold text-foreground">${p.amount.toLocaleString()} {p.currency}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.payment_method || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === "completed" || p.status === "succeeded" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quote Detail Dialog */}
      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-3">
              <InfoRow label="Route" value={`${selectedQuote.origin_port || "—"} → ${selectedQuote.destination_port || "—"}`} />
              <InfoRow label="Carrier" value={selectedQuote.carrier || "Any"} />
              <InfoRow label="Container" value={selectedQuote.container_type || "—"} />
              <InfoRow label="Transit" value={selectedQuote.transit_days ? `${selectedQuote.transit_days} days` : "—"} />
              <InfoRow label="Price" value={`$${(selectedQuote.customer_price || selectedQuote.amount || 0).toLocaleString()} ${selectedQuote.currency || "USD"}`} />
              <InfoRow label="Status" value={selectedQuote.status} />
              {selectedQuote.valid_until && <InfoRow label="Valid Until" value={format(new Date(selectedQuote.valid_until), "MMM d, yyyy")} />}
              {selectedQuote.status === "pending" && selectedQuote.shipment_id && (
                <Button variant="electric" className="w-full mt-4" asChild>
                  <Link to={`/dashboard/shipments/${selectedQuote.shipment_id}`}>View Shipment</Link>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

export default CustomerPortal;
