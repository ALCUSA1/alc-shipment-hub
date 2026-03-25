import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const validRoles = [
  "admin",
  "pricing_manager",
  "operations_manager",
  "sales_manager",
  "customer_user",
  "finance_user",
  "viewer",
] as const;

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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: isGlobalAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    const { data: inviterMembership, error: membershipError } = await userClient
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (membershipError) throw membershipError;

    const isCompanyAdmin = inviterMembership?.role === "admin";
    if (!isGlobalAdmin && !isCompanyAdmin) {
      throw new Error("Only company admins can invite users");
    }

    const { email, role, full_name, title, company_id } = await req.json();
    if (!email || !role) throw new Error("Email and role are required");
    if (!validRoles.includes(role)) throw new Error("Invalid role");

    const targetCompanyId = company_id || inviterMembership?.company_id;
    if (!targetCompanyId) throw new Error("No company selected for invite");

    const { data: companyData, error: companyError } = await adminClient
      .from("companies")
      .select("company_name")
      .eq("id", targetCompanyId)
      .maybeSingle();
    if (companyError) throw companyError;

    const upsertMembership = async (userId: string) => {
      const { data: existingMembership, error: existingMembershipError } = await adminClient
        .from("company_members")
        .select("id")
        .eq("company_id", targetCompanyId)
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (existingMembershipError) throw existingMembershipError;

      if (existingMembership?.id) {
        const { error } = await adminClient
          .from("company_members")
          .update({ role, title: title || null, is_active: true })
          .eq("id", existingMembership.id);
        if (error) throw error;
        return existingMembership.id;
      }

      const { data: insertedMembership, error: insertError } = await adminClient
        .from("company_members")
        .insert({
          company_id: targetCompanyId,
          user_id: userId,
          role,
          title: title || null,
          is_active: true,
          joined_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
        return insertedMembership.id;
    };

    const upsertProfile = async (userId: string, userEmail: string) => {
      const { error } = await adminClient
        .from("profiles")
        .upsert({
          user_id: userId,
          full_name: full_name || null,
          email: userEmail,
          company_name: companyData?.company_name || null,
        }, { onConflict: "user_id" });
      if (error) throw error;
    };

    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = listData.users.find((listedUser) => listedUser.email?.toLowerCase() === normalizedEmail);

    if (existing) {
      await upsertMembership(existing.id);
      await upsertProfile(existing.id, normalizedEmail);

      return new Response(
        JSON.stringify({ message: `Added existing user ${normalizedEmail} to the company team`, user_id: existing.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: { full_name: full_name || "" },
    });
    if (inviteError) throw inviteError;

    const invitedUserId = inviteData.user.id;
    await upsertMembership(invitedUserId);
    await upsertProfile(invitedUserId, normalizedEmail);

    return new Response(
      JSON.stringify({ message: `Invited ${normalizedEmail} to the company team`, user_id: invitedUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});