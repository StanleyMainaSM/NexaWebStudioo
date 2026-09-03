import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const migrationNames = fs.readdirSync(path.join(root, 'supabase/migrations')).sort();

const connectorMigrations = migrationNames.filter((name) =>
  /connector|provisioning|activation/i.test(name),
);

test('Connector onboarding migrations are ordered and historical reconciliation runs after its schema', () => {
  assert.ok(connectorMigrations.includes('20260903093000_connector_historical_reconciliation_status.sql'));
  assert.ok(connectorMigrations.includes('20260903093200_connector_historical_reconciliation_safe_link.sql'));
  assert.ok(
    migrationNames.indexOf('20260903093000_connector_historical_reconciliation_status.sql') <
      migrationNames.indexOf('20260903093200_connector_historical_reconciliation_safe_link.sql'),
  );
});

test('historical reconciliation never creates Auth users or assigns Connector roles', () => {
  const source = read('supabase/migrations/20260903093200_connector_historical_reconciliation_safe_link.sql');
  assert.doesNotMatch(source, /insert\s+into\s+auth\.users/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.user_roles/i);
  assert.doesNotMatch(source, /delete\s+from\s+auth\.users/i);
  assert.match(source, /duplicate_historical_application/i);
  assert.match(source, /already_correctly_provisioned/i);
  assert.match(source, /requires_manual_review/i);
});

test('automatic provisioning refuses to convert an existing incompatible account', () => {
  const source = read('supabase/migrations/20260903093500_connector_provisioning_existing_account_guard.sql');
  assert.match(source, /auth\.users/i);
  assert.match(source, /role in \('owner', 'admin', 'operator', 'client'\)/i);
  assert.match(source, /automatic Connector assignment is prohibited/i);
  assert.match(source, /provisioning_manual_review_required/i);
  assert.match(source, /return null/i);
});

test('activation resend is secure and reuses the existing notification email architecture', () => {
  const source = read('supabase/functions/avelixa-connector-activation-resend-prod/index.ts');
  assert.match(source, /\.in\("role", \["admin", "owner"\]\)/);
  assert.match(source, /generateLink\(\{\s*type: "recovery"/s);
  assert.match(source, /notification_type: "connector_activation"/);
  assert.doesNotMatch(source, /activation_url/);
  assert.doesNotMatch(source, /temporaryPassword|password:/i);
});

test('activation UI retains the authenticated session and sends the Connector to Terms', () => {
  const source = read('src/pages/portal/SetPassword.tsx');
  assert.match(source, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(source, /navigate\('\/portal\/connector\/terms'/);
  assert.doesNotMatch(source, /signOut\(/);
});

test('Connector portal routes require the Connector role and completed Terms', () => {
  const source = read('src/App.tsx');
  const protectedConnectorRoute = /path=["']connector["'][\s\S]*?requiredRoles=\{\s*\[["']connector["']\]\s*\}[\s\S]*?requiresConnectorTerms\s*\}>[\s\S]*?ConnectorDashboard/;
  const protectedConnectorLeadsRoute = /path=["']connector\/leads["'][\s\S]*?requiredRoles=\{\s*\[["']connector["']\]\s*\}[\s\S]*?requiresConnectorTerms/;
  const protectedConnectorEarningsRoute = /path=["']connector\/earnings["'][\s\S]*?requiredRoles=\{\s*\[["']connector["']\]\s*\}[\s\S]*?requiresConnectorTerms/;

  assert.match(source, protectedConnectorRoute, 'Connector portal must require the Connector role and Terms completion');
  assert.match(source, protectedConnectorLeadsRoute, 'Connector leads must require the Connector role and Terms completion');
  assert.match(source, protectedConnectorEarningsRoute, 'Connector earnings must require the Connector role and Terms completion');
});

test('Connector application confirmation describes the complete review and activation sequence', () => {
  const source = read('src/pages/ConnectorApplication.tsx');
  for (const phrase of [
    'Application Submitted Successfully',
    'review your details',
    'No password is created or sent',
    'secure activation link',
    'create your own password',
    'Terms and Conditions',
    'Connector Portal',
    'Spam, Junk, Promotions, or Updates',
  ]) {
    assert.match(source, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
});
