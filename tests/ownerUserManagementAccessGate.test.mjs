import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const server = () => read('server.ts');
const ui = () => read('src/pages/portal/OwnerUserManagement.tsx');
const statusFunction = () => read('supabase/functions/avelixa-owner-member-status-prod/index.ts');

function routeBlock(source, routeLiteral) {
  const start = source.indexOf(routeLiteral);
  assert.ok(start >= 0, `Expected route ${routeLiteral} to exist`);
  const next = source.indexOf('\napp.', start + routeLiteral.length);
  return source.slice(start, next > start ? next : source.length);
}

test('Owner User Management gate is server-verifiable and reuses the Owner portal access security boundary', () => {
  const source = server();
  assert.match(source, /async function hasOwnerPortalAccess\(token: string\)/);
  assert.match(source, /caller\.rpc\(['"]has_portal_access['"]/);
  assert.match(source, /p_portal:\s*['"]owner['"]/);
  assert.match(source, /async function getAuthenticatedUser\(req: express\.Request\)/);
  assert.match(source, /req\.path\.startsWith\("\/api\/owner\/users"\)/);
  assert.match(source, /\.eq\("role",\s*"owner"\)/);
  assert.match(source, /\.from\("profiles"\)/);
  assert.match(source, /\.select\("is_active"\)/);
});

test('Every Owner User Management server operation passes through the authenticated-user gate', () => {
  const source = server();
  for (const route of [
    'app.get("/api/owner/users"',
    'app.post("/api/owner/users"',
    'app.post("/api/owner/users/:id/roles"',
    'app.delete("/api/owner/users/:id/roles/:role"',
    'app.delete("/api/owner/users/:id"',
  ]) {
    const block = routeBlock(source, route);
    assert.match(block, /getAuthenticatedUser\(req\)/, `Route ${route} must pass through the authenticated-user gate`);
  }
});

test('The existing User Management password prompt unlocks the Owner portal gate and never persists credentials', () => {
  const source = ui();
  assert.match(source, /verifyPortalPassword\('owner'/);
  assert.match(source, /hasPortalAccess\('owner'/);
  assert.doesNotMatch(source, /signInWithPassword/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.match(source, /clearPortalAccess\('owner'/);
});

test('Logout invalidates the local User Management gate state', () => {
  const source = ui();
  assert.match(source, /onAuthStateChange/);
  assert.match(source, /SIGNED_OUT/);
  assert.match(source, /setVerified\(false\)/);
  assert.match(source, /clearPortalAccess\('owner'\)/);
});

test('Stale and expired unlocks are rejected by the existing session-bound Owner portal gate', () => {
  const source = read('supabase/migrations/20260905150100_portal_access_control.sql');
  assert.match(source, /coalesce\(s\.not_after, 'infinity'::timestamptz\) > now\(\)/);
  assert.match(source, /u\.expires_at > now\(\)/);
  assert.match(source, /session_id/);
  assert.match(source, /now\(\) \+ interval '8 hours'/);
});

test('The User Management gate is explicitly tied to the Owner portal and cannot use another portal password', () => {
  const source = ui();
  assert.match(source, /verifyPortalPassword\('owner'/);
  assert.doesNotMatch(source, /verifyPortalPassword\('(?!owner')[^']+'/);
});

test('Existing Owner authorization and lifecycle protections remain intact', () => {
  const source = server();
  const edge = statusFunction();
  assert.match(source, /async function isOwner\(userId: string\)/);
  assert.match(source, /The Owner role cannot be removed through this interface/);
  assert.match(source, /You cannot permanently remove your own Owner account/);
  assert.match(source, /Another Owner account cannot be permanently removed/);
  assert.match(source, /owner_user_permanently_deleted/);
  assert.match(edge, /\.eq\("role", "owner"\)/);
  assert.match(edge, /has_portal_access/);
  assert.match(edge, /Another Owner account cannot be deactivated/);
  assert.match(edge, /updateUserById\(userId/);
  assert.match(edge, /owner_user_reactivated/);
  assert.match(edge, /owner_user_deactivated/);
});

test('Add Member, supported role assignment/removal, deactivation/reactivation, and permanent removal remain separate operations', () => {
  const source = server();
  const page = ui();
  assert.match(source, /app\.post\("\/api\/owner\/users"/);
  assert.match(source, /app\.post\("\/api\/owner\/users\/:id\/roles"/);
  assert.match(source, /app\.delete\("\/api\/owner\/users\/:id\/roles\/:role"/);
  assert.match(source, /app\.delete\("\/api\/owner\/users\/:id"/);
  assert.match(page, /setMemberActive/);
  assert.match(page, /Permanent Account Removal/);
  assert.match(page, /aria-label=\{`Remove \$\{label\(role\)\} role`\}/);
  assert.match(page, /\/roles\/\$\{role\}/);
  assert.match(page, /Permanently Remove/);
});

test('User Management exposes no password, hash, access token, or browser-stored credential', () => {
  const source = `${server()}\n${ui()}\n${statusFunction()}`;
  assert.doesNotMatch(source, /password_hash\s*[:=]/i);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /access_token\s*[:=].*res\./i);
  assert.doesNotMatch(source, /refresh_token\s*[:=].*res\./i);
});
