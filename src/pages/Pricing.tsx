import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  Check, X, User, Users, Building2, Ship, FileText, ClipboardList,
  MapPin, CalendarClock, LineChart, LayoutGrid, Award,
  Shield, Settings, Briefcase, TrendingUp, Receipt, Headphones,
} from "lucide-react";

type BillingCycle = "monthly" | "annual";

interface Plan {
  id: "solo" | "team" | "enterprise";
  name: string;
  icon: typeof User;
  audience: string;
  monthly: number;
  annual: number;
  perShipment: number;
  popular?: boolean;
  ctaLabel: string;
  ctaTo: string;
  ctaVariant: "outline" | "electric";
  features: { label: string; included: boolean }[];
  feeNote?: string;
}

const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    icon: User,
    audience: "For independent agents · 1-person operations",
    monthly: 299,
    annual: 1990,
    perShipment: 59,
    ctaLabel: "Get started",
    ctaTo: "/signup",
    ctaVariant: "outline",
    features: [
      { label: "1 user seat", included: true },
      { label: "Up to 15 active shipments", included: true },
      { label: "All major shipping lines", included: true },
      { label: "Rate monitoring", included: true },
      { label: "Pre-booking", included: true },
      { label: "Visual space booking", included: true },
      { label: "US customs clearance", included: true },
      { label: "Pre & post shipment documentation", included: true },
      { label: "Real-time tracking", included: true },
      { label: "Standard support", included: true },
      { label: "Alliance directory listing", included: true },
      { label: "White-label client portal", included: false },
      { label: "Role management", included: false },
      { label: "API access", included: false },
    ],
  },
  {
    id: "team",
    name: "Team",
    icon: Users,
    audience: "For growing forwarders · 2–10 staff",
    monthly: 599,
    annual: 4990,
    perShipment: 59,
    popular: true,
    ctaLabel: "Get started",
    ctaTo: "/signup",
    ctaVariant: "electric",
    features: [
      { label: "Up to 10 user seats", included: true },
      { label: "Unlimited active shipments", included: true },
      { label: "All major shipping lines", included: true },
      { label: "Rate monitoring", included: true },
      { label: "Pre-booking", included: true },
      { label: "Visual space booking", included: true },
      { label: "US customs clearance", included: true },
      { label: "Pre & post shipment documentation", included: true },
      { label: "Real-time tracking", included: true },
      { label: "Priority support", included: true },
      { label: "White-label client portal", included: true },
      { label: "Basic roles (Admin · Staff)", included: true },
      { label: "Team analytics dashboard", included: true },
      { label: "API access", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Building2,
    audience: "For established operations · 10+ staff",
    monthly: 1499,
    annual: 12990,
    perShipment: 49,
    feeNote: "Lowest rate — volume reward",
    ctaLabel: "Contact us",
    ctaTo: "/signup",
    ctaVariant: "outline",
    features: [
      { label: "Unlimited user seats", included: true },
      { label: "Unlimited active shipments", included: true },
      { label: "All major shipping lines", included: true },
      { label: "Rate monitoring", included: true },
      { label: "Pre-booking", included: true },
      { label: "Visual space booking", included: true },
      { label: "US customs clearance", included: true },
      { label: "Pre & post shipment documentation", included: true },
      { label: "Real-time tracking", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "White-label client portal", included: true },
      { label: "Full role management (6 roles)", included: true },
      { label: "API access", included: true },
      { label: "Custom reporting", included: true },
      { label: "Multi-branch support", included: true },
      { label: "SLA guarantee", included: true },
      { label: "Quarterly business review", included: true },
    ],
  },
];

const BUNDLE = [
  { icon: Ship, label: "All major shipping lines (Evergreen, Hapag-Lloyd, CMA CGM)" },
  { icon: FileText, label: "US Customs clearance — fully executed" },
  { icon: ClipboardList, label: "Pre & post shipment documentation" },
  { icon: MapPin, label: "Real-time shipment tracking" },
  { icon: CalendarClock, label: "Pre-booking capability" },
  { icon: LineChart, label: "Rate monitoring" },
  { icon: LayoutGrid, label: "Visual space booking" },
  { icon: Award, label: "ALC Alliance directory listing" },
];

const ROLES = [
  { icon: Shield, name: "Admin", desc: "Full platform access · billing · settings · user management" },
  { icon: Settings, name: "Operations", desc: "Shipment management · booking · tracking · carrier coordination" },
  { icon: ClipboardList, name: "Customs", desc: "Customs clearance · documentation · compliance filing" },
  { icon: TrendingUp, name: "Sales", desc: "Rate viewing · quoting · client management · pipeline" },
  { icon: Receipt, name: "Accounting", desc: "Invoices · payments · financial reports · reconciliation" },
  { icon: Headphones, name: "Customer Service", desc: "Shipment tracking · client communications · status updates" },
];

const COMPARISON: { feature: string; solo: string; team: string; enterprise: string; gofreight: string }[] = [
  { feature: "Monthly price", solo: "$299", team: "$599", enterprise: "$1,499", gofreight: "$250–$1,000" },
  { feature: "Pricing transparency", solo: "Public", team: "Public", enterprise: "Public", gofreight: "Request only" },
  { feature: "US Customs clearance", solo: "Executed", team: "Executed", enterprise: "Executed", gofreight: "Status check only" },
  { feature: "Pre-negotiated carrier contracts", solo: "yes", team: "yes", enterprise: "yes", gofreight: "no" },
  { feature: "Documentation handling", solo: "Executed", team: "Executed", enterprise: "Executed", gofreight: "Storage only" },
  { feature: "Real-time tracking", solo: "yes", team: "yes", enterprise: "yes", gofreight: "Pro tier only" },
  { feature: "Rate monitoring", solo: "yes", team: "yes", enterprise: "yes", gofreight: "Growth tier only" },
  { feature: "Role-based access", solo: "no", team: "Basic", enterprise: "Full (6 roles)", gofreight: "no" },
  { feature: "API access", solo: "no", team: "no", enterprise: "yes", gofreight: "no" },
  { feature: "Per-shipment fee", solo: "$59", team: "$59", enterprise: "$49", gofreight: "None" },
];

const FAQ = [
  {
    q: "Is there a free trial?",
    a: "We do not offer free trials. We offer a 30-day money-back guarantee. If ALC Alliance does not deliver on its promise, we will refund your membership in full, no questions asked.",
  },
  {
    q: "What does the $59 per shipment include?",
    a: "Everything. US customs clearance, pre-shipment documentation, post-shipment documentation, and real-time tracking. No add-ons, no hidden charges.",
  },
  {
    q: "Can I upgrade my plan at any time?",
    a: "Yes. You can upgrade from Solo to Team or from Team to Enterprise at any time. Your billing adjusts from your next cycle.",
  },
  {
    q: "What are the pre-negotiated carrier contracts?",
    a: "ALC has spent 30 years building direct contracts with Evergreen, Hapag-Lloyd, and CMA CGM. When you join the Alliance, those contracts are active for you from Day 1 — no negotiations, no waiting.",
  },
  {
    q: "What is the difference between Team and Enterprise?",
    a: "Team gives up to 10 users with basic Admin and Staff roles. Enterprise gives unlimited users with six distinct role types — Admin, Operations, Customs, Sales, Accounting, and Customer Service — each with tailored permissions. Enterprise also includes API access, dedicated account management, and a lower $49 per shipment rate.",
  },
  {
    q: "Is annual billing required?",
    a: "No. Monthly billing is available on all plans. Annual billing saves you significantly — up to $4,998 on Enterprise — and we recommend it for any agent who plans to use the platform for more than three months.",
  },
];

const fmt = (n: number) => `$${n.toLocaleString()}`;

function ComparisonCell({ value, isAlc }: { value: string; isAlc: boolean }) {
  if (value === "yes") {
    return <Check className={cn("h-4 w-4 mx-auto", isAlc ? "text-accent" : "text-muted-foreground")} />;
  }
  if (value === "no") {
    return <X className="h-4 w-4 mx-auto text-destructive/70" />;
  }
  // Mixed text + check/x
  const isPositive = isAlc;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", isAlc ? "text-foreground" : "text-muted-foreground")}>
      {isPositive ? (
        <Check className="h-4 w-4 text-accent flex-shrink-0" />
      ) : (
        <X className="h-4 w-4 text-destructive/70 flex-shrink-0" />
      )}
      {value}
    </span>
  );
}

