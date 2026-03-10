import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { canAccessRoute } from "@/lib/permissions";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function RoleGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { roles, isAdmin, isLoading: roleLoading } = useUserRole();
  const { isImpersonating, impersonatedRole } = useImpersonation();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessRoute(location.pathname, roles)) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-6">You don't have permission to access this page.</p>
          <Button variant="electric" asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return <>{children}</>;
}
