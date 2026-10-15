import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.avelixa.co.ke",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-avelixa-push-secret",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function getWorkerSecret() {
  const { data, error } = await supabase.rpc("get_push_worker_secret");
  if (error) throw error;
  return data as string;
}

async function getVapidConfig(secret: string) {
  const { data, error } = await supabase.rpc("get_push_worker_config", { p_secret: secret });
  if (error) throw error;
  return data?.vapid ?? null;
}

async function ensureVapidKeys(secret: string) {
  let config = await getVapidConfig(secret);
  if (config?.privateKey && config?.publicKey) return config;

  const generated = webpush.generateVAPIDKeys();
  const { error } = await supabase.rpc("save_push_vapid_keys", {
    p_secret: secret,
    p_vapid: { privateKey: generated.privateKey, publicKey: generated.publicKey },
  });
  if (error) throw error;

  config = await getVapidConfig(secret);
  if (!config?.privateKey || !config?.publicKey) throw new Error("VAPID keys could not be initialized");
  return config;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = await getWorkerSecret();
    if (!secret) return json({ error: "Push configuration unavailable" }, 500);

    if (req.method === "GET") {
      const vapid = await ensureVapidKeys(secret);
      return json({ publicKey: vapid.publicKey });
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const incomingSecret = req.headers.get("x-avelixa-push-secret");
    if (!incomingSecret || incomingSecret !== secret) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const notificationId = body?.notification_id;
    if (!notificationId) return json({ error: "notification_id is required" }, 400);

    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .select("id,user_id,title,content,link,metadata,notification_type")
      .eq("id", notificationId)
      .maybeSingle();
    if (notificationError) throw notificationError;
    if (!notification?.user_id) return json({ ok: true, delivered: 0 });

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth,expiration_time")
      .eq("user_id", notification.user_id);
    if (subscriptionError) throw subscriptionError;
    if (!subscriptions?.length) return json({ ok: true, delivered: 0, skipped: "no_subscription" });

    const vapid = await ensureVapidKeys(secret);
    webpush.setVapidDetails("mailto:admin@avelixa.co.ke", vapid.publicKey, vapid.privateKey);

    let acceptedByProvider = 0;
    for (const subscription of subscriptions) {
      const now = new Date().toISOString();
      const { data: existing, error: lookupError } = await supabase
        .from("push_deliveries")
        .select("id,status,attempts,next_attempt_at,updated_at")
        .eq("notification_id", notification.id)
        .eq("subscription_id", subscription.id)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existing?.status === "accepted") continue;
      if (existing && Number(existing.attempts || 0) >= 5 && existing.status === "failed") continue;
      if (existing?.next_attempt_at && new Date(existing.next_attempt_at).getTime() > Date.now()) continue;
      if (existing?.status === "processing" && Date.now() - new Date(existing.updated_at).getTime() < 5 * 60_000) continue;

      const attempts = Number(existing?.attempts || 0) + 1;
      let deliveryId: string | null = null;
      if (existing) {
        const { data: claimed, error: claimError } = await supabase
          .from("push_deliveries")
          .update({
            status: "processing",
            attempts,
            next_attempt_at: null,
            last_error: null,
            updated_at: now,
          })
          .eq("id", existing.id)
          .eq("status", existing.status)
          .eq("updated_at", existing.updated_at)
          .select("id")
          .maybeSingle();
        if (claimError) throw claimError;
        if (!claimed?.id) continue;
        deliveryId = claimed.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("push_deliveries")
          .insert({
            notification_id: notification.id,
            subscription_id: subscription.id,
            status: "processing",
            attempts,
            updated_at: now,
          })
          .select("id")
          .maybeSingle();
        if (insertError) {
          if ((insertError as { code?: string }).code === "23505") continue;
          throw insertError;
        }
        if (!inserted?.id) continue;
        deliveryId = inserted.id;
      }

      const isMessage = notification.notification_type === "message";
      const metadata = isMessage && typeof notification.metadata?.conversation_id === "string"
        ? { conversation_id: notification.metadata.conversation_id }
        : {};
      const safeUrl = isMessage
        ? (metadata.conversation_id
            ? `/portal/messages?conversation=${encodeURIComponent(metadata.conversation_id)}`
            : "/portal/messages")
        : (typeof notification.link === "string" &&
            notification.link.startsWith("/portal") &&
            !notification.link.startsWith("//")
            ? notification.link
            : "/portal");
      const payload = JSON.stringify({
        title: isMessage ? "Avelixa" : (notification.title || "Avelixa"),
        body: isMessage ? "You have a new message on Avelixa." : (notification.content || "You have a new Avelixa notification."),
        url: safeUrl,
        notificationId: notification.id,
        type: notification.notification_type || "general",
        metadata,
      });

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expiration_time ? new Date(subscription.expiration_time).getTime() : null,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        );
        acceptedByProvider += 1;
        await supabase.from("push_deliveries").update({
          status: "accepted",
          attempts,
          sent_at: new Date().toISOString(),
          provider_accepted_at: new Date().toISOString(),
          next_attempt_at: null,
          updated_at: new Date().toISOString(),
          last_error: null,
        }).eq("id", deliveryId);
      } catch (sendError) {
        const statusCode = Number((sendError as { statusCode?: number })?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          continue;
        }
        const retryAt = attempts < 5
          ? new Date(Date.now() + Math.min(60_000 * (2 ** (attempts - 1)), 15 * 60_000)).toISOString()
          : null;
        await supabase.from("push_deliveries").update({
          status: "failed",
          attempts,
          next_attempt_at: retryAt,
          last_error: statusCode ? `Push provider returned HTTP ${statusCode}` : "Push provider request failed",
          updated_at: new Date().toISOString(),
        }).eq("id", deliveryId);
      }
    }
    return json({ ok: true, acceptedByProvider, subscriptions: subscriptions.length });
  } catch (error) {
    console.error("Avelixa push worker error:", error);
    return json({ error: error instanceof Error ? error.message : "Push worker failed" }, 500);
  }
});