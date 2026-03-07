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

    // Verify the calling user is an admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Check admin role via security definer function
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can invite users");

    const { email, role, full_name } = await req.json();
    if (!email || !role) throw new Error("Email and role are required");

    const validRoles = ["admin", "ops_manager", "sales", "viewer"];
    if (!validRoles.includes(role)) throw new Error("Invalid role");

    // Use service role client to invite user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Invite user via Supabase Auth (sends invite email)
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name || "" },
    });
    if (inviteError) throw inviteError;

    const newUserId = inviteData.user.id;

    // Assign role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUserId, role });
    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({ message: `Invited ${email} as ${role}`, user_id: newUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
