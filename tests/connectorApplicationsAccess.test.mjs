import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Connector Applications does not expose the backend-only provisioning queue', () => {
  const source = read('src/pages/portal/ConnectorApplications.tsx');
  assert.match(source, /from\('connector_applications'\)/);
  assert.doesNotMatch(source, /from\('connector_provisioning_queue'\)/);
  assert.doesNotMatch(source, /activation_url/i);
  assert.match(source, /provisioning_error/);
  assert.match(source, /Only authenticated Owner\/Admin users can access this workspace/);
});

test('Permanent removal lifecycle allows a fresh application after the old completed identity is gone', () => {
  const migration = read('supabase/migrations/20260905144015_connector_reapplication_after_permanent_removal.sql');
  assert.match(migration, /ca\.status = 'pending'/);
  assert.match(migration, /ca\.status = 'approved'/);
  assert.match(migration, /ca\.provisioning_status in \('pending', 'processing', 'failed'\)/);
  assert.doesNotMatch(migration, /ca\.status in \('pending', 'approved'\)/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /insert into public\.connector_applications/);
});

console.log('Connector applications access/re-application regression tests passed.');
