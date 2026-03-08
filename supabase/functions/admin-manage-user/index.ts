import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can manage users");

    const { action, target_user_id, role, ban_duration } = await req.json();
    if (!action || !target_user_id) throw new Error("action and target_user_id required");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let result: any = {};

    switch (action) {
      case "disable": {
        const { error } = await adminClient.auth.admin.updateUserById(target_user_id, {
          ban_duration: ban_duration || "876000h", // ~100 years
        });
        if (error) throw error;
        result = { message: "User disabled" };
        break;
      }
      case "enable": {
        const { error } = await adminClient.auth.admin.updateUserById(target_user_id, {
          ban_duration: "none",
        });
        if (error) throw error;
        result = { message: "User enabled" };
        break;
      }
      case "reset_password": {
        // Get user email first
        const { data: userData, error: fetchErr } = await adminClient.auth.admin.getUserById(target_user_id);
        if (fetchErr || !userData?.user?.email) throw new Error("Could not find user email");
        
        const { error } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: userData.user.email,
        });
        if (error) throw error;
        result = { message: `Password reset sent to ${userData.user.email}` };
        break;
      }
      case "add_role": {
        if (!role) throw new Error("role is required");
        const validRoles = ["admin", "ops_manager", "sales", "viewer"];
        if (!validRoles.includes(role)) throw new Error("Invalid role");
        
        const { error } = await adminClient
          .from("user_roles")
          .insert({ user_id: target_user_id, role });
        if (error) {
          if (error.code === "23505") throw new Error("User already has this role");
          throw error;
        }
        result = { message: `Role ${role} added` };
        break;
      }
      case "remove_role": {
        if (!role) throw new Error("role is required");
        const { error } = await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", target_user_id)
          .eq("role", role);
        if (error) throw error;
        result = { message: `Role ${role} removed` };
        break;
      }
      case "get_user_status": {
        const { data: userData, error: fetchErr } = await adminClient.auth.admin.getUserById(target_user_id);
        if (fetchErr) throw fetchErr;
        result = {
          email: userData.user.email,
          banned_until: userData.user.banned_until,
          last_sign_in: userData.user.last_sign_in_at,
          created_at: userData.user.created_at,
          email_confirmed: userData.user.email_confirmed_at != null,
        };
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
