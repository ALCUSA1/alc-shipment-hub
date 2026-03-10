import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

export function TruckingGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { roles, isAdmin, isLoading: rolesLoading } = useUserRole();
  const { isImpersonating, impersonatedRole } = useImpersonation();

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin impersonating trucker role — allow access
  if (isAdmin && isImpersonating && impersonatedRole === "trucker") {
    return <>{children}</>;
  }

  const hasTruckerRole = roles.includes("trucker" as any);
  if (roles.length > 0 && !hasTruckerRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