export default function Pricing() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [shipments, setShipments] = useState(20);

  const annualSavings = useMemo(() => {
    return PLANS.map((p) => ({
      id: p.id,
      saved: p.monthly * 12 - p.annual,
    }));
  }, []);
  const maxSaved = Math.max(...annualSavings.map((s) => s.saved));

  // Calculator
  const calc = useMemo(() => {
    const customs = shipments * 250;
    const docs = shipments * 100;
    const tools = 400;
    const currentTotal = customs + docs + tools;
    const alcMembership = 299;
    const alcTxn = shipments * 59;
    const alcTotal = alcMembership + alcTxn;
    const monthlySaved = Math.max(currentTotal - alcTotal, 0);
    return {
      customs, docs, tools, currentTotal,
      alcMembership, alcTxn, alcTotal,
      monthlySaved,
      annualSaved: monthlySaved * 12,
    };
  }, [shipments]);

  return (
    <MarketingLayout>
      <SEO
        title="Pricing — ALC Alliance"
        description="Simple, transparent pricing. One membership. One flat fee per shipment. Everything included."
        canonical="https://alcshipper.com/pricing"
      />

      {/* Header */}
      <section className="pt-16 pb-10 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
            ALC Alliance
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            One membership. One flat fee per shipment. Everything included.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3">
            <div className="inline-flex p-1 rounded-full border border-border bg-card">
              {(["monthly", "annual"] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBilling(cycle)}
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-medium transition-all capitalize",
                    billing === cycle
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cycle}
                </button>
              ))}
            </div>
            {billing === "annual" && (
              <span className="animate-fade-in inline-flex items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-500/30">
                Save up to {fmt(maxSaved)}/year
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-20 px-6">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const monthlyEquivalent = Math.round(plan.annual / 12);
            const saved = plan.monthly * 12 - plan.annual;
            const displayPrice = billing === "monthly" ? plan.monthly : monthlyEquivalent;
            const subPrice =
              billing === "monthly"
                ? `or ${fmt(plan.annual)}/year`
                : `${fmt(plan.annual)} billed annually`;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl bg-card p-7 flex flex-col transition-all duration-200 hover:-translate-y-0.5",
                  plan.popular
                    ? "border-2 border-accent shadow-lg shadow-accent/10 -translate-y-1"
                    : "border border-border hover:border-foreground/20"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-foreground" />
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6 min-h-[2.5rem]">
                  {plan.audience}
                </p>

                <div className="mb-1">
                  <span className="text-5xl font-bold text-foreground tabular-nums">
                    {fmt(displayPrice)}
                  </span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <div className="flex items-center gap-2 mb-6 min-h-[1.5rem]">
                  <p className="text-sm text-muted-foreground">{subPrice}</p>
                  {billing === "annual" && saved > 0 && (
                    <span className="animate-fade-in text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Save {fmt(saved)}
                    </span>
                  )}
                </div>

                <div
                  className={cn(
                    "rounded-xl px-4 py-3 mb-6",
                    plan.popular
                      ? "bg-accent/10"
                      : plan.id === "enterprise"
                      ? "bg-primary/5"
                      : "bg-secondary"
                  )}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Per shipment
                    </span>
                    <span
                      className={cn(
                        "text-2xl font-bold tabular-nums",
                        plan.popular ? "text-accent" : "text-foreground"
                      )}
                    >
                      {fmt(plan.perShipment)}
                    </span>
                  </div>
                  {plan.feeNote && (
                    <p className="text-xs text-muted-foreground mt-1">{plan.feeNote}</p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={cn(f.included ? "text-foreground" : "text-muted-foreground/60")}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button variant={plan.ctaVariant} size="lg" className="w-full" asChild>
                  <Link to={plan.ctaTo}>{plan.ctaLabel}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bundle banner */}
      <section className="px-6 py-16 bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Every plan includes the full service bundle
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Customs clearance alone costs $150–$350 per shipment elsewhere. Your flat fee covers everything.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {BUNDLE.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-xl border border-border bg-card p-5 text-center">
                  <Icon className="h-6 w-6 text-accent mx-auto mb-3" strokeWidth={1.75} />
                  <p className="text-sm text-foreground leading-snug">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enterprise roles */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Built for how freight companies actually operate
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enterprise gives every team member exactly the access they need — nothing more, nothing less.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.name} className="rounded-xl border border-border bg-card p-5 hover:border-foreground/20 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
                    <p className="font-semibold text-foreground">{r.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-6 py-20 bg-secondary/40 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              See how ALC Alliance compares
            </h2>
            <p className="text-muted-foreground">Public, transparent, and built for execution — not just status checks.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold text-muted-foreground">Feature</th>
                  <th className="p-4 font-semibold text-foreground bg-accent/5">ALC Solo</th>
                  <th className="p-4 font-semibold text-foreground bg-accent/10">ALC Team</th>
                  <th className="p-4 font-semibold text-foreground bg-accent/5">ALC Enterprise</th>
                  <th className="p-4 font-semibold text-muted-foreground">GoFreight</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={cn("border-b border-border last:border-0", i % 2 === 1 && "bg-background/40")}>
                    <td className="p-4 text-foreground font-medium">{row.feature}</td>
                    <td className="p-4 text-center bg-accent/5"><ComparisonCell value={row.solo} isAlc /></td>
                    <td className="p-4 text-center bg-accent/10"><ComparisonCell value={row.team} isAlc /></td>
                    <td className="p-4 text-center bg-accent/5"><ComparisonCell value={row.enterprise} isAlc /></td>
                    <td className="p-4 text-center"><ComparisonCell value={row.gofreight} isAlc={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Savings calculator */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              See what you save switching to ALC Alliance
            </h2>
            <p className="text-muted-foreground">Adjust your monthly shipment volume and watch the math.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <label className="block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">
                  How many shipments do you process per month?
                </span>
                <span className="text-2xl font-bold text-foreground tabular-nums">{shipments}</span>
              </div>
              <Slider
                value={[shipments]}
                onValueChange={(v) => setShipments(v[0])}
                min={1}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>1</span><span>50</span><span>100</span>
              </div>
            </label>

            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <div className="rounded-xl border border-border p-5 bg-secondary/40">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                  Your current cost
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between"><span className="text-muted-foreground">Customs clearance</span><span className="tabular-nums text-foreground">{fmt(calc.customs)}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Documentation</span><span className="tabular-nums text-foreground">{fmt(calc.docs)}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Tracking + tools</span><span className="tabular-nums text-foreground">{fmt(calc.tools)}</span></li>
                </ul>
                <div className="mt-4 pt-3 border-t border-border flex justify-between font-semibold">
                  <span className="text-foreground">Total / month</span>
                  <span className="tabular-nums text-foreground">{fmt(calc.currentTotal)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-accent/30 p-5 bg-accent/5">
                <p className="text-xs uppercase tracking-wider text-accent font-semibold mb-3">
                  ALC Alliance (Solo)
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between"><span className="text-muted-foreground">Membership</span><span className="tabular-nums text-foreground">{fmt(calc.alcMembership)}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Per-shipment ({shipments} × $59)</span><span className="tabular-nums text-foreground">{fmt(calc.alcTxn)}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Everything else</span><span className="tabular-nums text-foreground">Included</span></li>
                </ul>
                <div className="mt-4 pt-3 border-t border-accent/20 flex justify-between font-semibold">
                  <span className="text-foreground">Total / month</span>
                  <span className="tabular-nums text-foreground">{fmt(calc.alcTotal)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-1">Your monthly savings</p>
              <p className="text-5xl md:text-6xl font-bold text-emerald-500 tabular-nums">
                {fmt(calc.monthlySaved)}
                <span className="text-base font-medium text-muted-foreground">/month</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                That's <span className="font-semibold text-foreground">{fmt(calc.annualSaved)}/year</span> back in your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20 bg-secondary/40 border-y border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Common questions</h2>
          </div>
          <Accordion type="single" collapsible className="rounded-xl border border-border bg-card divide-y divide-border">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-0 px-5">
                <AccordionTrigger className="text-left text-foreground font-medium hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Join the ALC Alliance
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start with Solo. Grow into Enterprise. Your carrier contracts are ready on Day 1.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="electric" size="lg" asChild>
              <Link to="/signup">Get started — Solo</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/signup">Talk to us — Enterprise</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            No free trials. 30-day money-back guarantee on all plans.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
