import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const protectedRouteSource = fs.readFileSync(new URL('../src/components/portal/ProtectedRoute.tsx', import.meta.url), 'utf8');
const portalAccessSource = fs.readFileSync(new URL('../src/lib/portalAccess.ts', import.meta.url), 'utf8');
const creationGateSource = fs.readFileSync(new URL('../src/components/portal/CreationAccessGate.tsx', import.meta.url), 'utf8');
const portalGateSource = fs.readFileSync(new URL('../src/components/portal/PortalAccessGate.tsx', import.meta.url), 'utf8');
const migrationDir = new URL('../supabase/migrations/', import.meta.url);

assert.match(appSource, /\/studio.*ProtectedRoute[\s\S]*accessGate="creation"/, 'Create a Website must enforce the dedicated creation gate');
assert.doesNotMatch(appSource, /\/studio[\s\S]*PortalAccessGate/, 'Create a Website must not reuse the normal portal gate');
assert.match(protectedRouteSource, /CreationAccessGate/, 'ProtectedRoute must support the dedicated creation access gate');
assert.match(protectedRouteSource, /isOwnerArea/, 'Owner routes must be able to enter after normal Supabase/role authorization without the legacy portal gate');
assert.match(portalAccessSource, /'creation'/, 'Portal access infrastructure must support a creation access namespace');
assert.match(creationGateSource, /not your normal Supabase login password/i, 'Creation gate must clearly distinguish the creation password from Supabase login');
assert.match(creationGateSource, /isPortalPasswordConfigured\('creation'\)/, 'Creation gate must handle an unconfigured creation password');
assert.match(portalGateSource, /shared \{label\} Portal access password/, 'Normal portal gate remains available for non-Owner/non-creation areas');

const migrationNames = fs.readdirSync(migrationDir);
assert.ok(migrationNames.some((name) => /creation.*access.*password/i.test(name)), 'A creation access password migration must exist');

console.log('creationAccessPassword.test.mjs: PASS');
