import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Navigate } from "react-router-dom";

export function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isBlocked, isLoading: roleLoading } = useUserRole();
  const { isImpersonating } = useImpersonation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isBlocked) return <Navigate to="/suspended" replace />;
  // If impersonating another role, redirect away from admin
  if (isImpersonating) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
