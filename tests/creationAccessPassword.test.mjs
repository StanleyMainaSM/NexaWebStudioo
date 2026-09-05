import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const protectedRouteSource = fs.readFileSync(new URL('../src/components/portal/ProtectedRoute.tsx', import.meta.url), 'utf8');
const portalAccessSource = fs.readFileSync(new URL('../src/lib/portalAccess.ts', import.meta.url), 'utf8');
const gateSource = fs.readFileSync(new URL('../src/components/portal/PortalAccessGate.tsx', import.meta.url), 'utf8');
const migrationDir = new URL('../supabase/migrations/', import.meta.url);

assert.match(appSource, /CreationAccessGate/, 'Creation routes must use a dedicated creation access gate');
assert.match(appSource, /\/studio.*CreationAccessGate/, 'Public Create a Website route must enforce creation access');
assert.doesNotMatch(appSource, /\/studio.*PortalAccessGate/, 'Create a Website must not reuse a portal access gate');
assert.match(protectedRouteSource, /return <PortalAccessGate portal=\{portal\}>/, 'ProtectedRoute must continue to enforce existing portal authorization');
assert.match(portalAccessSource, /'creation'/, 'Portal access infrastructure must support a creation access namespace');
assert.match(gateSource, /Creation|creation/, 'Creation access must have user-facing dedicated copy');

const migrationNames = fs.readdirSync(migrationDir);
assert.ok(migrationNames.some((name) => /creation.*access.*password/i.test(name)), 'A creation access password migration must exist');

console.log('creationAccessPassword.test.mjs: PASS');
