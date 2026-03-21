import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns whether the current user needs onboarding (no company record yet).
 * Also checks localStorage flags for skip/complete.
 */
export function useOnboardingCheck() {
  const { user } = useAuth();

  const { data: needsOnboarding, isLoading } = useQuery({
    queryKey: ["onboarding-check", user?.id],
    queryFn: async () => {
      if (!user) return false;

      // If user already completed or skipped, don't redirect
      if (
        localStorage.getItem(`onboarding_complete_${user.id}`) === "true" ||
        localStorage.getItem(`onboarding_skipped_${user.id}`) === "true"
      ) {
        return false;
      }

      // Check if user has a company
      const { data } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      return !data; // needs onboarding if no company
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { needsOnboarding: needsOnboarding ?? false, isLoading };
}
