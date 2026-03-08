import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  User,
  Package,
  FileText,
  DollarSign,
  Building2,
  Shield,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AdminCustomerLookup = () => {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Search profiles
  const { data: profiles, isLoading: searchLoading } = useQuery({
    queryKey: ["admin-customer-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`full_name.ilike.%${search}%,company_name.ilike.%${search}%,user_id.ilike.%${search}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: search.length >= 2,
  });

  const selectedProfile = profiles?.find((p) => p.user_id === selectedUserId);

  // Fetch all data for selected customer
  const { data: shipments } = useQuery({
    queryKey: ["admin-customer-shipments", selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("user_id", selectedUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUserId,
  });

  const { data: quotes } = useQuery({
    queryKey: ["admin-customer-quotes", selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("user_id", selectedUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUserId,
  });

  const { data: financials } = useQuery({
    queryKey: ["admin-customer-financials", selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_financials")
        .select("*")
        .eq("user_id", selectedUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUserId,
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-customer-roles", selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", selectedUserId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUserId,
  });

  const { data: documents } = useQuery({
    queryKey: ["admin-customer-documents", selectedUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", selectedUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedUserId,
  });

  const totalRevenue = (financials || [])
    .filter((f) => f.entry_type === "revenue")
    .reduce((s, f) => s + Number(f.amount), 0);
  const totalCost = (financials || [])
    .filter((f) => f.entry_type === "cost")
    .reduce((s, f) => s + Number(f.amount), 0);

  const statusColor: Record<string, string> = {
    draft: "bg-[hsl(220,15%,20%)] text-[hsl(220,10%,55%)]",
    booked: "bg-blue-500/15 text-blue-400",
    in_transit: "bg-amber-500/15 text-amber-400",
    arrived: "bg-emerald-500/15 text-emerald-400",
    delivered: "bg-emerald-500/15 text-emerald-400",
    completed: "bg-emerald-500/15 text-emerald-400",
    pending: "bg-amber-500/15 text-amber-400",
    accepted: "bg-emerald-500/15 text-emerald-400",
    rejected: "bg-red-500/15 text-red-400",
    sent: "bg-blue-500/15 text-blue-400",
  };

  const roleColor: Record<string, string> = {
    admin: "bg-red-500/15 text-red-400 border-red-500/20",
    ops_manager: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    sales: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    viewer: "bg-[hsl(220,15%,20%)] text-[hsl(220,10%,55%)] border-[hsl(220,15%,20%)]",
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-5 w-5 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Customer Lookup</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">
          Search for any customer and view their full profile, shipments, quotes, and financials
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-lg mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(220,10%,40%)]" />
        <Input
          placeholder="Search by name, company, or user ID…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value.length < 2) setSelectedUserId(null);
          }}
          className="pl-9 bg-[hsl(220,18%,10%)] border-[hsl(220,15%,15%)] text-white placeholder:text-[hsl(220,10%,35%)] h-11 text-base"
        />
      </div>

      {/* Search results */}
      {search.length >= 2 && !selectedUserId && (
        <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] mb-6 overflow-hidden">
          {searchLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-[hsl(220,15%,15%)]" />
              ))}
            </div>
          ) : !profiles?.length ? (
            <p className="text-sm text-[hsl(220,10%,40%)] text-center py-8">No customers found.</p>
          ) : (
            <div className="divide-y divide-[hsl(220,15%,13%)]">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedUserId(p.user_id)}
                  className="flex items-center justify-between w-full px-4 py-3 hover:bg-[hsl(220,15%,12%)] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {(p.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{p.full_name || "Unnamed"}</p>
                      <p className="text-xs text-[hsl(220,10%,40%)]">
                        {p.company_name || "No company"} · {p.user_id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[hsl(220,10%,30%)]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customer Profile View */}
      {selectedUserId && selectedProfile && (
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white">
                  {(selectedProfile.full_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedProfile.full_name || "Unnamed"}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="h-3.5 w-3.5 text-[hsl(220,10%,45%)]" />
                    <span className="text-sm text-[hsl(220,10%,50%)]">
                      {selectedProfile.company_name || "No company"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3.5 w-3.5 text-[hsl(220,10%,45%)]" />
                    <span className="text-xs text-[hsl(220,10%,40%)]">
                      Joined {format(new Date(selectedProfile.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(roles || []).map((r) => (
                      <Badge key={r.role} variant="outline" className={`text-[10px] ${roleColor[r.role] || ""}`}>
                        <Shield className="h-2.5 w-2.5 mr-1" />
                        {r.role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUserId(null)}
                className="text-[hsl(220,10%,50%)] hover:text-white"
              >
                ← Back
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <SummaryCard label="Shipments" value={shipments?.length ?? 0} icon={Package} />
              <SummaryCard label="Quotes" value={quotes?.length ?? 0} icon={FileText} />
              <SummaryCard label="Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} color="text-emerald-400" />
              <SummaryCard label="Costs" value={`$${totalCost.toLocaleString()}`} icon={DollarSign} color="text-red-400" />
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="shipments" className="space-y-4">
            <TabsList className="bg-[hsl(220,18%,10%)] border border-[hsl(220,15%,13%)]">
              <TabsTrigger value="shipments" className="data-[state=active]:bg-[hsl(220,15%,15%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]">
                Shipments ({shipments?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="quotes" className="data-[state=active]:bg-[hsl(220,15%,15%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]">
                Quotes ({quotes?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="financials" className="data-[state=active]:bg-[hsl(220,15%,15%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]">
                Financials ({financials?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:bg-[hsl(220,15%,15%)] data-[state=active]:text-white text-[hsl(220,10%,45%)]">
                Documents ({documents?.length ?? 0})
              </TabsTrigger>
            </TabsList>

            {/* Shipments Tab */}
            <TabsContent value="shipments">
              <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
                {!shipments?.length ? (
                  <p className="text-sm text-[hsl(220,10%,40%)] text-center py-8">No shipments</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(220,15%,15%)]">
                        <Th>Reference</Th><Th>Route</Th><Th>Status</Th><Th>Created</Th><Th></Th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipments.map((s) => (
                        <tr key={s.id} className="border-b border-[hsl(220,15%,12%)] last:border-0 hover:bg-[hsl(220,15%,12%)] transition-colors">
                          <td className="p-4 font-mono text-white text-xs">{s.shipment_ref}</td>
                          <td className="p-4 text-[hsl(220,10%,55%)]">
                            {s.origin_port || "—"} → {s.destination_port || "—"}
                          </td>
                          <td className="p-4">
                            <Badge className={`text-[10px] border-0 ${statusColor[s.status] || ""}`}>{s.status}</Badge>
                          </td>
                          <td className="p-4 text-[hsl(220,10%,45%)] text-xs">
                            {format(new Date(s.created_at), "MMM d, yyyy")}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/shipments/${s.id}`)}
                              className="text-blue-400 hover:text-blue-300 text-xs"
                            >
                              View →
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>

            {/* Quotes Tab */}
            <TabsContent value="quotes">
              <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
                {!quotes?.length ? (
                  <p className="text-sm text-[hsl(220,10%,40%)] text-center py-8">No quotes</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(220,15%,15%)]">
                        <Th>Customer</Th><Th>Route</Th><Th>Amount</Th><Th>Status</Th><Th>Created</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((q) => (
                        <tr key={q.id} className="border-b border-[hsl(220,15%,12%)] last:border-0 hover:bg-[hsl(220,15%,12%)] transition-colors">
                          <td className="p-4 text-white text-xs">{q.customer_name || "—"}</td>
                          <td className="p-4 text-[hsl(220,10%,55%)]">
                            {q.origin_port || "—"} → {q.destination_port || "—"}
                          </td>
                          <td className="p-4 text-white font-mono text-xs">
                            ${Number(q.customer_price || q.amount || 0).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <Badge className={`text-[10px] border-0 ${statusColor[q.status] || ""}`}>{q.status}</Badge>
                          </td>
                          <td className="p-4 text-[hsl(220,10%,45%)] text-xs">
                            {format(new Date(q.created_at), "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>

            {/* Financials Tab */}
            <TabsContent value="financials">
              <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
                {!financials?.length ? (
                  <p className="text-sm text-[hsl(220,10%,40%)] text-center py-8">No financial records</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(220,15%,15%)]">
                        <Th>Description</Th><Th>Type</Th><Th>Category</Th><Th>Amount</Th><Th>Date</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {financials.map((f) => (
                        <tr key={f.id} className="border-b border-[hsl(220,15%,12%)] last:border-0 hover:bg-[hsl(220,15%,12%)] transition-colors">
                          <td className="p-4 text-white text-xs">{f.description}</td>
                          <td className="p-4">
                            <Badge className={`text-[10px] border-0 ${f.entry_type === "revenue" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                              {f.entry_type}
                            </Badge>
                          </td>
                          <td className="p-4 text-[hsl(220,10%,55%)] text-xs">{f.category}</td>
                          <td className="p-4 text-white font-mono text-xs">
                            {f.entry_type === "revenue" ? "+" : "-"}${Number(f.amount).toLocaleString()}
                          </td>
                          <td className="p-4 text-[hsl(220,10%,45%)] text-xs">
                            {f.date ? format(new Date(f.date), "MMM d, yyyy") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
                {!documents?.length ? (
                  <p className="text-sm text-[hsl(220,10%,40%)] text-center py-8">No documents</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(220,15%,15%)]">
                        <Th>Type</Th><Th>Status</Th><Th>Created</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((d) => (
                        <tr key={d.id} className="border-b border-[hsl(220,15%,12%)] last:border-0 hover:bg-[hsl(220,15%,12%)] transition-colors">
                          <td className="p-4 text-white text-xs">{d.doc_type}</td>
                          <td className="p-4">
                            <Badge className={`text-[10px] border-0 ${statusColor[d.status] || ""}`}>{d.status}</Badge>
                          </td>
                          <td className="p-4 text-[hsl(220,10%,45%)] text-xs">
                            {format(new Date(d.created_at), "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AdminLayout>
  );
};

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)] p-4">
    {children}
  </th>
);

const SummaryCard = ({
  label,
  value,
  icon: Icon,
  color = "text-white",
}: {
  label: string;
  value: string | number;
  icon: any;
  color?: string;
}) => (
  <div className="rounded-lg border border-[hsl(220,15%,13%)] bg-[hsl(220,15%,12%)] p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-[hsl(220,10%,40%)]" />
      <span className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] font-semibold">{label}</span>
    </div>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

export default AdminCustomerLookup;
