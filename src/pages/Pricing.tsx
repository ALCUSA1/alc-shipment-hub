import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Trophy, Sparkles, Target, Rocket, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number) => `$${n.toLocaleString()}`;

interface VolumeRow {
  ships: string;
  rate: string;
  alcPerShip: string;
  alcTotal: string;
  agentTotal: string;
  status: string;
  tone: "muted" | "highlight" | "success" | "elite";
}

const VOLUME_ROWS: VolumeRow[] = [
  { ships: "5 shipments", rate: "$3,000", alcPerShip: "$500", alcTotal: "$2,500", agentTotal: "$2,500", status: "Building", tone: "muted" },
  { ships: "10 shipments", rate: "$3,000", alcPerShip: "$500", alcTotal: "$5,000", agentTotal: "$5,000", status: "Growing", tone: "muted" },
  { ships: "25 shipments", rate: "$2,800", alcPerShip: "$300", alcTotal: "$7,500", agentTotal: "$17,500", status: "UNLOCKED", tone: "highlight" },
  { ships: "35 shipments", rate: "$2,800", alcPerShip: "$300", alcTotal: "$10,500", agentTotal: "$24,500", status: "Scaling", tone: "success" },
  { ships: "50 shipments", rate: "$2,800", alcPerShip: "$300", alcTotal: "$15,000", agentTotal: "$35,000", status: "Top agent", tone: "success" },
  { ships: "100 shipments", rate: "$2,800", alcPerShip: "$300", alcTotal: "$30,000", agentTotal: "$70,000", status: "Elite", tone: "elite" },
];

const MILESTONE_ROWS = [
  { tier: "0–24 ships", subsidy: "$0", agentRate: "$3,000", alcPer: "$500", agentPer: "$500", note: "Standard model" },
  { tier: "25+ ships", subsidy: "$200", agentRate: "$2,800", alcPer: "$300", agentPer: "$700", note: "Volume growth compensates", highlight: true },
  { tier: "50+ ships", subsidy: "$400", agentRate: "$2,600", alcPer: "$100", agentPer: "$900", note: "BCO carrier rates restore margin to $600+" },
];

const KPIS = [
  { label: "Milestone trigger", value: "25 ships", sub: "per month" },
  { label: "ALC subsidy", value: "$200", sub: "per shipment" },
  { label: "Agent rate drops", value: "$3K → $2.8K", sub: "immediate" },
  { label: "Agent earns more", value: "+40%", sub: "per shipment" },
  { label: "ALC gains at milestone", value: "+$2,500", sub: "vs 10 ships" },
  { label: "Self-funded", value: "100%", sub: "volume pays for it" },
];

