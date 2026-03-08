import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, DollarSign, Target, Users, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

const AdminSalesAnalytics = () => {
  const { data: quotes } = useQuery({
    queryKey: ["admin-analytics-quotes"],
    queryFn: async () => {
      const { data } = await supabase.from("quotes").select("id, status, customer_price, carrier_cost, currency, created_at, carrier, origin_port, destination_port");
      return data || [];
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["admin-analytics-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, stage, source, score, created_at");
      return data || [];
    },
  });

  const { data: shipments } = useQuery({
    queryKey: ["admin-analytics-shipments"],
    queryFn: async () => {
      const { data } = await supabase.from("shipments").select("id, status, created_at, origin_port, destination_port");
      return data || [];
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["admin-analytics-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, status, created_at");
      return data || [];
    },
  });

  const isLoading = !quotes || !leads || !shipments || !companies;

  // Compute metrics
  const totalQuoteValue = quotes?.reduce((sum, q: any) => sum + (Number(q.customer_price) || 0), 0) || 0;
  const approvedQuotes = quotes?.filter((q: any) => q.status === "approved") || [];
  const totalMargin = approvedQuotes.reduce((sum, q: any) => sum + ((Number(q.customer_price) || 0) - (Number(q.carrier_cost) || 0)), 0);
  const conversionRate = quotes?.length ? Math.round((approvedQuotes.length / quotes.length) * 100) : 0;
  const wonLeads = leads?.filter((l: any) => l.stage === "won").length || 0;
  const leadConversion = leads?.length ? Math.round((wonLeads / leads.length) * 100) : 0;

  // Quote status distribution
  const quoteStatusData = ["pending", "sent", "approved", "rejected", "expired"].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: quotes?.filter((q: any) => q.status === s).length || 0,
  })).filter(d => d.value > 0);

  // Lead source distribution
  const leadSourceData = ["manual", "referral", "website", "event", "cold_outreach", "partner"].map(s => ({
    name: s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    value: leads?.filter((l: any) => l.source === s).length || 0,
  })).filter(d => d.value > 0);

  // Lead stage funnel
  const funnelData = ["new", "contacted", "qualified", "proposal", "negotiation", "won"].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    count: leads?.filter((l: any) => l.stage === s).length || 0,
  }));

  // Monthly quotes trend (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear();
    const m = d.getMonth();
    const quoteCount = quotes?.filter((q: any) => { const cd = new Date(q.created_at); return cd.getMonth() === m && cd.getFullYear() === year; }).length || 0;
    const shipmentCount = shipments?.filter((s: any) => { const cd = new Date(s.created_at); return cd.getMonth() === m && cd.getFullYear() === year; }).length || 0;
    return { month, quotes: quoteCount, shipments: shipmentCount };
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Sales Analytics</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">Revenue, conversions, and pipeline performance metrics</p>
      </div>

      {isLoading ? <Skeleton className="h-96 w-full bg-[hsl(220,15%,15%)]" /> : (
        <>
          {/* KPI Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Quote Value", value: `$${totalQuoteValue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
              { label: "Quote Conversion", value: `${conversionRate}%`, icon: Percent, color: "text-blue-400" },
              { label: "Lead Conversion", value: `${leadConversion}%`, icon: Target, color: "text-amber-400" },
              { label: "Gross Margin", value: `$${totalMargin.toLocaleString()}`, icon: TrendingUp, color: "text-indigo-400" },
            ].map(m => (
              <div key={m.label} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">{m.label}</p>
                </div>
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {/* Sub KPIs */}
            {[
              { label: "Total Quotes", value: quotes?.length || 0, color: "text-white" },
              { label: "Active Companies", value: companies?.filter((c: any) => c.status === "active").length || 0, color: "text-emerald-400" },
              { label: "Total Leads", value: leads?.length || 0, color: "text-blue-400" },
              { label: "Active Shipments", value: shipments?.filter((s: any) => !["delivered", "cancelled"].includes(s.status)).length || 0, color: "text-amber-400" },
            ].map(m => (
              <div key={m.label} className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-4 flex items-center gap-4">
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-[hsl(220,10%,50%)]">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Trend */}
            <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Monthly Quotes & Shipments</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220,10%,45%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,45%)" }} />
                  <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                  <Bar dataKey="quotes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="shipments" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Lead Funnel */}
            <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Lead Pipeline Funnel</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,18%)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(220,10%,45%)" }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(220,10%,45%)" }} width={80} />
                  <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quote Status Pie */}
            <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Quote Status Distribution</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={quoteStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {quoteStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Lead Source Pie */}
            <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Lead Sources</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={leadSourceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {leadSourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,15%,20%)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminSalesAnalytics;
