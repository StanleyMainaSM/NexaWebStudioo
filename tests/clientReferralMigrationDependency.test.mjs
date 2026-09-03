import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'supabase', 'migrations', '20260829213604_restore_client_referrer_attribution.sql');
const dependentPath = path.join(root, 'supabase', 'migrations', '20260829213605_client_portal_post_onboarding_workflow.sql');

assert.ok(fs.existsSync(baselinePath), 'client referral attribution baseline must exist');
assert.ok(fs.existsSync(dependentPath), 'client post-onboarding workflow migration must exist');

const baseline = fs.readFileSync(baselinePath, 'utf8');
const dependent = fs.readFileSync(dependentPath, 'utf8');

assert.match(baseline, /ALTER TABLE public\.profiles/i);
assert.match(baseline, /ADD COLUMN IF NOT EXISTS client_referrer_connector_id uuid/i);
assert.match(dependent, /BEFORE UPDATE OF client_referrer_connector_id ON public\.profiles/i);
assert.match(dependent, /CREATE TRIGGER protect_client_referrer_attribution/i);
assert.ok(
  '20260829213604_restore_client_referrer_attribution.sql' < '20260829213605_client_portal_post_onboarding_workflow.sql',
  'client referral attribution baseline must precede its dependent workflow migration',
);

console.log('Client referral migration dependency guard: PASS');
