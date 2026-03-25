import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import {
  DollarSign, Clock, AlertTriangle, Search, Receipt,
  FileText, TrendingUp, BarChart3,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

function AgingBadge({ days }: { days: number }) {
  if (days <= 30) return <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Current</Badge>;
  if (days <= 60) return <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">31–60</Badge>;
  if (days <= 90) return <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">61–90</Badge>;
  return <Badge variant="secondary" className="text-[10px] bg-destructive/10 text-destructive">Over 90</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    overdue: "bg-destructive/10 text-destructive",
    unpaid: "bg-muted text-muted-foreground",
  };
  return <Badge variant="secondary" className={`text-[10px] ${styles[status] || styles.unpaid}`}>{status}</Badge>;
}

export function SOADashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: financials, isLoading } = useQuery({
    queryKey: ["soa-financials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_financials")
        .select("*, shipments(shipment_ref, status, origin_port, destination_port)")
        .eq("user_id", user!.id)
        .eq("entry_type", "revenue")
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ["soa-payments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("shipment_id, amount, status")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const invoices = useMemo(() => {
    if (!financials) return [];
    const paidMap = new Map<string, number>();
    (payments || []).filter(p => p.status === "completed" || p.status === "succeeded")
      .forEach(p => paidMap.set(p.shipment_id, (paidMap.get(p.shipment_id) || 0) + (p.amount || 0)));

    return financials.map(f => {
      const dueDate = f.date || f.created_at;
      const agingDays = differenceInDays(new Date(), new Date(dueDate));
      const paidAmount = paidMap.get(f.shipment_id) || 0;
      const status = paidAmount >= f.amount ? "paid" : paidAmount > 0 ? "partial" : agingDays > 30 ? "overdue" : "unpaid";
      return {
        ...f,
        shipmentRef: (f.shipments as any)?.shipment_ref || "—",
        route: `${(f.shipments as any)?.origin_port || "—"} → ${(f.shipments as any)?.destination_port || "—"}`,
        agingDays: Math.max(0, agingDays),
        paidAmount,
        outstanding: Math.max(0, f.amount - paidAmount),
        paymentStatus: status,
      };
    });
  }, [financials, payments]);

  const filtered = useMemo(() => {
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(inv =>
      inv.shipmentRef.toLowerCase().includes(q) ||
      inv.description?.toLowerCase().includes(q) ||
      inv.invoice_ref?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const buckets = useMemo(() => {
    const b = { current: 0, d31_60: 0, d61_90: 0, over90: 0, total: 0 };
    invoices.filter(i => i.paymentStatus !== "paid").forEach(inv => {
      b.total += inv.outstanding;
      if (inv.agingDays <= 30) b.current += inv.outstanding;
      else if (inv.agingDays <= 60) b.d31_60 += inv.outstanding;
      else if (inv.agingDays <= 90) b.d61_90 += inv.outstanding;
      else b.over90 += inv.outstanding;
    });
    return b;
  }, [invoices]);

  const chartData = [
    { name: "0–30", value: buckets.current, fill: "hsl(var(--accent))" },
    { name: "31–60", value: buckets.d31_60, fill: "hsl(45, 93%, 47%)" },
    { name: "61–90", value: buckets.d61_90, fill: "hsl(24, 95%, 53%)" },
    { name: "90+", value: buckets.over90, fill: "hsl(var(--destructive))" },
  ];

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const overdueCount = invoices.filter(i => i.paymentStatus === "overdue").length;
  const unpaidCount = invoices.filter(i => i.paymentStatus !== "paid").length;

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {overdueCount > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">
            <span className="font-semibold">{overdueCount} overdue invoice{overdueCount > 1 ? "s" : ""}</span>
            {" "}totaling {fmt(buckets.d31_60 + buckets.d61_90 + buckets.over90)}
          </p>
        </div>
      )}

      {/* Aging Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Outstanding", value: fmt(buckets.total), icon: DollarSign, accent: true },
          { label: "Current (0–30)", value: fmt(buckets.current), icon: Clock, color: "text-accent" },
          { label: "31–60 Days", value: fmt(buckets.d31_60), icon: Clock, color: "text-amber-500" },
          { label: "61–90 Days", value: fmt(buckets.d61_90), icon: AlertTriangle, color: "text-orange-500" },
          { label: "Over 90 Days", value: fmt(buckets.over90), icon: AlertTriangle, color: "text-destructive" },
        ].map(card => (
          <Card key={card.label} className={card.accent ? "ring-2 ring-accent/20" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <card.icon className={`h-3.5 w-3.5 ${card.color || "text-accent"}`} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</span>
              </div>
              <p className={`text-xl font-bold tabular-nums ${card.color || "text-foreground"}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aging Chart + Stats */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              Aging Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [fmt(value), "Amount"]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Total Invoices", value: invoices.length },
              { label: "Unpaid", value: unpaidCount, color: unpaidCount > 0 ? "text-amber-500" : undefined },
              { label: "Overdue", value: overdueCount, color: overdueCount > 0 ? "text-destructive" : undefined },
              { label: "Paid", value: invoices.length - unpaidCount, color: "text-emerald-600" },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className={`text-lg font-bold tabular-nums ${stat.color || "text-foreground"}`}>{stat.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-accent" />
              Invoices
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search invoices…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">No invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground p-4 text-xs">Invoice</th>
                    <th className="text-left font-medium text-muted-foreground p-4 text-xs">Shipment</th>
                    <th className="text-right font-medium text-muted-foreground p-4 text-xs">Amount</th>
                    <th className="text-left font-medium text-muted-foreground p-4 text-xs">Due Date</th>
                    <th className="text-center font-medium text-muted-foreground p-4 text-xs">Aging</th>
                    <th className="text-center font-medium text-muted-foreground p-4 text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map(inv => (
                    <tr
                      key={inv.id}
                      className="border-b last:border-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/dashboard/shipments/${inv.shipment_id}`)}
                    >
                      <td className="p-4 font-mono text-xs font-medium text-accent">{inv.invoice_ref || inv.id.slice(0, 8)}</td>
                      <td className="p-4">
                        <p className="text-xs font-medium text-foreground">{inv.shipmentRef}</p>
                        <p className="text-[10px] text-muted-foreground">{inv.route}</p>
                      </td>
                      <td className="p-4 text-right font-mono font-semibold tabular-nums text-foreground">{fmt(inv.amount)}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {inv.date ? format(new Date(inv.date), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="p-4 text-center"><AgingBadge days={inv.agingDays} /></td>
                      <td className="p-4 text-center"><StatusBadge status={inv.paymentStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
