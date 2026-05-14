import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PLANS, type PlanId, type BillingInterval } from "@/config/plans";
import { Check, User, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import alcLogo from "@/assets/alc-logo.png";

const ICONS = { solo: User, team: Users, enterprise: Building2 } as const;

const PLAN_BLURBS: Record<PlanId, { audience: string; bullets: string[] }> = {
  solo: {
    audience: "For independent agents · 1-person operations",
    bullets: ["1 user seat", "Up to 15 active shipments", "All major shipping lines", "US customs clearance"],
  },
  team: {
    audience: "For growing forwarders · 2–10 staff",
    bullets: ["Up to 10 user seats", "Unlimited active shipments", "White-label client portal", "Priority support"],
  },
  enterprise: {
    audience: "For established operations · 10+ staff",
    bullets: ["Unlimited seats", "Full role management", "API access", "Dedicated account manager"],
  },
};

export default function ChoosePlan() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, refresh, hasAccess } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<BillingInterval>("monthly");
  const [selected, setSelected] = useState<PlanId>("team");
  const [companyName, setCompanyName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?returnTo=/choose-plan", { replace: true });
  }, [authLoading, user, navigate]);

  // Preselect plan + billing from sessionStorage (set by /pricing CTA)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("selectedPlan");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.plan && PLANS[parsed.plan as PlanId]) setSelected(parsed.plan);
        if (parsed.billing === "annual" || parsed.billing === "monthly") setBilling(parsed.billing);
      }
    } catch { /* ignore */ }
  }, []);

  // If user already chose a plan and has access, send them to dashboard
  useEffect(() => {
    if (!authLoading && subscription?.plan && hasAccess) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, subscription, hasAccess, navigate]);

  const isEnterprise = selected === "enterprise";
  const plan = PLANS[selected];
  const displayPrice = useMemo(() => billing === "monthly" ? plan.monthly : Math.round(plan.annual / 12), [billing, plan]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("start-trial", {
        body: {
          plan: selected,
          billing_interval: billing,
          company_name: companyName || null,
          notes: notes || null,
        },
      });
      if (error) throw error;
      sessionStorage.removeItem("selectedPlan");
      await refresh();
      if (isEnterprise) {
        toast({
          title: "Thanks — we'll be in touch",
          description: "Our sales team will reach out shortly to set up your Enterprise account.",
        });
      } else {
        toast({
          title: "Your 14-day free trial is active",
          description: "No card required. Explore everything ALC has to offer.",
        });
      }
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center mb-8">
          <img src={alcLogo} alt="ALC" className="h-10 w-auto" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Choose your plan</h1>
          <p className="text-muted-foreground">
            Start with a 14-day free trial — no credit card required.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-full border border-border bg-card">
            {(["monthly", "annual"] as BillingInterval[]).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all capitalize",
                  billing === b ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {(Object.values(PLANS)).map((p) => {
            const Icon = ICONS[p.id];
            const isSelected = selected === p.id;
            const blurb = PLAN_BLURBS[p.id];
            const monthly = billing === "monthly" ? p.monthly : Math.round(p.annual / 12);
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={cn(
                  "relative text-left rounded-2xl border-2 bg-card p-6 transition-all hover:-translate-y-0.5",
                  isSelected ? "border-accent shadow-lg shadow-accent/10" : "border-border hover:border-foreground/20",
                )}
              >
                {isSelected && (
                  <div className="absolute -top-3 right-4 bg-accent text-accent-foreground text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                    <Check className="h-3 w-3" /> Selected
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-5 w-5" />
                  <h3 className="text-lg font-bold">{p.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4 min-h-[2rem]">{blurb.audience}</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold tabular-nums">${monthly.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-1.5">
                  {blurb.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Enterprise extra info */}
        {isEnterprise && (
          <div className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-4">
            <div>
              <h3 className="font-semibold">Tell us about your operation</h3>
              <p className="text-sm text-muted-foreground">Our team will reach out within one business day.</p>
            </div>
            <div>
              <Label htmlFor="cn">Company name</Label>
              <Input id="cn" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Logistics" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="notes">What are you looking for? (optional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1.5" placeholder="Volume, integrations, specific requirements..." />
            </div>
          </div>
        )}

        {!isEnterprise && (
          <div className="rounded-xl bg-secondary/40 border border-border p-4 text-center text-sm text-muted-foreground mb-6">
            Selected: <strong className="text-foreground">{plan.name}</strong> · ${displayPrice}/mo billed {billing} · <strong className="text-foreground">14-day free trial</strong> · No card required
          </div>
        )}

        <div className="flex justify-center">
          <Button size="lg" variant="electric" onClick={handleSubmit} disabled={submitting} className="min-w-[260px]">
            {submitting ? "Setting up..." : isEnterprise ? "Talk to sales" : "Start 14-day free trial"}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          You can switch plans any time. <Link to="/pricing" className="underline">View full pricing</Link>.
        </p>
      </div>
    </div>
  );
}
