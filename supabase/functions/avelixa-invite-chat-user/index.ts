import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json({ error: "Invitation service is not configured." }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const fullName = String(body.full_name ?? body.name ?? "").trim();
  if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Enter a valid name and email address." }, 400);
  }
  if (email === String(user.email ?? "").toLowerCase()) return json({ error: "You cannot add yourself." }, 400);

  const admin = createClient(url, service);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,full_name,email,avatar_url")
    .eq("email", email)
    .maybeSingle();
  if (profileError) return json({ error: profileError.message }, 500);
  if (profile) return json({ registered: true, user: profile, message: "This person is already on Avelixa." });

  const { data: existingInvite, error: lookupError } = await admin
    .from("chat_contact_invitations")
    .select("id,status")
    .eq("inviter_id", user.id)
    .eq("email", email)
    .maybeSingle();
  if (lookupError) return json({ error: lookupError.message }, 500);
  if (existingInvite?.status === "sent") return json({ invited: true, message: `An invitation has already been sent to ${email}.` });

  const invitation = { inviter_id: user.id, email, contact_name: fullName, status: "sent" };
  const saved = existingInvite
    ? await admin.from("chat_contact_invitations").update(invitation).eq("id", existingInvite.id)
    : await admin.from("chat_contact_invitations").insert(invitation);
  if (saved.error) return json({ error: saved.error.message }, 400);

  const siteUrl = (Deno.env.get("SITE_URL") || req.headers.get("origin") || "https://sabre.co.ke").replace(/\/$/, "");
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/set-password`,
    data: {
      invited_by: user.id,
      invited_contact_name: fullName,
      invitation_type: "chat",
      portal: "connector",
    },
  });

  if (inviteError) {
    await admin.from("chat_contact_invitations")
      .update({ status: "failed" })
      .eq("inviter_id", user.id)
      .eq("email", email);
    return json({ error: inviteError.message }, 400);
  }

  return json({
    invited: true,
    registered: false,
    user_id: invited.user?.id ?? null,
    message: `Invitation sent to ${email}.`,
  });
});
