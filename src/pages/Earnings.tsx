import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BackButton } from "@/components/shared/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, ArrowUpRight, Award, Sparkles, Users, Package,
  Wallet, CreditCard, Clock, Target, Trophy, Zap, ChevronRight, Gift,
  BarChart3, ArrowRight
} from "lucide-react";

/* ─── Demo data ─── */
const EARNINGS_SUMMARY = {
  thisMonth: 4850,
  lifetime: 28400,
  available: 3200,
  pending: 1650,
};

const BREAKDOWN = [
  { label: "Shipment Collaborations", amount: 18200, pct: 64, color: "bg-accent" },
  { label: "Referral Earnings", amount: 6800, pct: 24, color: "bg-emerald-500" },
  { label: "Capacity Resale Profit", amount: 3400, pct: 12, color: "bg-amber-500" },
];

const ACTIVITY = [
  { id: 1, desc: "Earned $80 from capacity resale", source: "OPP-012 · Shanghai → LA", date: "Mar 22, 2026", amount: 80, type: "capacity" },
  { id: 2, desc: "Earned $25 from referral", source: "Referred Apex Trade Co", date: "Mar 20, 2026", amount: 25, type: "referral" },
  { id: 3, desc: "Earned $120 from shipment collaboration", source: "SHP-2026-041 · Hamburg → NY", date: "Mar 18, 2026", amount: 120, type: "shipment" },
  { id: 4, desc: "Earned $45 from referral", source: "Referred Global Cargo Inc", date: "Mar 15, 2026", amount: 45, type: "referral" },
  { id: 5, desc: "Earned $200 from shipment collaboration", source: "SHP-2026-038 · Busan → LB", date: "Mar 12, 2026", amount: 200, type: "shipment" },
];

const PENDING = [
  { id: 1, title: "2x40HC Yantian → Newark", partner: "Allied Shipping", expected: 1600, stage: "Deal Confirmed" },
  { id: 2, title: "1x40HC Rotterdam → Houston", partner: "TransOcean Ltd", expected: 1400, stage: "Booked" },
];

const MILESTONES = [
  { label: "First $100 Earned", reached: true, icon: Trophy },
  { label: "10 Deals Closed", reached: true, icon: Target },
  { label: "Top Earner Badge", reached: false, icon: Award },
  { label: "$50K Lifetime", reached: false, icon: Zap },
];

const METRICS = {
  conversionRate: 68,
  avgPerDeal: 420,
  activeOpportunities: 12,
};

const Earnings = () => {
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

        {/* ─── Top Earnings Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <EarningsCard icon={DollarSign} label="This Month" amount={EARNINGS_SUMMARY.thisMonth} accent="text-accent" trend="+18%" />
          <EarningsCard icon={TrendingUp} label="Lifetime Earnings" amount={EARNINGS_SUMMARY.lifetime} accent="text-emerald-500" />
          <EarningsCard icon={Wallet} label="Available Balance" amount={EARNINGS_SUMMARY.available} accent="text-green-500" cta />
          <EarningsCard icon={Clock} label="Pending Earnings" amount={EARNINGS_SUMMARY.pending} accent="text-amber-500" />
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
                <div className="space-y-0">
                  {ACTIVITY.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
                    >
                      <div className={`p-2 rounded-lg ${a.type === "referral" ? "bg-emerald-100 dark:bg-emerald-900/30" : a.type === "capacity" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-accent/10"}`}>
                        {a.type === "referral" ? <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : a.type === "capacity" ? <Package className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> : <DollarSign className="h-3.5 w-3.5 text-accent" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{a.desc}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.source}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">+${a.amount}</p>
                        <p className="text-[10px] text-muted-foreground">{a.date}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pending Earnings */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> Active Earnings (In Progress)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {PENDING.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.partner} · {p.stage}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">${p.expected.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Expected</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Performance</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <MetricRow label="Conversion Rate" value={`${METRICS.conversionRate}%`} icon={Target} />
                <MetricRow label="Avg. Earnings / Deal" value={`$${METRICS.avgPerDeal}`} icon={TrendingUp} />
                <MetricRow label="Active Opportunities" value={METRICS.activeOpportunities.toString()} icon={Sparkles} />
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
                  <p className="text-3xl font-bold text-foreground tabular-nums">${EARNINGS_SUMMARY.available.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Available Balance</p>
                </div>
                <Button variant="electric" className="w-full gap-2"><Wallet className="h-4 w-4" /> Withdraw Funds</Button>
                <p className="text-[10px] text-muted-foreground text-center">Payment via ACH · 2-3 business days</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

/* ─── Sub-components ─── */
function EarningsCard({ icon: Icon, label, amount, accent, trend, cta }: { icon: any; label: string; amount: number; accent: string; trend?: string; cta?: boolean }) {
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

export default Earnings;
