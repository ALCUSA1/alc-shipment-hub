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

// ALC internal team — always bypass paywall by email (covers users whose roles
// haven't been assigned yet or who sign up later).
const PAYWALL_EXEMPT_EMAILS = new Set([
  "ahad@alllogisticscargo.com",
  "syed@alllogisticscargo.com",
  "chanty@alllogisticscargo.com",
  "paul@alllogisticscargo.com",
  "michael@alllogisticscargo.com",
  "michael@alllogisitcscargo.com", // typo variant
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

  // Blocked users are routed to a suspension page
  if ((roles || []).includes("blocked") && location.pathname !== "/suspended") {
    return <Navigate to="/suspended" replace />;
  }

  // Redirect to onboarding if needed (but not if already on onboarding page)
  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Subscription paywall — applies only to shipper/customer accounts.
  // Internal staff and non-shipper portal roles (admin, forwarder, trucker, driver, warehouse, viewer, etc.) bypass.
  const exemptByRole = (roles || []).some((r) => PAYWALL_EXEMPT_ROLES.has(r));
  const exemptByUserId = PAYWALL_EXEMPT_USER_IDS.has(user.id);
  const exemptByEmail = !!user.email && PAYWALL_EXEMPT_EMAILS.has(user.email.toLowerCase());
  const exemptPaths = ["/choose-plan", "/subscribe", "/subscribe/success"];
  const isExemptPath = exemptPaths.some((p) => location.pathname.startsWith(p));
  if (!exemptByRole && !exemptByUserId && !exemptByEmail && !isExemptPath) {
    if (needsPlanSelection) return <Navigate to="/choose-plan" replace />;
    if (!hasAccess) return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
}
