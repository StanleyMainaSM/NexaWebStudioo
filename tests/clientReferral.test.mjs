import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildClientReferralLink,
  getClientReferralIdFromSearch,
  normalizeClientReferralId,
} from '../src/lib/clientReferral.ts';

assert.equal(normalizeClientReferralId(' avl-0002 '), 'AVL-0002');
assert.equal(getClientReferralIdFromSearch('?ref=avl-0002'), 'AVL-0002');
assert.equal(getClientReferralIdFromSearch('?ref='), '');
assert.equal(
  buildClientReferralLink('avl-0002', 'https://www.avelixa.co.ke'),
  'https://www.avelixa.co.ke/client-register?ref=AVL-0002',
);
assert.equal(buildClientReferralLink('', 'https://www.avelixa.co.ke'), '');

const here = path.dirname(new URL(import.meta.url).pathname);
const migrationRoot = path.resolve(here, '..', 'supabase', 'migrations');
const onboardingMigration = fs.readFileSync(
  path.join(migrationRoot, '20260830220000_client_referral_self_onboarding.sql'),
  'utf8',
);
const hardeningMigration = fs.readFileSync(
  path.join(migrationRoot, '20260830210000_harden_client_referral_onboarding_connector_state.sql'),
  'utf8',
);
const operationalMigration = fs.readFileSync(
  path.join(migrationRoot, '20260830210000_connector_operational_notifications.sql'),
  'utf8',
);

// The later same-prefix self-onboarding migration must not overwrite the hardened RPC.
assert.match(onboardingMigration, /cp\.user_id = v_connector_id/);
assert.match(onboardingMigration, /cp\.is_active = true/);
assert.match(onboardingMigration, /The Connector who referred this account is no longer active/);
assert.match(hardeningMigration, /cp\.user_id = v_connector_id/);
assert.match(hardeningMigration, /cp\.is_active = true/);

// Connector operational notifications must preserve the live Client-facing lead path.
assert.match(operationalMigration, /v_client_title := 'Request submitted'/);
assert.match(operationalMigration, /v_client_title := 'Request requires your attention'/);
assert.match(operationalMigration, /v_client_title := 'Request status updated'/);
assert.match(operationalMigration, /new\.client_id is not null/);
assert.match(operationalMigration, /format\('%s:client:%s:%s'/);

console.log('client referral tests: PASS');
