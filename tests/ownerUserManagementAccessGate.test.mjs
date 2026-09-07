// Regression contract: Owner User Management must use the normal authenticated Owner session.
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

test('Owner User Management uses the authenticated Supabase Owner session without the legacy portal-access lock', () => {
  const source = read('server.ts');
  assert.match(source, /async function getAuthenticatedUser\(req: express\.Request\)/);
  assert.match(source, /req\.headers\.authorization/);
  assert.match(source, /supabaseAdmin\.auth\.getUser\(token\)/);
  assert.match(source, /req\.path\.startsWith\("\/api\/owner\/users"\)/);
  assert.match(source, /\.eq\("role",\s*"owner"\)/);
  assert.match(source, /\.from\("profiles"\)/);
  assert.match(source, /\.select\("is_active"\)/);
  assert.doesNotMatch(source, /hasOwnerPortalAccess/);
  assert.doesNotMatch(source, /has_portal_access/);
  assert.doesNotMatch(source, /User Management access is locked\. Re-enter the Owner access password\./);
});

test('All Owner User Management operations use the authenticated-user gate and retain Owner authorization', () => {
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
    assert.match(block, /isOwner\(ownerUser\.id\)/, `Route ${method.toUpperCase()} ${route} must retain server-side Owner authorization`);
    assert.doesNotMatch(block, /hasOwnerPortalAccess|has_portal_access|portal_access_password|User Management access is locked/i);
  }
});

test('Permanent removal uses the authenticated Owner session without a separate portal access password', () => {
  const source = read('server.ts');
  const block = routeBlock(source, 'delete', '/api/owner/users/:id');
  assert.match(block, /getAuthenticatedUser\(req\)/);
  assert.match(block, /isOwner\(ownerUser\.id\)/);
  assert.match(block, /You cannot permanently remove your own Owner account/);
  assert.match(block, /Another Owner account cannot be permanently removed/);
  assert.doesNotMatch(block, /hasOwnerPortalAccess|has_portal_access|portal_access_password|User Management access is locked/i);
});

test('Unauthenticated and authenticated non-Owner requests remain rejected by the Owner User Management authorization path', () => {
  const source = read('server.ts');
  const getAuth = source.slice(source.indexOf('async function getAuthenticatedUser'));
  assert.match(getAuth, /Missing authentication token/);
  assert.match(getAuth, /Your session is invalid or has expired/);
  for (const [method, route] of [
    ['get', '/api/owner/users'],
    ['post', '/api/owner/users'],
    ['post', '/api/owner/users/:id/roles'],
    ['delete', '/api/owner/users/:id/roles/:role'],
    ['delete', '/api/owner/users/:id'],
  ]) {
    const block = routeBlock(source, method, route);
    assert.match(block, /if \(!ownerUser\)/);
    assert.match(block, /res\.status\(401\)\.json/);
    assert.match(block, /isOwner\(ownerUser\.id\)/);
    assert.match(block, /res\.status\(403\)\.json/);
  }
});

test('User Management uses the currently authenticated Owner session without a second password gate', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /supabase\.auth\.getSession\(\)/);
  assert.match(source, /session\.access_token/);
  assert.doesNotMatch(source, /supabase\.auth\.signInWithPassword/);
  assert.doesNotMatch(source, /verifyPortalPassword\('owner'/);
  assert.doesNotMatch(source, /hasPortalAccess\('owner'/);
  assert.doesNotMatch(source, /Owner User Management access password/);
  assert.doesNotMatch(source, /clearPortalAccess\('owner'/);
});

test('Owner User Management clears local state on sign-out while relying on the live Supabase session for authorization', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /onAuthStateChange/);
  assert.match(source, /SIGNED_OUT/);
  assert.match(source, /setUsers\(\[\]\)/);
  assert.doesNotMatch(source, /OWNER_USER_MANAGEMENT_VERIFICATION_KEY/);
  assert.doesNotMatch(source, /sessionStorage\.setItem/);
  assert.doesNotMatch(source, /setVerified/);
});

test('Owner User Management does not store plaintext passwords or credential hashes', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.doesNotMatch(source, /password_hash\s*[:=]/i);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /portal_access_password/i);
  assert.doesNotMatch(source, /verify_portal_access_password/i);
});

test('Owner User Management server access uses the normal Owner session while legacy browser portal passwords remain unchanged', () => {
  const migration = read('supabase/migrations/20260906100000_owner_user_management_uses_authenticated_owner.sql');
  assert.match(migration, /v_portal = 'owner'/);
  assert.match(migration, /request\.headers/);
  assert.match(migration, /user-agent/);
  assert.match(migration, /node\|undici/);
  assert.match(migration, /lower\(ur\.role::text\) = 'owner'/);
  assert.match(migration, /coalesce\(p\.is_active, true\) = true/);
  assert.match(migration, /auth\.sessions/);
  assert.match(migration, /private\.portal_access_unlocks/);
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
  assert.doesNotMatch(edge, /has_portal_access/);
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
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /access_token\s*[:=].*res\./i);
  assert.doesNotMatch(source, /refresh_token\s*[:=].*res\./i);
});
