import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const legacyPath = path.join(root, 'src', 'lib', 'pushNotifications.ts');
const canonicalPath = path.join(root, 'src', 'lib', 'pushNotificationService.ts');
const legacy = fs.readFileSync(legacyPath, 'utf8');
const canonical = fs.readFileSync(canonicalPath, 'utf8');

assert.match(
  legacy,
  /from\s*['"]\.\/pushNotificationService['"];?/, 
  'legacy push notification entrypoint must delegate to the canonical push notification service',
);

const initializerStart = canonical.indexOf('export async function initializeAvelixaPushNotifications');
assert.ok(initializerStart >= 0, 'canonical push notification initializer must exist');
const initializer = canonical.slice(initializerStart);

assert.match(
  initializer,
  /permission\s*=\s*await\s+requestPushNotificationPermission\(\)/,
  'initialization must request browser permission when permission is not already granted',
);
assert.match(
  initializer,
  /const subscription\s*=\s*await\s+subscribeToAvelixaPushNotifications\(\)/,
  'initialization must create the real push subscription after permission is granted',
);
assert.match(
  initializer,
  /permission === 'denied'/,
  'denied permission must be represented as a denied state rather than enabled',
);
assert.match(
  initializer,
  /permission: 'granted'/,
  'successful initialization must report the actual granted permission state',
);

const permissionFnStart = canonical.indexOf('export async function requestPushNotificationPermission');
assert.ok(permissionFnStart >= 0, 'permission request function must exist');
const permissionFn = canonical.slice(permissionFnStart, canonical.indexOf('export async function subscribeToAvelixaPushNotifications'));
assert.match(
  permissionFn,
  /Notification\.requestPermission\(\)/,
  'the user action must reach the browser Notifications API',
);

assert.match(
  canonical,
  /registration\.pushManager\.subscribe\(/,
  'granted permission must result in a browser PushSubscription',
);
assert.match(
  canonical,
  /from\('push_subscriptions'\)/,
  'the real push subscription must be persisted through the existing push_subscriptions table',
);
assert.match(
  canonical,
  /from\('notification_preferences'\)/,
  'the existing notification preference must be synchronized after subscription',
);

console.log('Push notification permission enablement contract: PASS');
