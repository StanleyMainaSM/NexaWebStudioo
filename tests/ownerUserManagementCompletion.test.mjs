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

test('Owner User Management exposes a distinct permanent account removal route and action', () => {
  const source = read('server.ts');
  assert.match(source, /app\.delete\(\s*"\/api\/owner\/users\/\:id"/s);
  assert.match(source, /auth\.admin\.deleteUser\(\s*targetUserId\s*\)/s);
  assert.match(source, /owner_user_permanently_deleted/);
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(ui, /handleDeleteUser/);
  assert.match(ui, /Permanent Account Removal/);
  assert.match(ui, /Permanent Remove/);
});

test('Permanent removal protects self, other Owners, missing targets, and identity-dependent history', () => {
  const source = read('server.ts');
  assert.match(source, /status\(401\)/);
  assert.match(source, /status\(403\)/);
  assert.match(source, /targetUserId === ownerUser\.id/);
  assert.match(source, /Another Owner account cannot be permanently removed/);
  assert.match(source, /auth\.admin\.getUserById\(targetUserId\)/);
  assert.match(source, /status\(404\)/);
  assert.match(source, /status\(409\)/);
  for (const table of ['admin_conversations', 'admin_messages', 'call_sessions', 'direct_messages', 'support_messages', 'recurring_services']) assert.match(source, new RegExp(table));
});

test('Permanent removal preserves nullable business history and does not delete business records', () => {
  const source = read('server.ts');
  for (const table of ['commissions', 'invoices', 'maintenance_subscriptions', 'referral_bonuses', 'reviews']) assert.match(source, new RegExp(`"${table}"`));
  assert.match(source, /Historical business records were preserved/);
  assert.doesNotMatch(source, /\.from\("projects"\)[\s\S]*?\.delete\(/);
  assert.doesNotMatch(source, /\.from\("leads"\)[\s\S]*?\.delete\(/);
  assert.doesNotMatch(source, /\.from\("invoices"\)[\s\S]*?\.delete\(/);
});

test('Connector permanent removal records connector identity and audit metadata without secrets', () => {
  const source = read('server.ts');
  const auditStart = source.indexOf('action: "owner_user_permanently_deleted"');
  const auditEnd = source.indexOf('if (auditError)', auditStart);
  assert.ok(auditStart >= 0 && auditEnd > auditStart);
  const audit = source.slice(auditStart, auditEnd);
  assert.match(audit, /deleted_user_id: targetUserId/);
  assert.match(audit, /email: targetUser\.user\.email/);
  assert.match(audit, /roles: targetRoles/);
  assert.match(audit, /connector_identity: connectorIdentity/);
  assert.doesNotMatch(audit, /password|access_token|refresh_token|service_role|recovery_link|invitation_link/i);
  assert.match(source, /targetRoles\.includes\("connector"\)/);
  assert.match(read('src/pages/portal/OwnerUserManagement.tsx'), /Connector onboarding again/);
});

test('Permanent removal failure attempts reference restoration and does not report success', () => {
  const source = read('server.ts');
  assert.match(source, /authDeleteAttempted/);
  assert.match(source, /restoreDetachedReferences/);
  assert.match(source, /restoreError/);
  assert.match(source, /Permanent account removal could not be completed/);
});

test('Owner member status remains reversible and separate from permanent removal', () => {
  const source = read('supabase/functions/avelixa-owner-member-status-prod/index.ts');
  assert.match(source, /Another Owner account cannot be deactivated/);
  assert.match(source, /auth\.admin\.updateUserById\(userId/);
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(ui, /setMemberActive\(user, false\)/);
  assert.match(ui, /setMemberActive\(user, true\)/);
});

test('Role X remains Remove Role and is independent from permanent account deletion', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /changeRole\(user, role as AllowedRole, true\)/);
  assert.match(source, /aria-label={`Remove \${label\(role\)} role`}/);
  assert.match(source, /handleDeleteUser/);
  assert.match(source, /method: 'DELETE'/);
  assert.match(source, /\/api\/owner\/users\/\$\{user\.id\}/);
  assert.match(source, /if \(!confirmed\) return/);
  for (const phrase of ['Permanent Account Removal', 'NOT Deactivate', 'not Remove Role', 'Reactivate cannot restore', 'cannot be undone through Owner User Management', 'Historical/business records are not intentionally erased']) assert.ok(source.includes(phrase));
});

test('Owner lifecycle migration remains reversible and is not a permanent deletion mechanism', () => {
  const sql = read('supabase/migrations/20260903090000_owner_member_lifecycle.sql');
  assert.match(sql, /add column if not exists is_active boolean/i);
  assert.match(sql, /set default true/i);
  assert.match(sql, /set not null/i);
  assert.match(sql, /p\.is_active = true/i);
  assert.doesNotMatch(sql, /delete from public\.profiles/i);
  assert.doesNotMatch(sql, /drop table/i);
});
