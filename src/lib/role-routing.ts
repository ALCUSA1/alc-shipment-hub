import { supabase } from "@/integrations/supabase/client";

/**
 * Determines the correct portal route based on user roles.
 * Priority: admin > trucker > dashboard (default)
 * Users with no roles and a pending signup request go to /pending-approval.
 */
export async function getPostLoginRoute(userId: string): Promise<string> {
  const { data: roles } = await supabase.rpc("get_user_roles", { _user_id: userId });
  const roleList = (roles as string[]) || [];

  if (roleList.includes("admin")) return "/admin";
  if (roleList.includes("trucker")) return "/trucking";
  if (roleList.length > 0) return "/dashboard";

  // No roles — check signup request status
  const { data: request } = await supabase
    .from("signup_requests")
    .select("status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (request?.status === "pending" || request?.status === "rejected") {
    return "/pending-approval";
  }

  // Legacy user with no roles and no signup request
  return "/dashboard";
}
