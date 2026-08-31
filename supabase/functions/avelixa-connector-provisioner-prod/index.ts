import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("AVELIXA_AUTOMATION_SECRET");

const configuredRedirect = Deno.env.get("AVELIXA_ACTIVATION_REDIRECT")?.trim();
const ACTIVATION_REDIRECT = configuredRedirect || "https://avelixa.co.ke";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function logEvent(
  applicationId: string,
  eventType: string,
  userId: string | null,
  payload: Record<string, unknown> = {},
) {
  await supabase.from("connector_provisioning_events").insert({
    application_id: applicationId,
    event_type: eventType,
    user_id: userId,
    payload,
  });
}

async function provisionOne(row: any) {
  const applicationId = row.application_id;

  const { data: app, error: appError } = await supabase
    .from("connector_applications")
    .select("id,full_name,email,status,provisioning_status,provisioned_user_id")
    .eq("id", applicationId)
    .single();

  if (appError) throw appError;
  if (app.status !== "approved") {
    return { applicationId, skipped: true, reason: "application_not_approved" };
  }
  if (app.provisioning_status === "completed" && app.provisioned_user_id) {
    return {
      applicationId,
      skipped: true,
      reason: "already_completed",
      userId: app.provisioned_user_id,
    };
  }

  await supabase
    .from("connector_provisioning_queue")
    .update({
      status: "processing",
      attempts: (row.attempts ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "pending");

  await supabase
    .from("connector_applications")
    .update({
      provisioning_status: "processing",
      provisioning_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  await logEvent(applicationId, "provisioning_started", null, { email: app.email });

  try {
    let userId: string | null = app.provisioned_user_id ?? null;
    let createdNew = false;

    if (!userId) {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) throw listError;

      const existing = users.users.find(
        (u) => (u.email ?? "").toLowerCase() === app.email.toLowerCase(),
      );
      if (existing) userId = existing.id;
    }

    if (!userId) {
      const temporaryPassword = crypto.randomUUID();
      const { data, error } = await supabase.auth.admin.createUser({
        email: app.email,
        password: temporaryPassword,
        // The applicant has access to this mailbox because the activation
        // link is delivered there. Confirming here also makes the account
        // usable through the normal password login after activation.
        email_confirm: true,
        user_metadata: {
          full_name: app.full_name,
          source: "avelixa_connector_application",
          connector_application_id: applicationId,
        },
      });
      if (error) throw error;
      userId = data.user.id;
      createdNew = true;
    } else {
      // Existing unconfirmed users can otherwise set a password through the
      // recovery link but fail normal password login after the activation
      // session ends. The approved application is the trusted onboarding
      // action, so keep the existing account confirmed as part of activation.
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (error) throw error;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: app.email,
          full_name: app.full_name,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    if (profileError) throw profileError;

    if (createdNew) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "client");
      if (error) throw error;
    }

    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "connector" },
        { onConflict: "user_id,role" },
      );
    if (roleError) throw roleError;

    const { data: connectorProfile, error: connectorError } = await supabase
      .from("connector_profiles")
      .upsert(
        {
          user_id: userId,
          is_active: true,
          commission_rate: 20.0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id,user_id,avl_id,is_active,commission_rate")
      .single();
    if (connectorError) throw connectorError;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: app.email,
      options: { redirectTo: ACTIVATION_REDIRECT },
    });
    if (linkError) throw linkError;

    const activationUrl = linkData.properties?.action_link;
    if (!activationUrl) throw new Error("Supabase did not return an activation link");

    const notificationContent =
      `Your Avelixa Connector account has been approved. Your Connector ID is ${connectorProfile.avl_id}. ` +
      "Use the activation link to set your password and access the Connector Dashboard.";

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: "Your Avelixa Connector account is approved",
        content: notificationContent,
        link: activationUrl,
        notification_type: "connector_activation",
        entity_type: "connector_application",
        entity_id: applicationId,
        metadata: {
          avl_id: connectorProfile.avl_id,
          application_id: applicationId,
          activation_redirect: ACTIVATION_REDIRECT,
        },
        dedupe_key: `connector_activation:${applicationId}:${userId}`,
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (notificationError && notificationError.code !== "23505") {
      throw notificationError;
    }

    await supabase
      .from("connector_provisioning_queue")
      .update({
        status: "completed",
        user_id: userId,
        activation_url: activationUrl,
        last_error: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    await supabase
      .from("connector_applications")
      .update({
        provisioning_status: "completed",
        provisioned_user_id: userId,
        provisioned_at: new Date().toISOString(),
        provisioning_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    await logEvent(applicationId, "provisioning_completed", userId, {
      avl_id: connectorProfile.avl_id,
      activation_redirect: ACTIVATION_REDIRECT,
    });

    return {
      applicationId,
      userId,
      avlId: connectorProfile.avl_id,
      createdNew,
      emailQueued: !notificationError,
      activationRedirect: ACTIVATION_REDIRECT,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const nextAttempts = (row.attempts ?? 0) + 1;

    await supabase
      .from("connector_provisioning_queue")
      .update({
        status: nextAttempts >= 5 ? "failed" : "pending",
        next_attempt_at: new Date(Date.now() + Math.min(nextAttempts * 15, 120) * 60000).toISOString(),
        last_error: message.slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    await supabase
      .from("connector_applications")
      .update({
        provisioning_status: nextAttempts >= 5 ? "failed" : "pending",
        provisioning_error: message.slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    await logEvent(applicationId, "provisioning_failed", null, {
      error: message.slice(0, 2000),
    });

    throw err;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const auth = req.headers.get("Authorization") ?? "";
    if (
      !WORKER_SECRET ||
      !auth.startsWith("Bearer ") ||
      auth.slice(7).trim() !== WORKER_SECRET
    ) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: rows, error } = await supabase
      .from("connector_provisioning_queue")
      .select("id,application_id,status,attempts,next_attempt_at")
      .eq("status", "pending")
      .lte("next_attempt_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(10);
    if (error) throw error;

    const results = [];
    for (const row of rows ?? []) {
      try {
        results.push(await provisionOne(row));
      } catch (err) {
        results.push({
          applicationId: row.application_id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return json({
      success: true,
      processed: results.length,
      results,
      activationRedirect: ACTIVATION_REDIRECT,
    });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
