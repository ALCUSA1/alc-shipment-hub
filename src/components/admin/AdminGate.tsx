import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";

export function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
