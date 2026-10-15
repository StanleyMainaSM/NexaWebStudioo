import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const worker = read('supabase/functions/avelixa-push-worker/index.ts');
const serviceWorker = read('src/sw.ts');
const service = read('src/lib/pushNotificationService.ts');
const settings = read('src/components/portal/PushNotificationSettings.tsx');
const migration = read('supabase/migrations/20261015100500_harden_avelixa_push_delivery_retry.sql');
const scheduler = read('supabase/migrations/20261015110000_schedule_avelixa_push_retry.sql');
const baseline = read('supabase/migrations/20260825120459_add_avelixa_web_push_notifications.sql');
const conversation = read('src/pages/portal/CommunicationCenterV4.tsx');
const protectedRoute = read('src/components/portal/ProtectedRoute.tsx');
const login = read('src/pages/portal/Login.tsx');

assert.match(worker, /Access-Control-Allow-Origin": "https:\/\/www\.avelixa\.co\.ke"/,
  'the push key endpoint must allow the production www origin');
assert.match(worker, /isMessage \? "Avelixa"/,
  'message push title must not expose sender or conversation details');
assert.match(worker, /You have a new message on Avelixa\./,
  'message push body must remain private by default');
assert.match(worker, /next_attempt_at: retryAt/,
  'provider failures must schedule bounded retry');
assert.match(worker, /attempts < 5/,
  'push retries must be bounded');
assert.match(worker, /existing\?\.status === "accepted"/,
  'duplicate notification events must skip completed deliveries');
assert.match(worker, /status: "processing"/,
  'delivery attempts must be claimed before provider dispatch');
assert.match(serviceWorker, /candidate\.origin === self\.location\.origin/,
  'notification clicks must reject cross-origin navigation');
assert.match(serviceWorker, /candidate\.pathname\.startsWith\('\/portal\/'\)/,
  'notification clicks must remain inside the Avelixa portal');
assert.match(serviceWorker, /You have a new message on Avelixa\./,
  'service worker must enforce generic message text even if payload contains previews');
assert.match(service, /rpc\('register_push_subscription'/,
  'subscription ownership must be derived from authenticated RPC identity');
assert.match(service, /\.eq\('user_id', user\.id\)[\s\S]*\.eq\('endpoint', endpoint\)/,
  'unsubscribe must only delete the signed-in user’s subscription row');
assert.match(settings, /onClick=\{\(\) => void enable\(\)\}/,
  'permission must be requested from an explicit user action');
assert.doesNotMatch(settings, /Notification\.requestPermission\(\)/,
  'settings mount must not request notification permission automatically');
assert.match(baseline, /create table if not exists public\.push_subscriptions/i,
  'the repository must recreate the existing production push subscription schema');
assert.match(baseline, /create table if not exists public\.push_dispatch_queue/i,
  'message notifications must have a durable outbox row before remote dispatch');
assert.match(baseline, /exception when others then[\s\S]*durable queue row remains pending/i,
  'a temporary pg_net enqueue failure must not abort message delivery');
assert.match(worker, /from\("push_dispatch_queue"\)/,
  'the trusted worker must claim and complete durable dispatch events');
assert.match(baseline, /create table if not exists public\.push_deliveries/i,
  'the repository must recreate the existing production delivery ledger');
assert.match(baseline, /enable row level security/i,
  'push tables must keep RLS enabled');
assert.match(baseline, /grant execute on function public\.get_push_worker_secret\(\) to service_role/i,
  'the webhook secret getter must not be callable by browser roles');
assert.match(migration, /current_user_id uuid := auth\.uid\(\)/,
  'subscription registration must derive the user from auth.uid()');
assert.match(migration, /grant execute on function public\.register_push_subscription[\s\S]*to authenticated/i,
  'subscription registration RPC must only be executable by authenticated users');
assert.match(scheduler, /cron\.schedule\([\s\S]*avelixa-push-retry/,
  'failed push events must have a scheduled retry path');
assert.match(conversation, /searchParams\.get\('conversation'\)/,
  'push clicks must select the target conversation when it is available');

assert.match(protectedRoute, /location\.pathname\}\$\{location\.search\}/,
  'authentication redirects must preserve the notification conversation query');
assert.match(login, /if \(!signedInUser\)[\s\S]*Sign in first, then enable notifications/,
  'the login page must not request push permission before authentication');

console.log('Push notification privacy, ownership, retry and navigation contracts: PASS');
