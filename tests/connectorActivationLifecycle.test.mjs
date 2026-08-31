import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const provisioner = readFileSync(
  new URL('../supabase/functions/avelixa-connector-provisioner-prod/index.ts', import.meta.url),
  'utf8',
);

const setPassword = readFileSync(
  new URL('../src/pages/portal/SetPassword.tsx', import.meta.url),
  'utf8',
);

assert.match(
  provisioner,
  /Deno\.env\.get\("AVELIXA_ACTIVATION_REDIRECT"\)/,
  'Connector activation redirect must be environment-configurable',
);
assert.match(
  provisioner,
  /const ACTIVATION_REDIRECT=configuredRedirect\|\|"https:\\/\\/avelixa\.co\.ke"/,
  'Connector activation must have a production-safe fallback URL',
);
assert.doesNotMatch(
  provisioner,
  /http:\/\/localhost(?::\d+)?/,
  'Connector provisioning must never generate localhost activation URLs',
);
assert.match(
  provisioner,
  /email_confirm:true/,
  'Connector provisioning must confirm the approved applicant email for normal password login',
);
assert.match(
  provisioner,
  /auth\.admin\.updateUserById\(userId,\{email_confirm:true\}\)/,
  'Existing connector accounts must also be confirmed during activation',
);
assert.match(
  provisioner,
  /type:"recovery"/,
  'Connector onboarding must use the existing recovery/password-setup flow',
);
assert.match(
  setPassword,
  /supabase\.auth\.getSession\(\)/,
  'Password setup must verify the activation session',
);
assert.match(
  setPassword,
  /supabase\.auth\.updateUser\(\{\s*password\s*\}\)/,
  'Password setup must update the authenticated user password',
);
assert.match(
  setPassword,
  /supabase\.rpc\('get_my_roles'\)/,
  'Password setup must synchronize roles before entering the protected portal',
);
assert.match(
  setPassword,
  /roles\.includes\('connector'\)/,
  'Password setup must verify the connector role before navigation',
);
assert.match(
  setPassword,
  /connector_profiles/,
  'Password setup must verify the connector profile before navigation',
);
assert.match(
  setPassword,
  /navigate\('\/portal\/connector',\s*\{\s*replace:\s*true\s*\}\)/,
  'Successful activation must enter the existing connector portal',
);

console.log('Connector activation lifecycle regression checks passed.');
