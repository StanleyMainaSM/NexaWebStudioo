import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20260903150000_website_creation_generation_preview_security_contract.sql',
  'utf8',
);
const normalizedMigration = migration.replace(/\r\n/g, '\n');

// Protected path: the existing trigger remains installed and rejects protected
// changes unless the exact trusted transaction marker is present.
assert.match(normalizedMigration, /CREATE OR REPLACE FUNCTION public\.protect_creation_project_preview_controls/);
assert.match(normalizedMigration, /CREATE TRIGGER protect_creation_project_preview_controls/);
assert.match(normalizedMigration, /Creation preview controls are protected/);
assert.match(normalizedMigration, /current_setting\('avelixa\.generation_preview_update', true\) = 'v1'/);
assert.match(normalizedMigration, /RAISE EXCEPTION 'Creation preview controls are protected'/);

// Trusted path: only the generation RPC establishes the transaction-local marker,
// after authorization and quota checks, immediately before the protected update.
assert.match(normalizedMigration, /IF NOT v_project_allowed THEN RAISE EXCEPTION 'Creation generation access denied'/);
assert.match(normalizedMigration, /IF v_used >= v_limit THEN/);
assert.match(normalizedMigration, /PERFORM set_config\('avelixa\.generation_preview_update', 'v1', true\);/);
const markerIndex = normalizedMigration.indexOf("PERFORM set_config('avelixa.generation_preview_update', 'v1', true);");
const projectUpdateIndex = normalizedMigration.indexOf('UPDATE public.creation_projects', markerIndex);
assert.ok(markerIndex > 0);
assert.ok(projectUpdateIndex > markerIndex);

// Atomic generation contract: usage, artifact, and project lifecycle changes are
// all inside the same SECURITY DEFINER RPC transaction; no direct artifact writes
// or generic bypass are introduced by this reconciliation migration.
assert.match(normalizedMigration, /LANGUAGE plpgsql\nSECURITY DEFINER/);
assert.match(normalizedMigration, /UPDATE public\.creation_generation_usage/);
assert.match(normalizedMigration, /INSERT INTO public\.creation_generated_website_outputs/);
assert.match(normalizedMigration, /ON CONFLICT \(id\) DO UPDATE/);
assert.doesNotMatch(normalizedMigration, /session_replication_role/);
assert.doesNotMatch(normalizedMigration, /ALTER TABLE public\.creation_projects DISABLE ROW LEVEL SECURITY/);
assert.doesNotMatch(normalizedMigration, /GRANT UPDATE ON TABLE public\.creation_projects/);
assert.doesNotMatch(normalizedMigration, /bypass_security/);

// Failure/rollback contract: no exception handler converts a failed generation
// into a partial success; PostgreSQL transaction rollback therefore covers quota,
// artifact, and project updates together.
assert.doesNotMatch(normalizedMigration, /EXCEPTION\s+WHEN OTHERS\s+THEN\s+RETURN/);
assert.match(normalizedMigration, /last_generation_error/);

console.log('websiteCreationGenerationSecurityContract.test.mjs: PASS');
