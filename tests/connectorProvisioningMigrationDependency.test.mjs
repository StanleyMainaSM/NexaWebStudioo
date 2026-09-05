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

const queueBaseline = '20260829209997_restore_connector_provisioning_queue_baseline.sql';
const recruitmentHelper = '20260829209998_restore_connector_recruitment_summary_helper.sql';
const provisioningHelper = '20260829209999_restore_connector_provisioning_helpers.sql';
const provisioningDependent = '20260829210000_fix_connector_provisioning_and_application_duplicates.sql';
const recruitmentDependent = '20260829210001_tighten_connector_recruitment_summary_security.sql';

const readMigration = (file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8');

assert.ok(fs.existsSync(path.join(migrationsDir, queueBaseline)), 'connector provisioning queue baseline must exist');
assert.ok(fs.existsSync(path.join(migrationsDir, recruitmentHelper)), 'connector recruitment summary helper baseline must exist');
assert.ok(fs.existsSync(path.join(migrationsDir, provisioningHelper)), 'connector provisioning helper baseline must exist');
assert.ok(fs.existsSync(path.join(migrationsDir, provisioningDependent)), 'connector provisioning hardening migration must exist');
assert.ok(fs.existsSync(path.join(migrationsDir, recruitmentDependent)), 'connector recruitment security migration must exist');

const queueCreatorPattern = /\bcreate\s+table(?:\s+if\s+not\s+exists)?\s+public\.connector_provisioning_queue\b/i;
const queueReferencePattern = /\bconnector_provisioning_queue\b/i;

const queueCreatorMigrations = migrationFiles.filter((file) => queueCreatorPattern.test(readMigration(file)));
const queueReferenceMigrations = migrationFiles.filter((file) => queueReferencePattern.test(readMigration(file)));

test('connector_provisioning_queue is created before any migration references it', () => {
  assert.equal(queueCreatorMigrations.length, 1, 'migration chain must contain exactly one connector_provisioning_queue creator baseline');

  const creator = queueCreatorMigrations[0];
  const creatorIndex = migrationFiles.indexOf(creator);

  for (const migration of queueReferenceMigrations) {
    if (migration === creator) continue;

    assert.ok(
      creatorIndex < migrationFiles.indexOf(migration),
      `${creator} must precede ${migration} because ${migration} references public.connector_provisioning_queue`,
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
