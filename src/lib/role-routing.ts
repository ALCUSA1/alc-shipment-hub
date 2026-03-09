import { supabase } from "@/integrations/supabase/client";

/**
 * Determines the correct portal route based on user roles.
 * Priority: admin > trucker > dashboard (default)
 */
export async function getPostLoginRoute(userId: string): Promise<string> {
  const { data: roles } = await supabase.rpc("get_user_roles", { _user_id: userId });
  const roleList = (roles as string[]) || [];

  if (roleList.includes("admin")) return "/admin";
  if (roleList.includes("trucker")) return "/trucking";
  return "/dashboard";
}
