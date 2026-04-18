import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns whether the current user needs onboarding (no company record yet).
 * Also checks localStorage flags for skip/complete.
 */
export function useOnboardingCheck() {
  const { user, loading: authLoading } = useAuth();

  const { data: needsOnboarding, isLoading } = useQuery({
    queryKey: ["onboarding-check", user?.id],
    queryFn: async () => {
      if (!user) return false;

      if (
        localStorage.getItem(`onboarding_complete_${user.id}`) === "true" ||
        localStorage.getItem(`onboarding_skipped_${user.id}`) === "true"
      ) {
        return false;
      }

      const { data, error } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        return false;
      }

      return !data;
    },
    enabled: !!user && !authLoading,
    staleTime: 60_000,
    retry: false,
  });

  return { needsOnboarding: needsOnboarding ?? false, isLoading: !!user && !authLoading ? isLoading : false };
}
