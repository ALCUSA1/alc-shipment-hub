import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUserRole } from "@/hooks/useUserRole";

// Roles that bypass the subscription paywall (internal staff & non-shipper portals)
const PAYWALL_EXEMPT_ROLES = new Set([
  "admin", "ops_manager", "sales", "sales_manager", "pricing_manager",
  "operations_manager", "finance_user", "forwarder", "trucker", "driver",
  "warehouse", "viewer",
]);

// Specific user IDs that bypass the paywall (Ahad, Syed, Chanty)
const PAYWALL_EXEMPT_USER_IDS = new Set([
  "0f234d38-3d58-4be5-8c95-c93769789ef2", // ahad@alllogisticscargo.com
  "b11985da-e67e-4b0a-82b0-e873e04985d8", // syed@alllogisticscargo.com
  "25af8927-be04-433e-abcb-fa6be10ee3d2", // syed@utopiakingdom.io
  "96700cf5-6b2a-4b84-8073-a9b2a55f79be", // chanty@alllogisticscargo.com
]);

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboardingCheck();
  const { loading: subLoading, hasAccess, needsPlanSelection } = useSubscription();
  const { roles, isLoading: rolesLoading } = useUserRole();
  const location = useLocation();

  if (loading || onboardingLoading || subLoading || rolesLoading) {
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

  // Subscription paywall — applies only to shipper/customer accounts.
  // Internal staff and non-shipper portal roles (admin, forwarder, trucker, driver, warehouse, viewer, etc.) bypass.
  const exemptByRole = (roles || []).some((r) => PAYWALL_EXEMPT_ROLES.has(r));
  const exemptPaths = ["/choose-plan", "/subscribe", "/subscribe/success"];
  const isExemptPath = exemptPaths.some((p) => location.pathname.startsWith(p));
  if (!exemptByRole && !isExemptPath) {
    if (needsPlanSelection) return <Navigate to="/choose-plan" replace />;
    if (!hasAccess) return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}
