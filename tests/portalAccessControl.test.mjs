import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const migrationPath = 'supabase/migrations/20260905150100_portal_access_control.sql';

test('portal access retains one centralized server-enforced database mechanism for the five legacy portals', () => {
  const sql = read(migrationPath);
  for (const portal of ['client', 'operator', 'connector', 'admin', 'owner']) assert.match(sql, new RegExp(`'${portal}'`));
  assert.match(sql, /private\.portal_access_passwords/);
  assert.match(sql, /private\.portal_access_unlocks/);
  assert.match(sql, /private\.verify_portal_access_password\(p_portal text, p_password text\)/);
  assert.match(sql, /private\.has_portal_access\(p_portal text\)/);
  assert.match(sql, /crypt\(v_password, gen_salt\('bf'\)\)/i);
  assert.match(sql, /crypt\(v_password, v_password_hash\) <> v_password_hash/i);
});

test('portal passwords never expose hashes or use browser storage', () => {
  const sql = read(migrationPath);
  const route = read('src/components/portal/ProtectedRoute.tsx');
  const access = read('src/lib/portalAccess.ts');
  assert.doesNotMatch(sql, /returning[\s\S]*password_hash/i);
  assert.doesNotMatch(access, /localStorage|sessionStorage/);
  assert.match(access, /verify_portal_access_password/);
  assert.match(access, /has_portal_access/);
  assert.match(route, /PortalAccessGate/);
});

test('Owner entry is based on Supabase Auth and role authorization, not the legacy shared Owner portal password gate', () => {
  const route = read('src/components/portal/ProtectedRoute.tsx');
  assert.match(route, /const \{ user, loading, roles, rolesLoading/);
  assert.match(route, /if \(!user\)/);
  assert.match(route, /hasRequiredRole/);
  assert.match(route, /isOwnerArea/);
  assert.match(route, /effectiveGate === 'none'/);
  assert.match(route, /requiredRoles/);
});

test('logout remains Supabase-session based so server-side session termination invalidates legacy unlocks', () => {
  const layout = read('src/pages/portal/PortalLayout.tsx');
  const sql = read(migrationPath);
  assert.match(layout, /supabase\.auth\.signOut\(\)/);
  assert.match(sql, /auth\.sessions/);
  assert.match(sql, /s\.id = v_session_id/);
  assert.match(sql, /s\.user_id = v_user_id/);
});

test('legacy portal passwords remain session-bound rather than indefinite browser unlocks', () => {
  const sql = read(migrationPath);
  assert.match(sql, /session_id uuid not null/i);
  assert.match(sql, /auth\.jwt\(\) ->> 'session_id'/);
  assert.match(sql, /expires_at timestamptz not null/i);
  assert.match(sql, /now\(\) \+ interval '8 hours'/);
});

console.log('portalAccessControl.test.mjs: PASS');
