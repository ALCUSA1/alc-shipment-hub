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
  if (roleList.includes("forwarder")) return "/forwarder";
  if (roleList.includes("driver")) return "/driver";
  if (roleList.includes("trucker")) return "/trucking";
  if (roleList.includes("warehouse")) return "/warehouse";
  // Default — no roles or unrecognized role
  return "/dashboard";
}
