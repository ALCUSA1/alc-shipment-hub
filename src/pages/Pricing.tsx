import { useState } from "react";
import { Link } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, X, User, Users, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "annual";

const MILESTONES = [
  {
    range: "0–24",
    label: "shipments / month",
    headline: "Standard ALC rate",
    detail: "Full platform access from your very first shipment",
    highlight: false,
  },
  {
    range: "25+",
    label: "shipments / month",
    headline: "Rate drops $200 / shipment",
    detail: "ALC absorbs $200 toward your carrier cost. Automatically applied.",
    highlight: true,
  },
  {
    range: "50+",
    label: "shipments / month",
    headline: "Rate drops $400 / shipment",
    detail: "BCO-level leverage. ALC negotiates carriers on your behalf.",
    highlight: false,
  },
];

const BUNDLE = [
  { icon: "🚢", label: "All major shipping lines" },
  { icon: "📋", label: "US Customs clearance" },
  { icon: "📄", label: "Master Bill of Lading" },
  { icon: "📝", label: "Draft Bill of Lading" },
  { icon: "🌊", label: "Sea Waybill" },
  { icon: "🛃", label: "ISF & AMS Filing" },
  { icon: "📍", label: "Real-time tracking" },
  { icon: "📊", label: "Rate monitoring" },
  { icon: "📅", label: "Pre-booking" },
  { icon: "🗂️", label: "Visual space booking" },
];

const FAQS = [
  {
    q: "Is the Agent plan really free?",
    a: "Yes. No credit card. No monthly fee. You join, access ALC carrier rates, and process shipments immediately. You earn your markup on every booking. ALC earns through the rate — there is no separate invoice or fee sent to you.",
  },
  {
    q: "What is the Volume Milestone Program?",
    a: "Once you process 25 or more shipments in a calendar month, ALC automatically absorbs $200 toward your carrier cost per shipment. Your rate drops by $200 for the remainder of that month. Hit 50 shipments and it drops another $200. The milestone resets at the start of each month.",
  },
  {
    q: "Why does Team have a lower platform rate than Agent?",
    a: "Higher monthly commitment unlocks better base rates. Team members see a lower ALC platform rate on every shipment — which means more competitive quotes to your clients and higher earnings per booking, before you even reach the volume milestone.",
  },
  {
    q: "Is there a free trial for Team or Enterprise?",
    a: "No free trials. We offer a 30-day money-back guarantee on all paid plans. If ALC does not deliver on its promise in your first 30 days, we refund your subscription in full — no questions asked.",
  },
];

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PlanCard {
  id: "agent" | "team" | "enterprise";
  name: string;
  description: string;
  Icon: typeof User;
  popular?: boolean;
  monthly: { price: string; suffix: string; sub: string };
  annual: { price: string; suffix: string; sub: string };
  rateBox: {
    borderClass: string;
    rate: { label: string; value: string; valueClass: string };
    seats: string;
    shipments: string;
    milestoneClass: string;
  };
  features: PlanFeature[];
  cta: { label: string; to: string; variant: "outline" | "electric" | "default"; className?: string };
}

