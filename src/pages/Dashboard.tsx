import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { canAccessRoute } from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, startOfMonth, endOfMonth, formatDistanceToNow } from "date-fns";
import {
  Package, DollarSign, Truck, Warehouse, Clock, ArrowRight, TrendingUp,
  ContactRound, Plus, Layers, FileText, Zap, Ship, Plane, CheckCircle2
} from "lucide-react";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";

interface ShipmentRow {
  id: string;
  shipment_ref: string;
  origin_port: string | null;
  destination_port: string | null;
  status: string;
  mode: string | null;
  created_at: string;
  updated_at: string;
  etd: string | null;
  eta: string | null;
  companies: { company_name: string } | null;
}

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  booked: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  in_transit: "bg-accent/10 text-accent",
  arrived: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabel: Record<string, string> = {
  draft: "Draft", booked: "Booked", in_transit: "In Transit",
  arrived: "Arrived", delivered: "Delivered", cancelled: "Cancelled",
};

const PIE_COLORS = [
  "hsl(217, 95%, 58%)", "hsl(45, 93%, 55%)", "hsl(160, 60%, 45%)",
  "hsl(200, 70%, 55%)", "hsl(0, 84%, 60%)", "hsl(215, 14%, 70%)",
];

const Dashboard = () => {
  const { user } = useAuth();
  const { roles } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingQuotes, setPendingQuotes] = useState(0);
  const [truckPickups, setTruckPickups] = useState(0);
  const [warehouseArrivals, setWarehouseArrivals] = useState(0);
  const [recentEventsCount, setRecentEventsCount] = useState(0);
  const [recentShipments, setRecentShipments] = useState<ShipmentRow[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; shipments: number; quotes: number }[]>([]);
  const [companyCount, setCompanyCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [templateCount, setTemplateCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const [shipmentsRes, quotesRes, pickupsRes, warehouseRes, recentShipmentsRes, allShipmentsRes, templatesRes] = await Promise.all([
        supabase.from("shipments").select("id, status", { count: "exact" }).in("status", ["booked", "in_transit", "arrived"]),
        supabase.from("quotes").select("id", { count: "exact" }).eq("status", "pending").eq("user_id", user!.id),
        supabase.from("trucking_quotes").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("warehouse_orders").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("shipments").select("id, shipment_ref, origin_port, destination_port, status, mode, created_at, updated_at, etd, eta, companies(company_name)").order("created_at", { ascending: false }).limit(6),
        supabase.from("shipments").select("id, status, created_at"),
        supabase.from("shipment_templates").select("id", { count: "exact" }).eq("user_id", user!.id),
      ]);

      setActiveCount(shipmentsRes.count ?? 0);
      setPendingQuotes(quotesRes.count ?? 0);
      setTruckPickups(pickupsRes.count ?? 0);
      setWarehouseArrivals(warehouseRes.count ?? 0);
      setRecentShipments((recentShipmentsRes.data as ShipmentRow[]) ?? []);
      setTemplateCount(templatesRes.count ?? 0);

      const allShipments = allShipmentsRes.data || [];
      const statusMap: Record<string, number> = {};
      for (const s of allShipments) statusMap[s.status] = (statusMap[s.status] || 0) + 1;
      setStatusBreakdown(Object.entries(statusMap).map(([name, value]) => ({ name: statusLabel[name] || name, value })));

      const months: { month: string; shipments: number; quotes: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const start = startOfMonth(d).toISOString();
        const end = endOfMonth(d).toISOString();
        months.push({ month: format(d, "MMM"), shipments: allShipments.filter(s => s.created_at >= start && s.created_at <= end).length, quotes: 0 });
      }
      const { data: allQuotes } = await supabase.from("quotes").select("id, created_at");
      if (allQuotes) {
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(new Date(), i);
          const start = startOfMonth(d).toISOString();
          const end = endOfMonth(d).toISOString();
          months[5 - i].quotes = allQuotes.filter(q => q.created_at >= start && q.created_at <= end).length;
        }
      }
      setMonthlyTrend(months);

      const { count: crmCount } = await supabase.from("companies").select("id", { count: "exact" });
      setCompanyCount(crmCount ?? 0);

      const { data: revenueData } = await supabase.from("quotes").select("amount").eq("status", "accepted");
      setTotalRevenue((revenueData || []).reduce((sum, q) => sum + (q.amount || 0), 0));

      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { count: updatedCount } = await supabase.from("shipments").select("id", { count: "exact" }).gte("updated_at", yesterday);
      setRecentEventsCount(updatedCount ?? 0);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const canOps = canAccessRoute("/dashboard/trucking", roles);
  const canSales = canAccessRoute("/dashboard/crm", roles);

  const stats = [
    { label: "Active Shipments", value: activeCount, icon: Package, sub: "Booked, in transit & arrived", link: "/dashboard/shipments", accent: "text-accent" },
    { label: "Pending Quotes", value: pendingQuotes, icon: DollarSign, sub: "Awaiting response", link: "/dashboard/quotes", accent: "text-yellow-500" },
    ...(canOps ? [
      { label: "Trucking Queue", value: truckPickups, icon: Truck, sub: "Pending pickups", link: "/dashboard/trucking", accent: "text-orange-500" },
      { label: "Warehouse Queue", value: warehouseArrivals, icon: Warehouse, sub: "Pending cargo", link: "/dashboard/warehouses", accent: "text-violet-500" },
    ] : []),
    { label: "Recent Updates", value: recentEventsCount, icon: Clock, sub: "Last 24 hours", link: "/dashboard/shipments", accent: "text-emerald-500" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}: <span className="font-medium">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  const isEmpty = !loading && recentShipments.length === 0 && pendingQuotes === 0;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Shipment coordination overview</p>
        </div>
        <div className="flex items-center gap-2">
          {templateCount > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/templates">
                <FileText className="mr-2 h-4 w-4" />
                Templates ({templateCount})
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/pipeline">
              <Layers className="mr-2 h-4 w-4" />
              Pipeline
            </Link>
          </Button>
          <Button variant="electric" size="sm" asChild>
            <Link to="/dashboard/quotes/new">
              <Plus className="mr-2 h-4 w-4" />
              New Quote
            </Link>
          </Button>
        </div>
      </div>

      {/* Getting Started */}
      {isEmpty && (
        <Card className="mb-8 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Welcome to ALC Shipper Portal</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Follow this flow: <strong>Quote → Approve → Convert to Shipment → Track & Deliver</strong>
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Link to="/dashboard/crm" className="group rounded-xl border border-border bg-card p-4 hover:border-accent/40 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">1</span>
                      <span className="text-sm font-medium text-foreground">Add a Customer</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Go to CRM and add your first customer account.</p>
                  </Link>
                  <Link to="/dashboard/quotes/new" className="group rounded-xl border border-border bg-card p-4 hover:border-accent/40 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">2</span>
                      <span className="text-sm font-medium text-foreground">Create a Quote</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Pick a route, carrier rate, add margin, and send.</p>
                  </Link>
                  <Link to="/dashboard/quotes" className="group rounded-xl border border-border bg-card p-4 hover:border-accent/40 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">3</span>
                      <span className="text-sm font-medium text-foreground">Convert to Shipment</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Once approved, convert into a tracked shipment.</p>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} to={s.link} className="group">
            <Card className="transition-all group-hover:shadow-md group-hover:border-accent/20 h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</CardTitle>
                <s.icon className={`h-4 w-4 ${s.accent}`} />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-16" /> : (
                  <div className="text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">{s.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <CardTitle className="text-base">Monthly Activity</CardTitle>
            </div>
            <CardDescription>Shipments and quotes — last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[220px] w-full" /> : monthlyTrend.every(m => m.shipments === 0 && m.quotes === 0) ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No activity data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="shipments" name="Shipments" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.12} strokeWidth={2} />
                  <Area type="monotone" dataKey="quotes" name="Quotes" stroke="hsl(45, 93%, 55%)" fill="hsl(45, 93%, 55%)" fillOpacity={0.08} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[220px] w-full" /> : statusBreakdown.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No shipments yet</div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={3} strokeWidth={0}>
                      {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
                  {statusBreakdown.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="font-semibold text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue + CRM for sales roles */}
      {canSales && (
        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-card to-accent/[0.02]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-base">Revenue</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-10 w-32" /> : (
                <div className="text-3xl font-bold text-foreground tabular-nums">
                  ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Total from accepted quotes</p>
            </CardContent>
          </Card>
          {companyCount > 0 && (
            <Link to="/dashboard/crm">
              <Card className="h-full hover:shadow-md transition-all hover:border-accent/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">CRM Accounts</CardTitle>
                  <ContactRound className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{companyCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active customer & partner accounts</p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Recent Shipments — Premium Card Layout */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Shipments</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/shipments" className="text-accent text-xs font-medium">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : recentShipments.length === 0 ? (
            <div className="text-center py-10">
              <Package className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No shipments yet</p>
              <p className="text-xs text-muted-foreground/60">Create a quote to generate your first shipment</p>
              <Button variant="electric" size="sm" className="mt-4" asChild>
                <Link to="/dashboard/quotes/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Quote
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentShipments.map((s) => {
                const companyName = (s.companies as any)?.company_name;
                const ModeIcon = s.mode === "air" ? Plane : Ship;
                return (
                  <Link
                    key={s.id}
                    to={`/dashboard/shipments/${s.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-border hover:bg-secondary/40 transition-all group"
                  >
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                      <ModeIcon className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-accent font-mono">{s.shipment_ref}</span>
                        {companyName && <span className="text-xs text-muted-foreground truncate">· {companyName}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.origin_port || "—"} → {s.destination_port || "—"}
                        {s.etd && <span className="ml-2">· ETD {format(new Date(s.etd), "MMM d")}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary" className={`text-[10px] ${statusColor[s.status] || "bg-secondary text-muted-foreground"}`}>
                        {s.status === "delivered" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {statusLabel[s.status] || s.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/60 hidden sm:block w-16 text-right">
                        {formatDistanceToNow(new Date(s.updated_at || s.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Dashboard;
