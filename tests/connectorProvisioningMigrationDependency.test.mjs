import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const helperPath = path.join(root, 'supabase', 'migrations', '20260829209999_restore_connector_provisioning_helpers.sql');
const dependentPath = path.join(root, 'supabase', 'migrations', '20260829210000_fix_connector_provisioning_and_application_duplicates.sql');

assert.ok(fs.existsSync(helperPath), 'connector provisioning helper baseline must exist');
assert.ok(fs.existsSync(dependentPath), 'connector provisioning hardening migration must exist');

const helper = fs.readFileSync(helperPath, 'utf8');
const dependent = fs.readFileSync(dependentPath, 'utf8');

assert.match(helper, /CREATE OR REPLACE FUNCTION private\.queue_connector_provisioning\(\)/i);
assert.match(helper, /INSERT INTO public\.connector_provisioning_queue\s*\(application_id\)/i);
assert.match(helper, /CREATE OR REPLACE FUNCTION private\.mark_connector_provisioning_completed\(\s*p_application_id uuid,\s*p_user_id uuid/i);
assert.match(helper, /UPDATE public\.connector_applications/i);
assert.match(dependent, /revoke execute on function private\.queue_connector_provisioning\(\)/i);
assert.match(dependent, /revoke execute on function private\.mark_connector_provisioning_completed\(uuid, uuid\)/i);
assert.ok(
  '20260829209999_restore_connector_provisioning_helpers.sql' < '20260829210000_fix_connector_provisioning_and_application_duplicates.sql',
  'connector provisioning helper baseline must precede its dependent migration',
);

console.log('Connector provisioning migration dependency guard: PASS');
