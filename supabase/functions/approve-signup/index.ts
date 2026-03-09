import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin access required");

    const { request_id, action, rejection_reason } = await req.json();

    if (!request_id || !["approve", "reject"].includes(action)) {
      throw new Error("Invalid parameters: request_id and action (approve|reject) required");
    }

    // Fetch the signup request
    const { data: request, error: fetchErr } = await supabase
      .from("signup_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (fetchErr || !request) throw new Error("Signup request not found");
    if (request.status !== "pending") throw new Error("Request already processed");

    if (action === "approve") {
      // Assign role
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: request.user_id, role: request.requested_role });

      if (roleErr) throw new Error("Failed to assign role: " + roleErr.message);

      // Update request status
      await supabase
        .from("signup_requests")
        .update({ status: "approved", reviewed_by: caller.id, reviewed_at: new Date().toISOString() })
        .eq("id", request_id);

      // Create notification for the user
      await supabase.from("notifications").insert({
        user_id: request.user_id,
        type: "system",
        title: "Account Approved",
        message: `Your account has been approved as ${request.requested_role.replace("_", " ")}. You can now log in and access the platform.`,
      });

      return new Response(
        JSON.stringify({ message: `Approved ${request.requested_role} access for user` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Reject
      await supabase
        .from("signup_requests")
        .update({
          status: "rejected",
          reviewed_by: caller.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejection_reason || null,
        })
        .eq("id", request_id);

      await supabase.from("notifications").insert({
        user_id: request.user_id,
        type: "system",
        title: "Account Application Update",
        message: rejection_reason
          ? `Your account request was not approved. Reason: ${rejection_reason}`
          : "Your account request was not approved. Please contact support for more information.",
      });

      return new Response(
        JSON.stringify({ message: "Signup request rejected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
