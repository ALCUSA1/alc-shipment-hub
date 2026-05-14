import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboardingCheck();
  const { loading: subLoading, hasAccess, needsPlanSelection } = useSubscription();
  const location = useLocation();

  if (loading || onboardingLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if needed (but not if already on onboarding page)
  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Subscription paywall — choose-plan and subscribe pages are exempt
  const exemptPaths = ["/choose-plan", "/subscribe", "/subscribe/success"];
  const isExempt = exemptPaths.some((p) => location.pathname.startsWith(p));
  if (!isExempt) {
    if (needsPlanSelection) return <Navigate to="/choose-plan" replace />;
    if (!hasAccess) return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}
