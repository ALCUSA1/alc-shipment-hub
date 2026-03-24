import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, TrendingUp, ArrowUpRight, Award, Sparkles, Users, Package,
  Wallet, CreditCard, Clock, Target, Trophy, Zap, ChevronRight, Gift,
  BarChart3
} from "lucide-react";

const Earnings = () => {
  const { user } = useAuth();

  /* ─── Fetch earnings data ─── */
  const { data: earningsRows = [], isLoading: loadingEarnings } = useQuery({
    queryKey: ["earnings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("earnings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: balance } = useQuery({
    queryKey: ["earnings-balance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("earnings_balance")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["pipeline-deals-summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_deals")
        .select("id, stage, estimated_earnings, confirmed_earnings, title, company_name")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  /* ─── Computed values ─── */
  const now = new Date();
  const thisMonthEarnings = earningsRows
    .filter((e) => new Date(e.created_at).getMonth() === now.getMonth() && new Date(e.created_at).getFullYear() === now.getFullYear())
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const lifetimeEarnings = balance?.lifetime_earnings || earningsRows.reduce((s, e) => s + Number(e.amount || 0), 0);
  const availableBalance = balance?.available_balance || 0;
  const pendingBalance = balance?.pending_balance || earningsRows.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.amount || 0), 0);

  // Breakdown by type
  const byType = (type: string) => earningsRows.filter((e) => e.earning_type === type).reduce((s, e) => s + Number(e.amount || 0), 0);
  const shipmentTotal = byType("shipment");
  const referralTotal = byType("referral");
  const capacityTotal = byType("capacity");
  const totalAll = shipmentTotal + referralTotal + capacityTotal || 1;
  const BREAKDOWN = [
    { label: "Shipment Collaborations", amount: shipmentTotal, pct: Math.round((shipmentTotal / totalAll) * 100), color: "bg-accent" },
    { label: "Referral Earnings", amount: referralTotal, pct: Math.round((referralTotal / totalAll) * 100), color: "bg-emerald-500" },
    { label: "Capacity Resale Profit", amount: capacityTotal, pct: Math.round((capacityTotal / totalAll) * 100), color: "bg-amber-500" },
  ];

  // Pending deals
  const pendingDeals = deals.filter((d) => ["deal_confirmed", "booked"].includes(d.stage));
  const activeOpps = deals.filter((d) => d.stage !== "completed").length;
  const completedDeals = deals.filter((d) => d.stage === "completed").length;
  const conversionRate = deals.length > 0 ? Math.round((completedDeals / deals.length) * 100) : 0;
  const avgPerDeal = completedDeals > 0 ? Math.round(lifetimeEarnings / completedDeals) : 0;

  // Milestones
  const MILESTONES = [
    { label: "First $100 Earned", reached: lifetimeEarnings >= 100, icon: Trophy },
    { label: "10 Deals Closed", reached: completedDeals >= 10, icon: Target },
    { label: "Top Earner Badge", reached: lifetimeEarnings >= 25000, icon: Award },
    { label: "$50K Lifetime", reached: lifetimeEarnings >= 50000, icon: Zap },
  ];

  const isEmpty = earningsRows.length === 0 && deals.length === 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-accent" />
              <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
            </div>
            <p className="text-sm text-muted-foreground">Track your income from shipments, referrals, and collaborations</p>
          </div>
          <Link to="/dashboard/pipeline">
            <Button variant="outline" size="sm" className="gap-1.5"><BarChart3 className="h-4 w-4" /> View Pipeline</Button>
          </Link>
        </div>

        {loadingEarnings ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
        ) : isEmpty ? (
          <EmptyEarnings />
        ) : (
          <>
            {/* ─── Top Earnings Cards ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <EarningsCard icon={DollarSign} label="This Month" amount={thisMonthEarnings} accent="text-accent" trend={thisMonthEarnings > 0 ? "+Active" : undefined} />
              <EarningsCard icon={TrendingUp} label="Lifetime Earnings" amount={lifetimeEarnings} accent="text-emerald-500" />
              <EarningsCard icon={Wallet} label="Available Balance" amount={availableBalance} accent="text-green-500" />
              <EarningsCard icon={Clock} label="Pending Earnings" amount={pendingBalance} accent="text-amber-500" />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left 2/3 */}
              <div className="lg:col-span-2 space-y-6">
                {/* Breakdown */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Earnings Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {BREAKDOWN.map((b) => (
                      <div key={b.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{b.label}</span>
                          <span className="font-semibold text-foreground tabular-nums">${b.amount.toLocaleString()} <span className="text-muted-foreground font-normal">({b.pct}%)</span></span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${b.pct}%` }} transition={{ duration: 0.8, delay: 0.2 }} className={`h-full rounded-full ${b.color}`} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Activity Feed */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Earnings Activity</CardTitle></CardHeader>
                  <CardContent>
                    {earningsRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No earnings activity yet.</p>
                    ) : (
                      <div className="space-y-0">
                        {earningsRows.slice(0, 10).map((a, i) => (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
                          >
                            <div className={`p-2 rounded-lg ${a.earning_type === "referral" ? "bg-emerald-100 dark:bg-emerald-900/30" : a.earning_type === "capacity" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-accent/10"}`}>
                              {a.earning_type === "referral" ? <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : a.earning_type === "capacity" ? <Package className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> : <DollarSign className="h-3.5 w-3.5 text-accent" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">{a.description}</p>
                              {a.source_ref && <p className="text-xs text-muted-foreground truncate">{a.source_ref}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">+${Number(a.amount).toLocaleString()}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pending Deals */}
                {pendingDeals.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> Active Earnings (In Progress)</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {pendingDeals.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{p.title}</p>
                            <p className="text-xs text-muted-foreground">{p.company_name || "—"} · {p.stage === "deal_confirmed" ? "Deal Confirmed" : "Booked"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">${(p.confirmed_earnings || p.estimated_earnings || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">Expected</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right sidebar */}
              <div className="space-y-6">
                {/* Performance Metrics */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Performance</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <MetricRow label="Conversion Rate" value={`${conversionRate}%`} icon={Target} />
                    <MetricRow label="Avg. Earnings / Deal" value={`$${avgPerDeal}`} icon={TrendingUp} />
                    <MetricRow label="Active Opportunities" value={activeOpps.toString()} icon={Sparkles} />
                  </CardContent>
                </Card>

                {/* How to Earn More */}
                <Card className="border-accent/30 bg-gradient-to-b from-accent/5 to-transparent">
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Gift className="h-4 w-4 text-accent" /> Earn More</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <EarnOption title="Refer a Shipper" desc="Earn $25 per successful referral" cta="Invite" icon={Users} href="/dashboard/spark" />
                    <EarnOption title="Engage Opportunities" desc="Earn $50–$500 per deal" cta="Go to Spark" icon={Sparkles} href="/dashboard/spark" />
                    <EarnOption title="Resell Capacity" desc="Keep your margin on unused space" cta="View RFQs" icon={Package} href="/dashboard/spark" />
                  </CardContent>
                </Card>

                {/* Milestones */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Milestones</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {MILESTONES.map((m) => (
                      <div key={m.label} className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${m.reached ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                          <m.icon className={`h-3.5 w-3.5 ${m.reached ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
                        </div>
                        <span className={`text-sm ${m.reached ? "text-foreground font-medium" : "text-muted-foreground"}`}>{m.label}</span>
                        {m.reached && <Badge className="ml-auto text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">✓</Badge>}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Withdraw */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-accent" /> Payout</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-foreground tabular-nums">${availableBalance.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Available Balance</p>
                    </div>
                    <Button variant="electric" className="w-full gap-2" disabled={availableBalance <= 0}><Wallet className="h-4 w-4" /> Withdraw Funds</Button>
                    <p className="text-[10px] text-muted-foreground text-center">Payment via ACH · 2-3 business days</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

/* ─── Sub-components ─── */
function EarningsCard({ icon: Icon, label, amount, accent, trend }: { icon: any; label: string; amount: number; accent: string; trend?: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg bg-muted ${accent}`}><Icon className="h-4 w-4" /></div>
          {trend && <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px]"><ArrowUpRight className="h-3 w-3 mr-0.5" />{trend}</Badge>}
        </div>
        <p className="text-2xl font-bold text-foreground tabular-nums">${amount.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-1.5 rounded-lg bg-muted"><Icon className="h-3.5 w-3.5 text-muted-foreground" /></div>
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function EarnOption({ title, desc, cta, icon: Icon, href }: { title: string; desc: string; cta: string; icon: any; href: string }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border/50">
      <div className="p-2 rounded-lg bg-accent/10"><Icon className="h-4 w-4 text-accent" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <Link to={href}><Button variant="ghost" size="sm" className="text-xs text-accent shrink-0">{cta} <ChevronRight className="h-3 w-3" /></Button></Link>
    </div>
  );
}

function EmptyEarnings() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-full bg-accent/10 mb-4"><DollarSign className="h-8 w-8 text-accent" /></div>
      <h3 className="text-lg font-semibold text-foreground mb-2">You haven't earned yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">Start by engaging in opportunities on Spark to build your pipeline and earn from shipments, referrals, and capacity resale.</p>
      <Link to="/dashboard/spark">
        <Button variant="electric" className="gap-2"><Sparkles className="h-4 w-4" /> Go to Spark</Button>
      </Link>
    </motion.div>
  );
}

export default Earnings;
