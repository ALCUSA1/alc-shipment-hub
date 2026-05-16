import { createContext, useContext, ReactNode } from "react";

// Subscription/paywall has been retired in favor of the volume-based Milestone
// Subsidy model (see /pricing). This file is kept as a no-op shim so existing
// imports (ProtectedRoute, etc.) keep working without a sweeping refactor.

interface Ctx {
  subscription: null;
  loading: false;
  hasAccess: true;
  needsPlanSelection: false;
  daysLeftInTrial: null;
  refresh: () => Promise<void>;
}

const value: Ctx = {
  subscription: null,
  loading: false,
  hasAccess: true,
  needsPlanSelection: false,
  daysLeftInTrial: null,
  refresh: async () => {},
};

const SubscriptionContext = createContext<Ctx>(value);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export const useSubscription = () => useContext(SubscriptionContext);
