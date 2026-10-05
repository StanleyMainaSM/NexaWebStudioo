import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Self-service connector registration migration exists and defines duplicate check, referral validator, and handle_new_user trigger', () => {
  const sql = read('supabase/migrations/20260906090000_self_service_connector_registration.sql');

  // 1. Email check function
  assert.match(sql, /create or replace function public\.check_email_registered/i);
  assert.match(sql, /from auth\.users where lower\(email\) = v_email/i);
  assert.match(sql, /from public\.profiles where lower\(email\) = v_email/i);

  // 2. Referral validator function
  assert.match(sql, /create or replace function public\.validate_connector_referral/i);
  assert.match(sql, /from public\.connector_profiles cp/i);
  assert.match(sql, /and ur\.role = 'connector'/i);

  // 3. handle_new_user trigger logic
  assert.match(sql, /v_registration_type text := NULLIF\(BTRIM\(new\.raw_user_meta_data ->> 'registration_type'\), ''\);/);
  assert.match(sql, /insert into public\.user_roles \(user_id, role\)\s+values \(new\.id, 'connector'\)/i);
  assert.match(sql, /insert into public\.connector_profiles/i);
  assert.match(sql, /terms_accepted_at,\s*terms_version/i);
  assert.match(sql, /status,\s*provisioning_status,\s*provisioned_user_id/i);
  assert.match(sql, /'approved',\s*'completed',\s*new\.id/i);
});

test('Connector registration form contains all required fields, enforces password creation, and provides duplicate email guidance', () => {
  const source = read('src/pages/ConnectorApplication.tsx');

  // Required form fields
  assert.match(source, /name="fullName"/);
  assert.match(source, /name="email"/);
  assert.match(source, /name="phone"/);
  assert.match(source, /name="nationalId"/);
  assert.match(source, /name="county"/);
  assert.match(source, /name="city"/);
  assert.match(source, /name="password"/);
  assert.match(source, /name="confirmPassword"/);
  assert.match(source, /name="referralId"/);
  assert.match(source, /Become a Connector/);

  // Email duplicate check
  assert.match(source, /check_email_registered/);
  assert.match(source, /emailExists/);
  assert.match(source, /to="\/login"/);
  assert.match(source, /to="\/reset-password"/);

  // Supabase Auth direct sign up
  assert.match(source, /supabase\.auth\.signUp\(/);
  assert.match(source, /registration_type:\s*'connector'/);

  // Referral handling
  assert.match(source, /searchParams\.get\('ref'\)/);
  assert.match(source, /validate_connector_referral/);

  // Terms and conditions redirection
  assert.match(source, /\/portal\/connector\/terms/);
});
