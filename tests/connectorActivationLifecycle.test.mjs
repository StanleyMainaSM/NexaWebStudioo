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
  /Deno\.env\.get\(\s*["']AVELIXA_ACTIVATION_REDIRECT["']\s*\)/,
  'Connector activation redirect must be environment-configurable',
);
assert.match(
  provisioner,
  /configuredRedirect\s*=\s*Deno\.env\.get\(\s*["']AVELIXA_ACTIVATION_REDIRECT["']\s*\)\?\.trim\(\)\s*;[\s\S]*?const\s+ACTIVATION_REDIRECT\s*=\s*configuredRedirect\s*\|\|\s*["']https:\/\/avelixa\.co\.ke["']/,
  'Connector activation must use a configured redirect with a production-safe fallback URL',
);
assert.doesNotMatch(
  provisioner,
  /http:\/\/localhost(?::\d+)?/,
  'Connector provisioning must never generate localhost activation URLs',
);
assert.match(
  provisioner,
  /email_confirm\s*:\s*true/,
  'Connector provisioning must confirm the approved applicant email for normal password login',
);
assert.match(
  provisioner,
  /auth\.admin\.updateUserById\(\s*userId\s*,\s*\{\s*email_confirm\s*:\s*true\s*,?\s*\}\s*\)/,
  'Existing connector accounts must also be confirmed during activation',
);
assert.match(
  provisioner,
  /type\s*:\s*["']recovery["']/,
  'Connector onboarding must use the existing recovery/password-setup flow',
);
assert.match(
  setPassword,
  /supabase\.auth\.getSession\(\)/,
  'Password setup must verify the activation session',
);
assert.match(
  setPassword,
  /supabase\.auth\.updateUser\(\{\s*password\s*,?\s*\}\)/,
  'Password setup must update the authenticated user password',
);
assert.match(
  setPassword,
  /supabase\.rpc\(\s*['"]get_my_roles['"]\s*\)/,
  'Password setup must synchronize roles before entering the protected portal',
);
assert.match(
  setPassword,
  /roles\.includes\(\s*['"]connector['"]\s*\)/,
  'Password setup must verify the connector role before navigation',
);
assert.match(
  setPassword,
  /connector_profiles/,
  'Password setup must verify the connector profile before navigation',
);
assert.match(
  setPassword,
  /navigate\(\s*['"]\/portal\/connector\/terms['"]\s*,\s*\{\s*replace\s*:\s*true\s*\}\s*\)/,
  'Successful activation must enter the existing Connector Terms gate before portal access',
);

console.log('Connector activation lifecycle regression checks passed.');