export default function Pricing() {
  return (
    <MarketingLayout>
      <SEO
        title="Agent Pricing — Volume-Based Subsidies | ALC"
        description="No subscription fees. Hit 25 shipments/month and ALC absorbs $200 per shipment. Hit 50 and get $400. Self-funded by volume — agents earn up to 40% more."
        canonical="https://alllogisticscargo.com/pricing"
      />

      {/* Hero */}
      <section className="pt-20 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold tracking-wider text-accent uppercase">No subscription · pay by performance</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
            The $200 Carrier Subsidy Milestone
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            After 25 shipments/month ALC absorbs $200 per shipment — agent rate drops from $3,000 to $2,800. Self-funded by volume.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="electric" size="lg" asChild>
              <Link to="/signup">
                Become an ALC Agent
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Before vs After */}
      <section className="px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4 text-center">
            Before vs After — exactly what changes
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {/* Before */}
            <Card className="border-2 border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Below 25 Shipments
                  </h3>
                </div>
                <dl className="space-y-2.5">
                  {[
                    ["Carrier charges ALC", "$2,500"],
                    ["ALC charges agent", "$3,000"],
                    ["Agent charges client", "$3,500"],
                    ["ALC earns / shipment", "$500"],
                    ["Agent earns / shipment", "$500"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-amber-500/10 pb-2 last:border-0 last:pb-0">
                      <dt className="text-sm text-muted-foreground">{k}</dt>
                      <dd className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 rounded-lg bg-amber-200/40 dark:bg-amber-500/10 px-3 py-2 text-center text-xs font-bold text-amber-700 dark:text-amber-400">
                  Standard rate. No advantage.
                </div>
              </CardContent>
            </Card>

            {/* After */}
            <Card className="border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Rocket className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    25+ Shipments Unlocked
                  </h3>
                </div>
                <dl className="space-y-2.5">
                  {[
                    ["Carrier charges ALC", "$2,500 (same)"],
                    ["ALC absorbs subsidy", "−$200"],
                    ["ALC charges agent", "$2,800 ↓"],
                    ["ALC earns / shipment", "$300"],
                    ["Agent earns / shipment", "$500–$700"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-emerald-500/10 pb-2 last:border-0 last:pb-0">
                      <dt className="text-sm text-muted-foreground">{k}</dt>
                      <dd className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 rounded-lg bg-emerald-200/40 dark:bg-emerald-500/10 px-3 py-2 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  $200 rate advantage. Agent wins.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Agent's two choices */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-4 text-center">
            Agent has two choices — both are wins
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {/* Choice A */}
            <Card className="border-t-4 border-t-blue-500">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-foreground mb-4">Choice A — Pass savings to client</h3>
                <dl className="space-y-2 text-sm">
                  {[
                    ["ALC rate", "$2,800"],
                    ["Agent quotes client", "$3,300"],
                    ["Agent earns", "$500 / ship"],
                    ["vs competitors", "$200 cheaper"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border pb-1.5 last:border-0">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-semibold text-foreground tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 rounded-lg bg-secondary px-3 py-2.5 text-xs text-foreground/80 font-medium flex items-start gap-2">
                  <Trophy className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                  Wins clients that competitors cannot match on price. Volume grows further.
                </div>
              </CardContent>
            </Card>

            {/* Choice B */}
            <Card className="border-t-4 border-t-violet-500">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-foreground mb-4">Choice B — Keep as extra profit</h3>
                <dl className="space-y-2 text-sm">
                  {[
                    ["ALC rate", "$2,800"],
                    ["Agent quotes client", "$3,500"],
                    ["Agent earns", "$700 / ship"],
                    ["Earnings increase", "+40%"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border pb-1.5 last:border-0">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-semibold text-foreground tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 rounded-lg bg-secondary px-3 py-2.5 text-xs text-foreground/80 font-medium flex items-start gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                  40% more earnings per shipment with zero extra work. Loyalty locked.
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-5 rounded-lg bg-secondary/60 border border-border px-4 py-3 text-center text-sm font-medium text-foreground">
            Either way — the agent never wants to drop below 25 shipments again. That is the stickiness.
          </div>
        </div>
      </section>

      {/* Volume table */}
      <section className="px-6 pb-16 bg-secondary/30 border-y border-border py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
            ALC Earns More After the Milestone
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">Self-funded proof — volume growth more than compensates.</p>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-4 py-3 font-semibold">Ships / month</th>
                    <th className="text-right px-4 py-3 font-semibold">ALC rate</th>
                    <th className="text-right px-4 py-3 font-semibold">ALC / ship</th>
                    <th className="text-right px-4 py-3 font-semibold">ALC total</th>
                    <th className="text-right px-4 py-3 font-semibold">Agent total</th>
                    <th className="text-right px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {VOLUME_ROWS.map((r, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-t border-border",
                        r.tone === "highlight" && "bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold",
                      )}
                    >
                      <td className="px-4 py-3 text-foreground">{r.ships}{r.tone === "highlight" ? " 🎯" : ""}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.rate}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.alcPerShip}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.alcTotal}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.agentTotal}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            r.tone === "muted" && "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
                            r.tone === "highlight" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
                            r.tone === "success" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
                            r.tone === "elite" && "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
                          )}
                        >
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="mt-4 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 text-center font-medium">
            ALC earns $7,500/month from one agent at 25 ships vs $5,000 at 10 ships. The $200 subsidy costs ALC nothing — volume growth more than compensates.
          </div>
        </div>
      </section>

      {/* Platform-level dark stat */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl bg-navy text-primary-foreground p-8 md:p-10">
            <p className="text-xs font-bold tracking-[0.15em] uppercase text-emerald-300 mb-6">
              50 agents all hitting milestone — platform-level numbers
            </p>
            <dl className="space-y-3">
              {[
                ["Before milestone (50 agents × 10 ships × $500)", "$250,000 / mo", false],
                ["After milestone (50 agents × 25 ships × $300)", "$375,000 / mo", true],
                ["ALC gains from milestone adoption", "+$125,000 / mo", true],
                ["Agent earnings before (50 × 10 × $500)", "$250,000 / mo", false],
                ["Agent earnings after (50 × 25 × $700)", "$875,000 / mo", true],
                ["FCL volume at milestone", "1,250 FCL / mo", true],
                ["Carrier negotiation power at 1,250 FCL", "BCO-level rates", true],
              ].map(([k, v, green]) => (
                <div key={k as string} className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                  <dt className="text-sm text-primary-foreground/60">{k}</dt>
                  <dd className={cn("text-sm font-bold tabular-nums", green ? "text-emerald-300" : "text-primary-foreground")}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Second milestone */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
            The Second Milestone — Unlocks at 50 Shipments
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">Bigger subsidy. Margin restored by BCO carrier rates.</p>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-4 py-3 font-semibold">Milestone</th>
                    <th className="text-right px-4 py-3 font-semibold">ALC subsidy</th>
                    <th className="text-right px-4 py-3 font-semibold">Agent rate</th>
                    <th className="text-right px-4 py-3 font-semibold">ALC earns / ship</th>
                    <th className="text-right px-4 py-3 font-semibold">Agent earns / ship</th>
                    <th className="text-left px-4 py-3 font-semibold">How ALC restores margin</th>
                  </tr>
                </thead>
                <tbody>
                  {MILESTONE_ROWS.map((r) => (
                    <tr key={r.tier} className={cn("border-t border-border", r.highlight && "bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold")}>
                      <td className="px-4 py-3 text-foreground">{r.tier}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.subsidy}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.agentRate}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.alcPer}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.agentPer}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="mt-4 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/20 px-4 py-3 text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
            <span>At the 50-ship milestone, carrier renegotiation brings ALC's cost from $2,500 → $1,900. ALC earns $700/ship again while the agent still sees $2,600. ALC's margin fully restores at scale.</span>
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {KPIS.map((k) => (
            <div key={k.label} className="rounded-xl bg-card border border-border p-4 border-l-4 border-l-accent">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{k.label}</p>
              <p className="text-xl font-bold text-accent tabular-nums leading-none">{k.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto rounded-2xl bg-gradient-to-br from-accent/10 via-card to-card border border-accent/20 p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Start earning on every shipment</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            No subscription. No setup fees. Sign up free, start booking, and watch your subsidy unlock as your volume grows.
          </p>
          <Button variant="electric" size="lg" asChild>
            <Link to="/signup">
              Become an ALC Agent
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
