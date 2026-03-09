import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "ops_manager" | "sales" | "viewer" | "trucker" | "driver";

export function useUserRole() {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_roles", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return (data as AppRole[]) || [];
    },
    enabled: !!user,
  });

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isOpsManager: roles.includes("ops_manager"),
    isSales: roles.includes("sales"),
    isViewer: roles.includes("viewer"),
    hasRole: (role: AppRole) => roles.includes(role),
    isLoading,
  };
}
