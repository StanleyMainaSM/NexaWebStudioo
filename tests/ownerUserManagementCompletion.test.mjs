import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function routeBlock(source, method, route) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`app\\.${method}\\s*\\(\\s*["']${escaped}["']`));
  assert.ok(match, `Expected ${method.toUpperCase()} ${route}`);
  const next = source.indexOf('\napp.', match.index + match[0].length);
  return source.slice(match.index, next > match.index ? next : source.length);
}

test('Owner server management path forwards bearer authentication and verifies Owner', () => {
  const source = read('server.ts');
  assert.match(source, /req\.path\.startsWith\("\/api\/owner\/users"\)/);
  assert.match(source, /getAuthenticatedUser\(req\)/);
  assert.match(source, /hasOwnerPortalAccess\(token\)/);
  assert.match(source, /\.eq\("role", "owner"\)/);
});

test('Owner role assignment is independent and duplicate-safe', () => {
  const source = read('server.ts');
  const block = routeBlock(source, 'post', '/api/owner/users/:id/roles');
  assert.match(block, /user_roles/);
  assert.match(block, /role/);
});

test('Role removal only targets the selected role', () => {
  const source = read('server.ts');
  const block = routeBlock(source, 'delete', '/api/owner/users/:id/roles/:role');
  assert.match(block, /delete\(/);
  assert.match(block, /user_roles/);
  assert.match(block, /role/);
});

test('Owner User Management exposes a distinct permanent account removal route and action', () => {
  const source = read('server.ts');
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.ok(routeBlock(source, 'delete', '/api/owner/users/:id'));
  assert.match(ui, /handleDeleteUser/);
  assert.match(ui, /Permanent Remove/);
});

test('Permanent removal protects self, other Owners, missing targets, and identity-dependent history', () => {
  const source = read('server.ts');
  assert.match(source, /You cannot permanently remove your own Owner account/);
  assert.match(source, /Another Owner account cannot be permanently removed/);
  assert.match(source, /owner_user_permanently_deleted/);
});

test('Permanent removal preserves nullable business history and does not delete business records', () => {
  const source = read('server.ts');
  assert.match(source, /preserve/);
  assert.match(source, /business/);
});

test('Connector permanent removal records connector identity and audit metadata without secrets', () => {
  const source = read('server.ts');
  assert.match(source, /connector/);
  assert.match(source, /audit/);
  assert.doesNotMatch(source, /password_hash\s*[:=]/i);
});

test('Permanent removal failure attempts reference restoration and does not report success', () => {
  const source = read('server.ts');
  assert.match(source, /restoreDetachedReferences/);
  assert.match(source, /Permanent account removal could not be completed/);
});

test('Owner member status remains reversible and separate from permanent removal', () => {
  const source = read('supabase/functions/avelixa-owner-member-status-prod/index.ts');
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /active/);
  assert.match(source, /updateUserById\(userId/);
  assert.match(ui, /setMemberActive\(user, false\)/);
  assert.match(ui, /setMemberActive\(user, true\)/);
});

test('Role X remains Remove Role and is independent from permanent account deletion', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /changeRole\(user, role, true\)/);
  assert.match(source, /aria-label=\{`Remove \$\{label\(role\)\} role`\}/);
  assert.match(source, /handleDeleteUser/);
  assert.match(source, /method: 'DELETE'/);
  assert.match(source, /\/api\/owner\/users\/\$\{user\.id\}/);
  assert.match(source, /if \(!confirmed\) return/);
  for (const phrase of ['Permanent Account Removal', 'NOT Deactivate', 'not Remove Role', 'Reactivate cannot restore', 'cannot be undone through Owner User Management', 'Historical/business records are not intentionally erased']) assert.ok(source.includes(phrase));
});

test('Owner lifecycle migration remains reversible and is not a permanent deletion mechanism', () => {
  const sql = read('supabase/migrations/20260903090000_owner_member_lifecycle.sql');
  assert.match(sql, /is_active/);
  assert.doesNotMatch(sql, /drop table/i);
});
