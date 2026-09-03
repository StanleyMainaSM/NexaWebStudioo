import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('owner role mutation uses a real database conflict target', () => {
  const sql = read('supabase/migrations/20260903092000_harden_connector_onboarding_and_owner_roles.sql');
  const server = read('server.ts');
  assert.match(sql, /create unique index if not exists user_roles_user_id_role_unique/i);
  assert.match(sql, /on public\.user_roles \(user_id, role\)/i);
  assert.match(server, /onConflict:\s*"user_id,role"/);
  assert.doesNotMatch(server, /app\.delete\(\s*\"\/api\/owner\/users\/:id\"/s);
});

test('connector activation resend is Admin/Owner-only and does not persist its bearer URL', () => {
  const source = read('supabase/functions/avelixa-connector-activation-resend-prod/index.ts');
  const provisioner = read('supabase/functions/avelixa-connector-provisioner-prod/index.ts');
  assert.match(source, /\.in\("role", \["admin", "owner"\]\)/);
  assert.match(source, /\.from\("connector_profiles"\).*is_active/s);
  assert.match(source, /generateLink\(\{\s*type: "recovery"/s);
  assert.match(source, /\.from\("notifications"\)\.insert/);
  assert.doesNotMatch(source, /activation_url/);
  assert.match(provisioner, /activation_url:\s*null/);
});

test('historical Connector reconciliation is conservative and never auto-assigns ambiguous accounts', () => {
  const sql = read('supabase/migrations/20260903093000_connector_historical_reconciliation_status.sql');
  assert.match(sql, /add column if not exists reconciliation_status/i);
  assert.match(sql, /duplicate_historical_application/);
  assert.match(sql, /already_correctly_provisioned/);
  assert.match(sql, /requires_manual_review/);
  assert.match(sql, /No Auth account matched/i);
  assert.match(sql, /automatic Connector assignment is prohibited/i);
  assert.doesNotMatch(sql, /insert into public\.user_roles/i);
  assert.doesNotMatch(sql, /delete from auth\.users/i);
});

test('Connector applications UI provides resend without displaying activation credentials', () => {
  const source = read('src/pages/portal/ConnectorApplications.tsx');
  assert.match(source, /avelixa-connector-activation-resend-prod/);
  assert.match(source, /Resend activation/);
  assert.match(source, /activation link is not displayed/i);
  assert.doesNotMatch(source, /activationUrl\s*=|action_link/);
});
