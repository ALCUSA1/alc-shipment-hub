import { Check, X, User, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type Plan = {
  name: string;
  icon: typeof User;
  audience: string;
  monthly: string;
  annual: string;
  perShipment: string;
  popular?: boolean;
  features: { label: string; included: boolean }[];
};

const PLANS: Plan[] = [
  {
    name: "Solo",
    icon: User,
    audience: "Independent agents · 1-person operations",
    monthly: "$299",
    annual: "or $1,990/year",
    perShipment: "$59",
    features: [
      { label: "1 user seat", included: true },
      { label: "Up to 15 active shipments", included: true },
      { label: "All shipping lines", included: true },
      { label: "Rate monitoring", included: true },
      { label: "US customs clearance", included: true },
      { label: "Full documentation", included: true },
      { label: "Real-time tracking", included: true },
      { label: "Standard support", included: true },
      { label: "White-label portal", included: false },
      { label: "Role management", included: false },
      { label: "API access", included: false },
    ],
  },
  {
    name: "Team",
    icon: Users,
    audience: "Growing forwarders · 2–10 staff",
    monthly: "$599",
    annual: "or $4,990/year",
    perShipment: "$59",
    popular: true,
    features: [
      { label: "Up to 10 user seats", included: true },
      { label: "Unlimited active shipments", included: true },
      { label: "All shipping lines", included: true },
      { label: "Rate monitoring", included: true },
      { label: "US customs clearance", included: true },
      { label: "Full documentation", included: true },
      { label: "Real-time tracking", included: true },
      { label: "Priority support", included: true },
      { label: "White-label client portal", included: true },
      { label: "Basic roles (Admin · Staff)", included: true },
      { label: "API access", included: false },
    ],
  },
  {
    name: "Enterprise",
    icon: Building2,
    audience: "Established operations · 10+ staff",
    monthly: "$1,499",
    annual: "or $12,990/year",
    perShipment: "$49",
    features: [
      { label: "Unlimited user seats", included: true },
      { label: "Unlimited active shipments", included: true },
      { label: "All shipping lines", included: true },
      { label: "Rate monitoring", included: true },
      { label: "US customs clearance", included: true },
      { label: "Full documentation", included: true },
      { label: "Real-time tracking", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "White-label client portal", included: true },
      { label: "API access", included: true },
      { label: "Full role management", included: true },
    ],
  },
];

const ROLES = [
  { name: "Admin", desc: "Full access · billing · settings · all users" },
  { name: "Operations", desc: "Shipment management · booking · tracking" },
  { name: "Customs", desc: "Clearance · documentation · compliance" },
  { name: "Sales", desc: "Rate viewing · quoting · client management" },
  { name: "Accounting", desc: "Invoices · payments · financial reports" },
  { name: "Customer service", desc: "Tracking · client comms · status updates" },
];

export function PricingPlansSection() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="section-padding bg-background">
      <div className="container-default">
        <ScrollReveal>
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">
              ALC Alliance
            </p>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Choose your plan
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every plan includes the full service bundle. Upgrade as you grow.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <ScrollReveal key={plan.name}>
                <div
                  className={cn(
                    "relative rounded-2xl border bg-card p-7 h-full flex flex-col",
                    plan.popular
                      ? "border-accent shadow-lg shadow-accent/10 ring-1 ring-accent"
                      : "border-border"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-accent/15 text-accent text-xs font-semibold px-3 py-1 rounded-full border border-accent/30">
                        Most popular
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

                  <div className="mb-2">
                    <span className="text-5xl font-bold text-foreground">{plan.monthly}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">{plan.annual}</p>

                  <div
                    className={cn(
                      "rounded-xl px-4 py-3 mb-6 text-center",
                      plan.popular ? "bg-accent/10" : "bg-secondary"
                    )}
                  >
                    <span
                      className={cn(
                        "text-2xl font-bold",
                        plan.popular ? "text-accent" : "text-foreground"
                      )}
                    >
                      {plan.perShipment}
                    </span>
                    <span className="text-muted-foreground text-sm"> /shipment</span>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.label} className="flex items-start gap-2 text-sm">
                        {f.included ? (
                          <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                        )}
                        <span
                          className={cn(
                            f.included ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.popular ? "electric" : "outline"}
                    size="lg"
                    className="w-full"
                    onClick={() => navigate("/signup")}
                  >
                    Get started
                  </Button>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Enterprise roles */}
        <ScrollReveal>
          <div className="mt-16 max-w-6xl mx-auto rounded-2xl border border-border bg-secondary/40 p-8">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              Enterprise roles — who can do what
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ROLES.map((r) => (
                <div
                  key={r.name}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="font-semibold text-foreground mb-1">{r.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
