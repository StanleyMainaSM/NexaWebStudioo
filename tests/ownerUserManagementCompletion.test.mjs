import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Owner server management path forwards bearer authentication and verifies Owner', () => {
  const source = read('server.ts');
  assert.match(source, /authorization.*startsWith\("Bearer "\)/s);
  assert.match(source, /supabaseAdmin\.auth\.getUser\(token\)/);
  assert.match(source, /async function isOwner\(userId: string\)/);
  assert.match(source, /eq\("role",\s*"owner"\)/);
  assert.match(source, /OWNER_ASSIGNABLE_ROLES = \[/);
  for (const role of ['client', 'operator', 'connector', 'admin']) assert.match(source, new RegExp(`"${role}"`));
});

test('Owner role assignment is independent and duplicate-safe', () => {
  const source = read('server.ts');
  assert.match(source, /app\.post\(\s*"\/api\/owner\/users\/\:id\/roles"/s);
  assert.match(source, /upsert\(\s*\{\s*user_id:\s*targetUserId,\s*role/s);
  assert.match(source, /onConflict:\s*"user_id,role"/s);
  assert.match(source, /Owner cannot assign the Owner role through this interface/);
});

test('Role removal only targets the selected role', () => {
  const source = read('server.ts');
  assert.match(source, /app\.delete\(\s*"\/api\/owner\/users\/\:id\/roles\/\:role"/s);
  assert.match(source, /\.eq\("user_id",\s*targetUserId\)\s*\.eq\("role",\s*selectedRole\)/s);
  assert.match(source, /The Owner role cannot be removed through this interface/);
});

test('Normal Owner User Management has no destructive user-delete route', () => {
  const source = read('server.ts');
  assert.doesNotMatch(source, /app\.delete\(\s*"\/api\/owner\/users\/\:id"/s);
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.doesNotMatch(ui, /\/api\/owner\/users\/\$\{user\.id\}\s*['"`]/);
  assert.doesNotMatch(ui, /handleDeleteUser/);
});

test('Owner member status service protects self and other Owners and changes Auth access', () => {
  const source = read('supabase/functions/avelixa-owner-member-status-prod/index.ts');
  assert.match(source, /Authorization/);
  assert.match(source, /eq\("role", "owner"\)/);
  assert.match(source, /userId\s*===\s*actorId/);
  assert.match(source, /Another Owner account cannot be deactivated/);
  assert.match(source, /\.from\("profiles"\)[\s\S]*?\.update\(\{ is_active: active \}/);
  assert.match(source, /auth\.admin\.updateUserById\(userId/);
  assert.match(source, /ban_duration/);
  assert.match(source, /connector_profiles/);
});

test('Owner UI exposes the full reversible lifecycle and no Owner role selector', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /Add Member/);
  assert.match(source, /changeRole/);
  assert.match(source, /Remove|remove/);
  assert.match(source, /Deactivate/);
  assert.match(source, /Reactivate/);
  for (const role of ['client', 'operator', 'connector', 'admin']) assert.match(source, new RegExp(role));
  assert.doesNotMatch(source, /value=['"]owner['"]/i);
  assert.match(source, /selectedRoles\.slice\(1\)/);
});

test('Owner lifecycle migration is reversible and refreshes get_my_roles from active profiles', () => {
  const sql = read('supabase/migrations/20260903090000_owner_member_lifecycle.sql');
  assert.match(sql, /add column if not exists is_active boolean/i);
  assert.match(sql, /set default true/i);
  assert.match(sql, /set not null/i);
  assert.match(sql, /p\.is_active = true/i);
  assert.doesNotMatch(sql, /delete from public\.profiles/i);
  assert.doesNotMatch(sql, /drop table/i);
});
