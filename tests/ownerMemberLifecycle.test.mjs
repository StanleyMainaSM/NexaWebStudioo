import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('owner member migration adds reversible activation state', () => {
  const sql = read('supabase/migrations/20260903090000_owner_member_lifecycle.sql');
  assert.match(sql, /add column if not exists is_active boolean/i);
  assert.match(sql, /alter column is_active set not null/i);
  assert.match(sql, /join public\.profiles p on p\.id = ur\.user_id/i);
  assert.match(sql, /p\.is_active = true/i);
  assert.match(sql, /protect_owner_role/i) === false;
});

test('owner member status endpoint requires Owner authorization and protects Owner accounts', () => {
  const source = read('supabase/functions/avelixa-owner-member-status-prod/index.ts');
  assert.match(source, /eq\("role", "owner"\)/);
  assert.match(source, /Owner permission is required to manage members/);
  assert.match(source, /Another Owner account cannot be deactivated/);
  assert.match(source, /updateUserById\(userId, \{\s*ban_duration/);
  assert.match(source, /profiles.*update\(\{ is_active: active \}/s);
});

test('connector activation links are redacted from notification records after email handoff', () => {
  const sql = read('supabase/migrations/20260903091000_redact_connector_activation_links.sql');
  assert.match(sql, /notification_type = 'connector_activation'/i);
  assert.match(sql, /set link = null/i);
  assert.match(sql, /html_body = null/i);
  assert.match(sql, /after update of status/i);
});

test('owner UI does not expose Owner as a normal assignable role and supports reversible status', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /'client', 'operator', 'connector', 'admin'/);
  assert.doesNotMatch(source, /const roles[^\n]*owner/);
  assert.match(source, /Deactivate/);
  assert.match(source, /Reactivate/);
});
