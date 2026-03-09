import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

export function TruckingGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { roles, isLoading: rolesLoading } = useUserRole();

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

  // Allow access if user has trucker role or no roles assigned yet (new user)
  const hasTruckerRole = roles.includes("trucker" as any);
  if (roles.length > 0 && !hasTruckerRole) {
    return <Navigate to="/trucking/login" replace />;
  }

  return <>{children}</>;
}
