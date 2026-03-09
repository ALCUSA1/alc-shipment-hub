import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

export function WarehouseGate({ children }: { children: ReactNode }) {
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

  const hasWarehouseRole = roles.includes("warehouse");
  if (roles.length > 0 && !hasWarehouseRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
