import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const server = () => read('server.ts');
const ui = () => read('src/pages/portal/OwnerUserManagement.tsx');

function ownerRouteBlocks(source, routeLiteral) {
  const start = source.indexOf(routeLiteral);
  assert.ok(start >= 0, `Expected route ${routeLiteral} to exist`);
  const end = source.indexOf('\n/*', start + routeLiteral.length);
  return source.slice(start, end > start ? end : source.length);
}

test('Owner User Management gate is server-verifiable and reuses the Owner portal access security boundary', () => {
  const source = server();
  assert.match(source, /async function requireOwnerUserManagementAccess\(req: express\.Request\)/);
  assert.match(source, /supabaseAdmin\.auth\.getUser\(token\)/);
  assert.match(source, /eq\("role",\s*"owner"\)/);
  assert.match(source, /\.from\("profiles"\)\s*\.select\("is_active"\)/s);
  assert.match(source, /has_portal_access/);
  assert.match(source, /p_portal:\s*"owner"/);
  assert.match(source, /VITE_SUPABASE_ANON_KEY/);
});

test('Every Owner User Management server operation requires the access gate', () => {
  const source = server();
  for (const route of [
    '"/api/owner/users"',
    '"/api/owner/users/:id/roles"',
    '"/api/owner/users/:id/roles/:role"',
    '"/api/owner/users/:id"',
  ]) {
    const block = ownerRouteBlocks(source, route);
    assert.match(block, /requireOwnerUserManagementAccess\(req\)/, `Route ${route} must enforce the User Management gate`);
  }
});

test('The User Management password prompt unlocks the Owner portal gate and never persists credentials', () => {
  const source = ui();
  assert.match(source, /verifyPortalPassword/);
  assert.match(source, /'owner'/);
  assert.match(source, /hasPortalAccess/);
  assert.doesNotMatch(source, /signInWithPassword/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.match(source, /clearPortalAccess/);
});

test('Logout invalidates the local User Management gate state', () => {
  const source = ui();
  assert.match(source, /onAuthStateChange/);
  assert.match(source, /SIGNED_OUT/);
  assert.match(source, /setAuthenticated\(false\)/);
  assert.match(source, /clearPortalAccess\('owner'\)/);
});

test('Stale and expired unlocks are rejected by the existing session-bound Owner portal gate', () => {
  const source = read('supabase/migrations/20260905150100_portal_access_control.sql');
  assert.match(source, /coalesce\(s\.not_after, 'infinity'::timestamptz\) > now\(\)/);
  assert.match(source, /u\.expires_at > now\(\)/);
  assert.match(source, /session_id/);
  assert.match(source, /now\(\) \+ interval '8 hours'/);
});

test('The User Management gate cannot be satisfied by another portal password', () => {
  const source = ui();
  assert.match(source, /verifyPortalPassword\('owner'/);
  assert.doesNotMatch(source, /verifyPortalPassword\((?!'owner')/);
});

test('Owner role protection and lifecycle controls remain intact', () => {
  const source = server();
  assert.match(source, /async function isOwner\(userId: string\)/);
  assert.match(source, /The Owner role cannot be removed through this interface/);
  assert.match(source, /You cannot permanently remove your own Owner account/);
  assert.match(source, /Another Owner account cannot be permanently removed/);
  assert.match(source, /owner_user_permanently_deleted/);
  const statusFunction = read('supabase/functions/avelixa-owner-member-status-prod/index.ts');
  assert.match(statusFunction, /Another Owner account cannot be deactivated/);
  assert.match(statusFunction, /updateUserById\(userId/);
  assert.match(statusFunction, /owner_user_reactivated/);
  assert.match(statusFunction, /owner_user_deactivated/);
});

test('Role removal remains distinct from permanent account deletion', () => {
  const source = ui();
  assert.match(source, /Remove role/);
  assert.match(source, /handleRemoveRole/);
  assert.match(source, /handleDeleteUser/);
  assert.match(source, /\/api\/owner\/users\/\$\{user\.id\}\/roles\/\$\{selectedRole\}/);
  assert.match(source, /\/api\/owner\/users\/\$\{user\.id\}/);
});

test('User Management exposes no password, hash, or service-role secret', () => {
  const source = `${server()}\n${ui()}`;
  assert.doesNotMatch(source, /password_hash\s*[:=]/i);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY.*res\.|res\.[^\n]*SUPABASE_SERVICE_ROLE_KEY/i);
  assert.doesNotMatch(source, /access_token.*res\.|refresh_token.*res\./i);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
