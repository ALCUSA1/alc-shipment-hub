import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user is an admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can invite users");

    const { email, role, full_name } = await req.json();
    if (!email || !role) throw new Error("Email and role are required");

    const validRoles = ["admin", "ops_manager", "sales", "viewer", "trucker"];
    if (!validRoles.includes(role)) throw new Error("Invalid role");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already exists
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = listData.users.find((u) => u.email === email);

    if (existing) {
      // User exists — just assign the role
      const { error: roleError } = await adminClient
        .from("user_roles")
        .upsert({ user_id: existing.id, role }, { onConflict: "user_id,role" });
      if (roleError) throw roleError;

      return new Response(
        JSON.stringify({ message: `Assigned ${role} role to existing user ${email}`, user_id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // New user — send invite email
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name || "" },
    });
    if (inviteError) throw inviteError;
    const userId = inviteData.user.id;

    // Assign role (upsert to avoid duplicate errors)
    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({ message: `Invited ${email} as ${role}`, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
