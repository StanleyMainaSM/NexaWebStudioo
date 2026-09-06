import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Owner member status function is missing server configuration.");
    return json({ error: "Member status service is not configured." }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication is required." }, 401);
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return json({ error: "Authentication is required." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  try {
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Your session is invalid or has expired." }, 401);

    const actorId = authData.user.id;
    const { data: ownerRole, error: ownerRoleError } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", actorId)
      .eq("role", "owner")
      .maybeSingle();
    if (ownerRoleError) {
      console.error("Owner authorization lookup failed:", ownerRoleError);
      return json({ error: "Unable to verify Owner permissions." }, 500);
    }
    if (!ownerRole) return json({ error: "Owner permission is required to manage members." }, 403);

    const { data: ownerProfile, error: ownerProfileError } = await admin
      .from("profiles")
      .select("is_active")
      .eq("id", actorId)
      .maybeSingle();
    if (ownerProfileError) return json({ error: "Unable to verify the Owner account state." }, 500);
    if (ownerProfile?.is_active === false) return json({ error: "The Owner account is inactive." }, 403);

    const body = await req.json().catch(() => null) as { userId?: unknown; active?: unknown } | null;
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const active = body?.active;
    if (!userId || typeof active !== "boolean") return json({ error: "A target user and activation state are required." }, 400);
    if (userId === actorId) return json({ error: "The current Owner account cannot be deactivated from this interface." }, 400);

    const { data: targetUser, error: targetUserError } = await admin.auth.admin.getUserById(userId);
    if (targetUserError || !targetUser.user) return json({ error: "Target user account was not found." }, 404);

    const { data: targetOwnerRole, error: targetOwnerRoleError } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("role", "owner")
      .maybeSingle();
    if (targetOwnerRoleError) {
      console.error("Target Owner lookup failed:", targetOwnerRoleError);
      return json({ error: "Unable to verify the target account." }, 500);
    }
    if (targetOwnerRole) return json({ error: "Another Owner account cannot be deactivated from this interface." }, 400);

    const { error: profileError } = await admin
      .from("profiles")
      .update({ is_active: active })
      .eq("id", userId);
    if (profileError) {
      console.error("Member profile activation update failed:", profileError);
      return json({ error: "Member activation state could not be updated." }, 500);
    }

    const { error: authStateError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: active ? "none" : "876000h",
    });
    if (authStateError) {
      console.error("Member Auth activation update failed:", authStateError);
      await admin.from("profiles").update({ is_active: !active }).eq("id", userId);
      return json({ error: "Member activation state could not be completed." }, 500);
    }

    const { data: connectorRole, error: connectorRoleError } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("role", "connector")
      .maybeSingle();
    if (connectorRoleError) {
      console.error("Connector role lookup failed during member status update:", connectorRoleError);
      await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "876000h" : "none" });
      await admin.from("profiles").update({ is_active: !active }).eq("id", userId);
      return json({ error: "Member activation state could not be completed." }, 500);
    }

    if (connectorRole) {
      const { error: connectorProfileError } = await admin
        .from("connector_profiles")
        .update({ is_active: active })
        .eq("user_id", userId);
      if (connectorProfileError) {
        console.error("Connector profile activation update failed:", connectorProfileError);
        await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "876000h" : "none" });
        await admin.from("profiles").update({ is_active: !active }).eq("id", userId);
        return json({ error: "Member activation state could not be completed." }, 500);
      }
    }

    const { error: auditError } = await admin.from("audit_logs").insert({
      user_id: actorId,
      action: active ? "owner_user_reactivated" : "owner_user_deactivated",
      entity_type: "user",
      entity_id: userId,
      details: { target_user_id: userId, target_email: targetUser.user.email || null, active },
    });
    if (auditError) console.error("Owner member status audit error:", auditError);

    return json({
      success: true,
      active,
      message: active ? "User account reactivated successfully." : "User account deactivated successfully.",
    });
  } catch (error) {
    console.error("Owner member status error:", error);
    return json({ error: "Unable to update member activation state." }, 500);
  }
});
