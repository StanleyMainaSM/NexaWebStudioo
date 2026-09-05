import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260905153000_portal_access_management.sql', 'utf8');
const page = fs.readFileSync('src/pages/portal/PortalAccessManagement.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');

assert.match(migration, /private\.get_portal_access_status/);
assert.match(migration, /public\.get_portal_access_status/);
assert.match(migration, /configured boolean/);
assert.match(migration, /revoke all on function private\.get_portal_access_status/);
assert.match(migration, /grant execute on function public\.get_portal_access_status\(\) to authenticated/);
assert.doesNotMatch(migration, /password_hash[^\n]*returns/i);

assert.match(page, /supabase\.rpc\('get_portal_access_status'/);
assert.match(page, /supabase\.rpc\('set_portal_access_password'/);
assert.match(page, /never displayed/i);
assert.match(page, /server-side/);
assert.match(page, /autoComplete="new-password"/);
assert.doesNotMatch(page, /localStorage|sessionStorage/);

assert.match(app, /path="admin\/portal-access"/);
assert.match(app, /path="owner\/portal-access"/);
assert.match(app, /requiredRoles=\{\['admin'\]\}/);
assert.match(app, /requiredRoles=\{\['owner'\]\}/);

console.log('Portal access management regression checks passed.');
