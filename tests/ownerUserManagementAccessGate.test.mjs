import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function routeBlock(source, method, route) {
  const pattern = new RegExp(`app\\.${method}\\s*\\(\\s*["']${escapeRegex(route)}["']`);
  const match = pattern.exec(source);
  assert.ok(match, `Expected route ${method.toUpperCase()} ${route} to exist`);
  const next = source.indexOf('\napp.', match.index + match[0].length);
  return source.slice(match.index, next > match.index ? next : source.length);
}

test('Owner User Management gate is server-verifiable and reuses the Owner portal access security boundary', () => {
  const source = read('server.ts');
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
  const source = read('server.ts');
  for (const [method, route] of [
    ['get', '/api/owner/users'],
    ['post', '/api/owner/users'],
    ['post', '/api/owner/users/:id/roles'],
    ['delete', '/api/owner/users/:id/roles/:role'],
    ['delete', '/api/owner/users/:id'],
  ]) {
    const block = routeBlock(source, method, route);
    assert.match(block, /getAuthenticatedUser\(req\)/, `Route ${method.toUpperCase()} ${route} must pass through the authenticated-user gate`);
  }
});

test('User Management verification uses the dedicated Owner portal access credential and never persists credentials', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /verifyPortalPassword\('owner'/);
  assert.match(source, /hasPortalAccess\('owner'/);
  assert.doesNotMatch(source, /signInWithPassword/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.match(source, /Owner User Management access password/);
  assert.match(source, /clearPortalAccess\('owner'/);
});

test('Verification errors are no longer mislabeled as a failed current Owner account password', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.doesNotMatch(source, /Password verification failed\. Please enter the password for your current Owner account\./);
  assert.match(source, /Owner User Management verification error/);
});

test('The Owner portal password verification RPC is present in the repository migration chain', () => {
  const migration = read('supabase/migrations/20260905150100_portal_access_control.sql');
  assert.match(migration, /create or replace function private\.verify_portal_access_password\(p_portal text, p_password text\)/);
  assert.match(migration, /create or replace function public\.verify_portal_access_password\(p_portal text, p_password text\)/);
  assert.match(migration, /grant execute on function public\.verify_portal_access_password\(text,text\) to authenticated/);
  assert.match(migration, /private\.portal_access_passwords/);
  assert.match(migration, /crypt\(v_password, v_password_hash\)/);
});

test('Logout invalidates the local User Management gate state', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
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
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /verifyPortalPassword\('owner'/);
  assert.doesNotMatch(source, /verifyPortalPassword\('(?!owner')[^']+'/);
});

test('Existing Owner authorization and lifecycle protections remain intact', () => {
  const source = read('server.ts');
  const edge = read('supabase/functions/avelixa-owner-member-status-prod/index.ts');
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
  const source = read('server.ts');
  const page = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.ok(routeBlock(source, 'post', '/api/owner/users'));
  assert.ok(routeBlock(source, 'post', '/api/owner/users/:id/roles'));
  assert.ok(routeBlock(source, 'delete', '/api/owner/users/:id/roles/:role'));
  assert.ok(routeBlock(source, 'delete', '/api/owner/users/:id'));
  assert.match(page, /setMemberActive/);
  assert.match(page, /Permanent Account Removal/);
  assert.match(page, /aria-label=\{`Remove \$\{label\(role\)\} role`\}/);
  assert.match(page, /\/roles\/\$\{role\}/);
  assert.match(page, /Permanent Remove/);
});

test('User Management exposes no password, hash, access token, or browser-stored credential', () => {
  const source = `${read('server.ts')}\n${read('src/pages/portal/OwnerUserManagement.tsx')}\n${read('supabase/functions/avelixa-owner-member-status-prod/index.ts')}`;
  assert.doesNotMatch(source, /password_hash\s*[:=]/i);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /access_token\s*[:=].*res\./i);
  assert.doesNotMatch(source, /refresh_token\s*[:=].*res\./i);
});
