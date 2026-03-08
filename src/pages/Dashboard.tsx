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
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  Package, DollarSign, Truck, Warehouse, Clock, ArrowRight, TrendingUp,
  ContactRound, Plus, Layers, FileText, Zap
} from "lucide-react";
import { DashboardActionBanners } from "@/components/dashboard/DashboardActionBanners";
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
  created_at: string;
  companies: { company_name: string } | null;
}

const statusColor: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  booked: "bg-yellow-100 text-yellow-700",
  in_transit: "bg-accent/10 text-accent",
  arrived: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
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
  const [acceptedQuotes, setAcceptedQuotes] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const [shipmentsRes, quotesRes, pickupsRes, warehouseRes, recentShipmentsRes, allShipmentsRes, acceptedQuotesRes] = await Promise.all([
        supabase.from("shipments").select("id, status", { count: "exact" }).in("status", ["booked", "in_transit", "arrived"]),
        supabase.from("quotes").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("truck_pickups").select("id", { count: "exact" }).eq("status", "scheduled"),
        supabase.from("warehouse_operations").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("shipments").select("id, shipment_ref, origin_port, destination_port, status, created_at, companies(company_name)").order("created_at", { ascending: false }).limit(5),
        supabase.from("shipments").select("id, status, created_at"),
        supabase.from("quotes").select("id", { count: "exact" }).eq("status", "accepted"),
      ]);

      setActiveCount(shipmentsRes.count ?? 0);
      setPendingQuotes(quotesRes.count ?? 0);
      setTruckPickups(pickupsRes.count ?? 0);
      setWarehouseArrivals(warehouseRes.count ?? 0);
      setRecentShipments((recentShipmentsRes.data as ShipmentRow[]) ?? []);
      setAcceptedQuotes(acceptedQuotesRes.count ?? 0);

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
    { label: "Active Shipments", value: activeCount, icon: Package, sub: "Booked, in transit & arrived", link: "/dashboard/shipments" },
    { label: "Pending Quotes", value: pendingQuotes, icon: DollarSign, sub: "Awaiting customer response", link: "/dashboard/quotes" },
    ...(canOps ? [
      { label: "Truck Pickups", value: truckPickups, icon: Truck, sub: "Scheduled pickups", link: "/dashboard/trucking" },
      { label: "Warehouse Arrivals", value: warehouseArrivals, icon: Warehouse, sub: "Pending cargo", link: "/dashboard/warehouses" },
    ] : []),
    { label: "Recent Updates", value: recentEventsCount, icon: Clock, sub: "Last 24 hours", link: "/dashboard/shipments" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border rounded-lg px-3 py-2 shadow-md text-xs">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  // Determine if user is brand new (no shipments, no quotes)
  const isEmpty = !loading && recentShipments.length === 0 && pendingQuotes === 0;

  return (
    <DashboardLayout>
      {/* Header with Quick Actions */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your shipment coordination overview</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Getting Started Guide — shown when platform is empty */}
      {isEmpty && (
        <Card className="mb-8 border-accent/30 bg-accent/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Welcome! Here's how to get started</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The platform follows a simple flow: <strong>Quote → Approve → Convert to Shipment → Track & Deliver</strong>
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Link to="/dashboard/crm" className="group rounded-lg border border-border bg-card p-4 hover:border-accent/50 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">1</span>
                      <span className="text-sm font-medium text-foreground">Add a Customer</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Go to CRM and add your first customer account with compliance details.</p>
                  </Link>
                  <Link to="/dashboard/quotes/new" className="group rounded-lg border border-border bg-card p-4 hover:border-accent/50 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">2</span>
                      <span className="text-sm font-medium text-foreground">Create a Quote</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Select a route, pick a carrier rate, add your margin, and send to your customer.</p>
                  </Link>
                  <Link to="/dashboard/quotes" className="group rounded-lg border border-border bg-card p-4 hover:border-accent/50 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">3</span>
                      <span className="text-sm font-medium text-foreground">Convert to Shipment</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Once approved, convert the quote into a shipment with auto-generated documents.</p>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Items — things that need attention */}
      {!loading && (acceptedQuotes > 0 || pendingQuotes > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {acceptedQuotes > 0 && (
            <Link to="/dashboard/quotes" className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {acceptedQuotes} quote{acceptedQuotes > 1 ? "s" : ""} ready to convert
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-green-600" />
            </Link>
          )}
          {pendingQuotes > 0 && (
            <Link to="/dashboard/quotes" className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">
                {pendingQuotes} quote{pendingQuotes > 1 ? "s" : ""} awaiting approval
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-yellow-600" />
            </Link>
          )}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} to={s.link} className="group">
            <Card className="transition-shadow group-hover:shadow-md h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-16" /> : (
                  <div className="text-2xl font-bold text-foreground">{s.value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <CardTitle className="text-base">Monthly Activity</CardTitle>
            </div>
            <CardDescription>Shipments and quotes over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[220px] w-full" /> : monthlyTrend.every(m => m.shipments === 0 && m.quotes === 0) ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No activity data yet. Create shipments and quotes to see trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 14%, 45%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(215, 14%, 45%)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="shipments" name="Shipments" stroke="hsl(217, 95%, 58%)" fill="hsl(217, 95%, 58%)" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="quotes" name="Quotes" stroke="hsl(45, 93%, 55%)" fill="hsl(45, 93%, 55%)" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipment Status</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[220px] w-full" /> : statusBreakdown.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No shipments yet</div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                  {statusBreakdown.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="font-medium text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue card for sales roles */}
      {canSales && (
        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                <CardTitle className="text-base">Revenue from Accepted Quotes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-10 w-32" /> : (
                <div className="text-3xl font-bold text-foreground">
                  ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Total from accepted quotes</p>
            </CardContent>
          </Card>
          {companyCount > 0 && (
            <Link to="/dashboard/crm">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">CRM Companies</CardTitle>
                  <ContactRound className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{companyCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Recent Shipments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Shipments</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/shipments" className="text-accent text-xs">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : recentShipments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No shipments yet.</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Start by creating a quote — once approved, convert it to a shipment.</p>
              <Button variant="electric" size="sm" asChild>
                <Link to="/dashboard/quotes/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Quote
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentShipments.map((s) => (
                <Link
                  key={s.id}
                  to={`/dashboard/shipments/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-sm font-mono font-medium text-foreground shrink-0">{s.shipment_ref}</span>
                    {(s.companies as any)?.company_name && (
                      <span className="text-sm text-accent font-medium truncate">{(s.companies as any).company_name}</span>
                    )}
                    <span className="text-sm text-muted-foreground truncate hidden md:inline">
                      {s.origin_port && s.destination_port
                        ? `${s.origin_port} → ${s.destination_port}`
                        : s.origin_port || s.destination_port || "No route set"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[s.status] || "bg-secondary text-muted-foreground"}`}>
                      {statusLabel[s.status] || s.status}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {format(new Date(s.created_at), "MMM d")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Dashboard;