const PLANS: PlanCard[] = [
  {
    id: "agent",
    name: "Agent",
    description: "Independent · 1-person operation",
    Icon: User,
    monthly: { price: "$0", suffix: "/mo", sub: "Free forever · no credit card needed" },
    annual: { price: "$0", suffix: "/mo", sub: "Free forever · no credit card needed" },
    rateBox: {
      borderClass: "border-dashed border-border bg-secondary/40",
      rate: { label: "Your ALC rate", value: "Carrier + built-in margin", valueClass: "text-foreground" },
      seats: "1",
      shipments: "Unlimited",
      milestoneClass: "text-emerald-600 dark:text-emerald-400",
    },
    features: [
      { text: "All major shipping lines", included: true },
      { text: "US customs clearance", included: true },
      { text: "Full documentation (MBL, DBL, ISF, AWB)", included: true },
      { text: "Real-time shipment tracking", included: true },
      { text: "Rate monitoring & pre-booking", included: true },
      { text: "Visual space booking", included: true },
      { text: "Earnings dashboard", included: true },
      { text: "Standard support", included: true },
      { text: "White-label client portal", included: false },
      { text: "Team & role management", included: false },
      { text: "API access", included: false },
    ],
    cta: { label: "Join free — start earning", to: "/signup", variant: "outline" },
  },
  {
    id: "team",
    name: "Team",
    description: "Growing forwarders · 2–10 staff",
    Icon: Users,
    popular: true,
    monthly: { price: "$149", suffix: "/mo", sub: "or $1,490/year — 2 months free" },
    annual: { price: "$124", suffix: "/mo", sub: "Billed as $1,490/year — 2 months free" },
    rateBox: {
      borderClass: "border-dashed border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/10",
      rate: { label: "Your ALC rate", value: "Better than Agent", valueClass: "text-emerald-600 dark:text-emerald-400 font-semibold" },
      seats: "Up to 10",
      shipments: "Unlimited",
      milestoneClass: "text-emerald-600 dark:text-emerald-400",
    },
    features: [
      { text: "Everything in Agent", included: true },
      { text: "Up to 10 user seats", included: true },
      { text: "Lower platform rates than Agent tier", included: true },
      { text: "White-label client portal", included: true },
      { text: "Role management (Admin · Staff)", included: true },
      { text: "Team earnings dashboard", included: true },
      { text: "Advanced analytics & reporting", included: true },
      { text: "Priority support", included: true },
      { text: "API access", included: false },
      { text: "Full role management (6 roles)", included: false },
    ],
    cta: {
      label: "Get started",
      to: "/signup",
      variant: "default",
      className: "bg-[#0F6E56] hover:bg-[#0c5a47] text-white",
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Established operations · 10+ staff",
    Icon: Building2,
    monthly: { price: "$299", suffix: "/mo", sub: "or $2,990/year — 2 months free" },
    annual: { price: "$249", suffix: "/mo", sub: "Billed as $2,990/year — 2 months free" },
    rateBox: {
      borderClass: "border-dashed border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-950/10",
      rate: { label: "Your ALC rate", value: "Lowest on platform", valueClass: "text-indigo-600 dark:text-indigo-400 font-semibold" },
      seats: "Unlimited",
      shipments: "Unlimited",
      milestoneClass: "text-indigo-600 dark:text-indigo-400",
    },
    features: [
      { text: "Everything in Team", included: true },
      { text: "Unlimited user seats", included: true },
      { text: "Lowest platform rates", included: true },
      { text: "Full role management (6 roles)", included: true },
      { text: "API access & custom integrations", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Custom reporting & SLA guarantee", included: true },
      { text: "Monthly rate cap protection", included: true },
      { text: "Quarterly business review with ALC", included: true },
    ],
    cta: {
      label: "Contact us",
      to: "/signup",
      variant: "default",
      className: "bg-[#111827] hover:bg-[#1f2937] text-white",
    },
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <MarketingLayout>
      <SEO
        title="Pricing — Join Free. Earn on Every Shipment. | ALC"
        description="Join free as an Agent. Team and Enterprise plans for growing forwarders. Hit 25 shipments/month and your rate drops $200 automatically."
        canonical="https://alllogisticscargo.com/pricing"
      />

      {/* Header */}
      <section className="pt-20 pb-10 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
            ALC Platform
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
            Join free. Earn on every shipment.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            No setup cost. No monthly commitment required. ALC handles customs, documentation, tracking and carrier access — you handle the client relationship.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="inline-flex items-center rounded-full bg-secondary p-1 border border-border">
              {(["monthly", "annual"] as Billing[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBilling(opt)}
                  className={cn(
                    "px-5 py-2 text-sm font-semibold rounded-full transition-all capitalize",
                    billing === opt
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            {billing === "annual" && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-xs font-semibold border border-emerald-500/30">
                Save 2 months
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-6 pb-12">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const Icon = plan.Icon;
            const price = billing === "annual" ? plan.annual : plan.monthly;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl border bg-card p-7 flex flex-col",
                  plan.popular
                    ? "border-[2.5px] border-[#0F6E56] shadow-lg shadow-emerald-500/10"
                    : "border border-border"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#0F6E56] text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-foreground" />
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6 min-h-[2.5rem]">
                  {plan.description}
                </p>

                <div className="mb-1">
                  <span className="text-5xl font-bold text-foreground">{price.price}</span>
                  <span className="text-muted-foreground text-sm">{price.suffix}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5 min-h-[2.5rem]">{price.sub}</p>

                {/* Platform rate box */}
                <div className={cn("rounded-xl border-2 px-4 py-3 mb-6", plan.rateBox.borderClass)}>
                  <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground mb-2">
                    Platform Rate
                  </p>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{plan.rateBox.rate.label}</dt>
                      <dd className={cn("text-right", plan.rateBox.rate.valueClass)}>{plan.rateBox.rate.value}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{plan.id === "agent" ? "User seat" : "User seats"}</dt>
                      <dd className="text-foreground font-medium">{plan.rateBox.seats}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Shipments</dt>
                      <dd className="text-foreground font-medium">{plan.rateBox.shipments}</dd>
                    </div>
                  </dl>
                  <p className={cn("mt-3 text-xs font-medium", plan.rateBox.milestoneClass)}>
                    🎯 Hit 25 ships/mo → rate drops $200 automatically
                  </p>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={cn(f.included ? "text-foreground" : "text-muted-foreground/60")}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.cta.variant}
                  size="lg"
                  className={cn("w-full", plan.cta.className)}
                  asChild
                >
                  <Link to={plan.cta.to}>{plan.cta.label}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Volume Milestone Program Banner */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto rounded-2xl bg-[#0A1628] p-8 md:p-10 text-white">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-teal-300 mb-8 text-center">
            Volume Milestone Program — Your rate drops as you grow
          </p>
          <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-stretch">
            {MILESTONES.map((m, i) => (
              <>
                <div
                  key={m.range}
                  className={cn(
                    "rounded-xl p-5 flex flex-col text-center bg-white/5",
                    m.highlight ? "border-2 border-teal-400/60 shadow-lg shadow-teal-500/10" : "border border-white/10"
                  )}
                >
                  <p className="text-4xl md:text-5xl font-bold text-white mb-1">{m.range}</p>
                  <p className="text-xs uppercase tracking-wider text-white/50 mb-4">{m.label}</p>
                  <p className="text-sm font-semibold text-emerald-300 mb-2">{m.headline}</p>
                  <p className="text-xs text-white/60 leading-relaxed">{m.detail}</p>
                </div>
                {i < MILESTONES.length - 1 && (
                  <div className="hidden md:flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-teal-400/60" />
                  </div>
                )}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* Full Service Bundle */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-card">
            <CardContent className="p-8 md:p-10">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Every plan includes the full service bundle
                </h2>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                  What agents spend $900–$1,975 piecing together separately — included in every ALC plan, on every shipment.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {BUNDLE.map((b) => (
                  <div
                    key={b.label}
                    className="rounded-xl border border-border bg-secondary/40 p-4 text-center"
                  >
                    <div className="text-2xl mb-2">{b.icon}</div>
                    <p className="text-xs font-medium text-foreground leading-tight">{b.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Common questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </MarketingLayout>
  );
}
