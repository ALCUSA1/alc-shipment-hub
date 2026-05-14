import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Status = "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "sales_lead" | null;

interface SubRow {
  plan: "solo" | "team" | "enterprise" | null;
  billing_interval: "monthly" | "annual" | null;
  status: Status;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

interface Ctx {
  subscription: SubRow | null;
  loading: boolean;
  /** True while the user has access (active sub or unexpired trial). */
  hasAccess: boolean;
  /** True if user has not selected a plan yet (post-signup). */
  needsPlanSelection: boolean;
  daysLeftInTrial: number | null;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<Ctx>({
  subscription: null,
  loading: true,
  hasAccess: false,
  needsPlanSelection: false,
  daysLeftInTrial: null,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [sub, setSub] = useState<SubRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    if (!user) {
      setSub(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions" as any)
      .select("plan, billing_interval, status, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    setSub((data as any) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchSub();
  }, [authLoading, fetchSub]);

  const value = useMemo<Ctx>(() => {
    const trialMs = sub?.trial_ends_at ? new Date(sub.trial_ends_at).getTime() - Date.now() : 0;
    const daysLeft = sub?.trial_ends_at ? Math.max(Math.ceil(trialMs / (1000 * 60 * 60 * 24)), 0) : null;
    const trialActive = sub?.status === "trialing" && trialMs > 0;
    const subActive = sub?.status === "active";
    const salesLead = sub?.status === "sales_lead"; // Enterprise lead — grant access while pending
    return {
      subscription: sub,
      loading,
      hasAccess: Boolean(trialActive || subActive || salesLead),
      needsPlanSelection: Boolean(user && !loading && (!sub || !sub.plan)),
      daysLeftInTrial: daysLeft,
      refresh: fetchSub,
    };
  }, [sub, loading, user, fetchSub]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export const useSubscription = () => useContext(SubscriptionContext);
