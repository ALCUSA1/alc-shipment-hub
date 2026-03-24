import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CompanyRole = "admin" | "pricing_manager" | "operations_manager" | "sales_manager" | "customer_user" | "finance_user" | "partner_user" | "viewer";

/**
 * Fetches the current user's company membership role.
 * Maps DB company_role to simplified portal roles used for UI gating.
 */
export function useCompanyRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["company-role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("role, company_id")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const role = (data?.role as CompanyRole) || null;
  const companyId = data?.company_id || null;

  // Simplified role classification
  const isOwnerOrAdmin = role === "admin";
  const isOperations = role === "operations_manager";
  const isFinance = role === "finance_user";
  const isViewer = role === "viewer";
  const isSales = role === "sales_manager";
  const isPricing = role === "pricing_manager";

  return {
    role,
    companyId,
    isLoading,
    isOwnerOrAdmin,
    isOperations,
    isFinance,
    isViewer,
    isSales,
    isPricing,
  };
}
