import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

const queueBaseline = '20260829180000_restore_connector_provisioning_queue_baseline.sql';
const recruitmentHelper = '20260829209998_restore_connector_recruitment_summary_helper.sql';
const provisioningHelper = '20260829209999_restore_connector_provisioning_helpers.sql';
const provisioningDependent = '20260829210000_fix_connector_provisioning_and_application_duplicates.sql';
const recruitmentDependent = '20260829210001_tighten_connector_recruitment_summary_security.sql';
const activationEmailQueueLink = '20260903092000_connector_activation_email_queue_link.sql';
const onboardingHardening = '20260903092500_harden_connector_onboarding_and_owner_roles.sql';
const historicalReconciliation = '20260903093000_connector_historical_reconciliation_status.sql';

const readMigration = (file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8');

assert.ok(fs.existsSync(path.join(migrationsDir, queueBaseline)), 'connector provisioning queue baseline must exist');
assert.ok(fs.existsSync(path.join(migrationsDir, recruitmentHelper)), 'connector recruitment summary helper baseline must exist');
assert.ok(fs.existsSync(path.join(migrationsDir, provisioningHelper)), 'connector provisioning helper baseline must exist');
assert.ok(fs.existsSync(path.join(migrationsDir, provisioningDependent)), 'connector provisioning hardening migration must exist');
assert.ok(fs.existsSync(path.join(migrationsDir, recruitmentDependent)), 'connector recruitment security migration must exist');

const queueCreatorPattern = /\bcreate\s+table(?:\s+if\s+not\s+exists)?\s+public\.connector_provisioning_queue\b/i;
const stripSqlCommentsAndQuotedLiterals = (sql) => sql
  .replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '')
  .replace(/'(?:''|[^'])*'/g, "''");
const queueReferencePattern = /\b(?:on|into|from|update|table)\s+public\.connector_provisioning_queue\b/i;

const queueCreatorMigrations = migrationFiles.filter((file) => queueCreatorPattern.test(readMigration(file)));
const queueReferenceMigrations = migrationFiles.filter((file) =>
  queueReferencePattern.test(stripSqlCommentsAndQuotedLiterals(readMigration(file))),
);

const migrationVersion = (file) => file.match(/^(\d{14})_/i)?.[1] ?? null;
const migrationVersionCounts = new Map();
for (const file of migrationFiles) {
  const version = migrationVersion(file);
  if (version) migrationVersionCounts.set(version, (migrationVersionCounts.get(version) ?? 0) + 1);
}

test('supabase migration versions are globally unique', () => {
  const duplicates = [...migrationVersionCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([version, count]) => `${version} (${count} files)`);

  assert.deepEqual(duplicates, [], `duplicate Supabase migration versions found: ${duplicates.join(', ')}`);
});

test('connector activation hardening migrations preserve their intended order', () => {
  assert.ok(fs.existsSync(path.join(migrationsDir, activationEmailQueueLink)), 'activation email queue migration must exist');
  assert.ok(fs.existsSync(path.join(migrationsDir, onboardingHardening)), 'onboarding hardening migration must exist');
  assert.ok(fs.existsSync(path.join(migrationsDir, historicalReconciliation)), 'historical reconciliation migration must exist');

  assert.ok(
    migrationFiles.indexOf(activationEmailQueueLink) < migrationFiles.indexOf(onboardingHardening)
      && migrationFiles.indexOf(onboardingHardening) < migrationFiles.indexOf(historicalReconciliation),
    'activation email queue linkage must precede onboarding hardening, which must precede historical reconciliation',
  );
});

test('connector_provisioning_queue is created before any executable migration references it', () => {
  assert.equal(queueCreatorMigrations.length, 1, 'migration chain must contain exactly one connector_provisioning_queue creator baseline');

  const creator = queueCreatorMigrations[0];
  const creatorIndex = migrationFiles.indexOf(creator);

  assert.ok(queueReferenceMigrations.length > 0, 'migration chain must contain executable connector_provisioning_queue references');

  for (const migration of queueReferenceMigrations) {
    if (migration === creator) continue;

    assert.ok(
      creatorIndex < migrationFiles.indexOf(migration),
      `${creator} must precede ${migration} because ${migration} contains an executable reference to public.connector_provisioning_queue`,
    );
  }
});

test('connector provisioning helper baselines precede their dependent migrations', () => {
  assert.match(readMigration(recruitmentHelper), /CREATE OR REPLACE FUNCTION private\.get_connector_recruitment_summary\(\)/i);
  assert.match(readMigration(recruitmentHelper), /FROM public\.connector_applications/i);
  assert.match(readMigration(recruitmentHelper), /FROM public\.referral_bonuses/i);
  assert.match(readMigration(provisioningHelper), /CREATE OR REPLACE FUNCTION private\.queue_connector_provisioning\(\)/i);
  assert.match(readMigration(provisioningHelper), /INSERT INTO public\.connector_provisioning_queue\s*\(application_id\)/i);
  assert.match(readMigration(provisioningHelper), /CREATE OR REPLACE FUNCTION private\.mark_connector_provisioning_completed\(\s*p_application_id uuid,\s*p_user_id uuid/i);
  assert.match(readMigration(provisioningHelper), /UPDATE public\.connector_applications/i);
  assert.match(readMigration(provisioningDependent), /revoke execute on function private\.queue_connector_provisioning\(\)/i);
  assert.match(readMigration(provisioningDependent), /revoke execute on function private\.mark_connector_provisioning_completed\(uuid, uuid\)/i);
  assert.match(readMigration(recruitmentDependent), /revoke execute on function private\.get_connector_recruitment_summary\(\)/i);

  assert.ok(
    migrationFiles.indexOf(queueBaseline) < migrationFiles.indexOf(provisioningHelper)
      && migrationFiles.indexOf(recruitmentHelper) < migrationFiles.indexOf(provisioningHelper)
      && migrationFiles.indexOf(provisioningHelper) < migrationFiles.indexOf(provisioningDependent)
      && migrationFiles.indexOf(provisioningDependent) < migrationFiles.indexOf(recruitmentDependent),
    'connector queue/helper baselines must precede their dependent migrations',
  );
});

console.log('Connector provisioning migration dependency guard: PASS');
