import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const servicePath = path.join(root, 'src', 'lib', 'pushNotifications.ts');
const service = fs.readFileSync(servicePath, 'utf8');

const initializerStart = service.indexOf('export async function initializeAvelixaPushNotifications');
assert.ok(initializerStart >= 0, 'push notification initializer must exist');
const initializer = service.slice(initializerStart);

assert.match(
  initializer,
  /permission\s*=\s*await\s+requestPushNotificationPermission\(\)/,
  'initialization must request browser notification permission when it is not already granted',
);
assert.match(
  initializer,
  /await\s+subscribeToAvelixaPushNotifications\(\)/,
  'initialization must create/persist the real push subscription after permission is granted',
);
assert.doesNotMatch(
  initializer,
  /if\s*\(permission\s*!==\s*['"]granted['"]\)\s*\{\s*return\s*\{/,
  'initialization must not silently return before requesting permission',
);

const permissionFnStart = service.indexOf('export async function requestPushNotificationPermission');
assert.ok(permissionFnStart >= 0, 'permission request function must exist');
const permissionFn = service.slice(permissionFnStart, service.indexOf('export async function subscribeToAvelixaPushNotifications'));
assert.match(
  permissionFn,
  /Notification\.requestPermission\(\)/,
  'the user action must reach the browser Notifications API',
);

console.log('Push notification permission enablement contract: PASS');
