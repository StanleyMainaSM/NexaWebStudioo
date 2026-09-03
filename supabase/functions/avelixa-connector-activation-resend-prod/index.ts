import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: "Server configuration error" });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller.user) return json(401, { error: "Authentication required" });

  const { data: callerRoles, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.user.id)
    .in("role", ["admin", "owner"]);
  if (roleError) return json(500, { error: "Authorization check failed" });
  if (!callerRoles?.length) return json(403, { error: "Admin or Owner authorization required" });

  let payload: { user_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid request body" });
  }
  const targetUserId = payload.user_id;
  if (!targetUserId) return json(400, { error: "Connector user_id is required" });

  const [{ data: profile, error: profileError }, { data: connector, error: connectorError }] = await Promise.all([
    admin.from("profiles").select("id,email,full_name,is_active").eq("id", targetUserId).maybeSingle(),
    admin.from("connector_profiles").select("user_id,active").eq("user_id", targetUserId).maybeSingle(),
  ]);
  if (profileError || connectorError) return json(500, { error: "Unable to load Connector onboarding state" });
  if (!profile?.email || !connector) return json(404, { error: "Connector onboarding record not found" });
  if (profile.is_active === false || connector.active === false) return json(409, { error: "Connector account is inactive" });

  const { data: connectorRole, error: connectorRoleError } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", targetUserId)
    .eq("role", "connector")
    .maybeSingle();
  if (connectorRoleError) return json(500, { error: "Unable to verify Connector role" });
  if (!connectorRole) return json(409, { error: "Connector role is not provisioned" });

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(targetUserId);
  if (authUserError || !authUser.user) return json(404, { error: "Auth user not found" });
  if (authUser.user.last_sign_in_at) return json(409, { error: "Connector account is already activated" });

  const cooldownSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: recentEmails, error: recentError } = await admin
    .from("notification_email_queue")
    .select("id,status,created_at,notification_id")
    .eq("recipient_email", profile.email)
    .gte("created_at", cooldownSince)
    .in("status", ["pending", "processing", "sent"])
    .limit(1);
  if (recentError) return json(500, { error: "Unable to verify resend rate limit" });
  if (recentEmails?.length) return json(429, { error: "Activation email was sent recently. Please wait before requesting another resend." });

  const appUrl = Deno.env.get("AVELIXA_APP_URL") ?? "https://avelixa.co.ke";
  const redirectTo = `${appUrl.replace(/\/$/, "")}/set-password`;
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
    options: { redirectTo },
  });
  if (linkError || !linkData?.properties?.action_link) {
    return json(502, { error: "Unable to generate activation link" });
  }

  const activationUrl = linkData.properties.action_link;
  const notificationBody = `Your Avelixa Connector account is ready for secure activation. Use the activation email link to create your password. If you did not request this, contact Avelixa support.`;

  const { error: notificationError } = await admin.from("notifications").insert({
    user_id: targetUserId,
    notification_type: "connector_activation",
    title: "Connector activation link",
    content: notificationBody,
    link: activationUrl,
    metadata: { activation: true, resend: true },
  });
  if (notificationError) return json(502, { error: "Unable to queue activation email" });

  return json(202, { ok: true, status: "queued" });
});
