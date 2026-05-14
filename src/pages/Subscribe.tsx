import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, AlertCircle } from "lucide-react";
import alcLogo from "@/assets/alc-logo.png";

export default function Subscribe() {
  const { user } = useAuth();
  const { subscription, signOut: _ } = useAuth() as any;
  const { subscription: sub } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const planId = (sub?.plan ?? "team") as "solo" | "team" | "enterprise";
  const interval = (sub?.billing_interval ?? "monthly") as "monthly" | "annual";

  async function startCheckout() {
    if (planId === "enterprise") {
      navigate("/choose-plan");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: planId, billing_interval: interval },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (e: any) {
      toast({ title: "Couldn't start checkout", description: e?.message || "Try again", variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-8">
          <img src={alcLogo} alt="ALC" className="h-10 w-auto" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-accent/10 mx-auto mb-4 flex items-center justify-center">
            <Lock className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Your trial has ended</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Subscribe to continue using ALC Alliance and managing your shipments.
          </p>

          {sub?.plan && (
            <div className="rounded-lg bg-secondary/40 border border-border px-4 py-3 mb-6 text-sm">
              Continuing on <strong className="capitalize">{sub.plan}</strong> · {interval}
            </div>
          )}

          <Button variant="electric" size="lg" className="w-full" onClick={startCheckout} disabled={loading}>
            {loading ? "Loading..." : planId === "enterprise" ? "Talk to sales" : "Subscribe with Stripe"}
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            <Link to="/choose-plan" className="underline">Change plan</Link> · <Link to="/pricing" className="underline">Pricing</Link>
          </p>
        </div>

        <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>You'll be redirected to Stripe to enter payment details. Cancel anytime.</p>
        </div>
      </div>
    </div>
  );
}
