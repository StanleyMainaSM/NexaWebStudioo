import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const stage2Migration = readFileSync('supabase/migrations/20260905150100_portal_access_control.sql', 'utf8');
const migration = readFileSync('supabase/migrations/20260905153000_portal_access_password_management.sql', 'utf8');
const component = readFileSync('src/components/portal/PortalAccessPasswordManagement.tsx', 'utf8');

assert.match(stage2Migration, /revoke all on private\.portal_access_passwords from public, anon, authenticated/i);
assert.match(stage2Migration, /revoke all on private\.portal_access_unlocks from public, anon, authenticated/i);
assert.match(migration, /portal_access_passwords/);
assert.match(migration, /portal_access_password_status/);
assert.match(migration, /set_portal_access_password/);
assert.match(migration, /change_portal_access_password/);
assert.match(migration, /reset_portal_access_password/);
assert.match(migration, /security definer/i);
assert.match(migration, /length\(v_new\) < 12/);
assert.match(component, /Configure|Change|Reset/);
assert.doesNotMatch(component, /password_hash|portal_access_passwords/);
assert.doesNotMatch(component, /localStorage|sessionStorage/);

console.log('portalAccessPasswordManagement.test.mjs: PASS');
