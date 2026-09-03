import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const recruitmentHelperPath = path.join(root, 'supabase', 'migrations', '20260829209998_restore_connector_recruitment_summary_helper.sql');
const provisioningHelperPath = path.join(root, 'supabase', 'migrations', '20260829209999_restore_connector_provisioning_helpers.sql');
const provisioningDependentPath = path.join(root, 'supabase', 'migrations', '20260829210000_fix_connector_provisioning_and_application_duplicates.sql');
const recruitmentDependentPath = path.join(root, 'supabase', 'migrations', '20260829210001_tighten_connector_recruitment_summary_security.sql');

assert.ok(fs.existsSync(recruitmentHelperPath), 'connector recruitment summary helper baseline must exist');
assert.ok(fs.existsSync(provisioningHelperPath), 'connector provisioning helper baseline must exist');
assert.ok(fs.existsSync(provisioningDependentPath), 'connector provisioning hardening migration must exist');
assert.ok(fs.existsSync(recruitmentDependentPath), 'connector recruitment security migration must exist');

const recruitmentHelper = fs.readFileSync(recruitmentHelperPath, 'utf8');
const provisioningHelper = fs.readFileSync(provisioningHelperPath, 'utf8');
const provisioningDependent = fs.readFileSync(provisioningDependentPath, 'utf8');
const recruitmentDependent = fs.readFileSync(recruitmentDependentPath, 'utf8');

assert.match(recruitmentHelper, /CREATE OR REPLACE FUNCTION private\.get_connector_recruitment_summary\(\)/i);
assert.match(recruitmentHelper, /FROM public\.connector_applications/i);
assert.match(recruitmentHelper, /FROM public\.referral_bonuses/i);
assert.match(provisioningHelper, /CREATE OR REPLACE FUNCTION private\.queue_connector_provisioning\(\)/i);
assert.match(provisioningHelper, /INSERT INTO public\.connector_provisioning_queue\s*\(application_id\)/i);
assert.match(provisioningHelper, /CREATE OR REPLACE FUNCTION private\.mark_connector_provisioning_completed\(\s*p_application_id uuid,\s*p_user_id uuid/i);
assert.match(provisioningHelper, /UPDATE public\.connector_applications/i);
assert.match(provisioningDependent, /revoke execute on function private\.queue_connector_provisioning\(\)/i);
assert.match(provisioningDependent, /revoke execute on function private\.mark_connector_provisioning_completed\(uuid, uuid\)/i);
assert.match(recruitmentDependent, /revoke execute on function private\.get_connector_recruitment_summary\(\)/i);
assert.ok(
  '20260829209998_restore_connector_recruitment_summary_helper.sql' < '20260829209999_restore_connector_provisioning_helpers.sql'
    && '20260829209999_restore_connector_provisioning_helpers.sql' < '20260829210000_fix_connector_provisioning_and_application_duplicates.sql'
    && '20260829210000_fix_connector_provisioning_and_application_duplicates.sql' < '20260829210001_tighten_connector_recruitment_summary_security.sql',
  'connector helper baselines must precede their dependent migrations',
);

console.log('Connector provisioning migration dependency guard: PASS');
