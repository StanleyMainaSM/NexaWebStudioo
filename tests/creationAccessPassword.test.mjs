import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const protectedRouteSource = fs.readFileSync(new URL('../src/components/portal/ProtectedRoute.tsx', import.meta.url), 'utf8');
const portalAccessSource = fs.readFileSync(new URL('../src/lib/portalAccess.ts', import.meta.url), 'utf8');
const creationGateSource = fs.readFileSync(new URL('../src/components/portal/CreationAccessGate.tsx', import.meta.url), 'utf8');
const migrationDir = new URL('../supabase/migrations/', import.meta.url);

assert.match(appSource, /\/studio.*ProtectedRoute[\s\S]*accessGate="creation"/, 'Create a Website must enforce the dedicated creation gate');
assert.doesNotMatch(appSource, /\/studio[\s\S]*PortalAccessGate/, 'Create a Website must not reuse the normal portal gate');
assert.match(protectedRouteSource, /CreationAccessGate/, 'ProtectedRoute must support the dedicated creation access gate');
assert.match(protectedRouteSource, /accessGate = 'none'/, 'Normal protected routes must default to Supabase/session/role authorization without a second password');
assert.doesNotMatch(protectedRouteSource, /PortalAccessGate/, 'ProtectedRoute must not invoke the legacy shared portal password gate');
assert.match(appSource, /path="creation"[\s\S]*accessGate="creation"/, 'Portal creation projects must use the dedicated creation gate');
assert.match(appSource, /path="creation-studio"[\s\S]*accessGate="creation"/, 'Template Studio entry must use the dedicated creation gate');
assert.match(appSource, /path="creation-studio\/:creationProjectId"[\s\S]*accessGate="creation"/, 'Template Studio project routes must use the dedicated creation gate');
assert.match(appSource, /path="creation-preview\/:creationProjectId"[\s\S]*accessGate="creation"/, 'Creation preview routes must use the dedicated creation gate');
assert.match(appSource, /path="connector\/leads\/:leadId\/creation"[\s\S]*accessGate="creation"/, 'Connector creation routes must use the dedicated creation gate');
assert.match(appSource, /path="operator\/creation\/:creationProjectId"[\s\S]*accessGate="creation"/, 'Operator creation routes must use the dedicated creation gate');
assert.match(portalAccessSource, /'creation'/, 'Portal access infrastructure must support a creation access namespace');
assert.match(creationGateSource, /separate creation access password/i, 'Creation gate must identify the dedicated creation password.');
assert.match(creationGateSource, /not<\/strong>\s+your normal Supabase login password/i, 'Creation gate must clearly distinguish the creation password from Supabase login');
assert.match(creationGateSource, /isPortalPasswordConfigured\('creation'\)/, 'Creation gate must handle an unconfigured creation password');

const migrationNames = fs.readdirSync(migrationDir);
assert.ok(migrationNames.some((name) => /creation.*access.*password/i.test(name)), 'A creation access password migration must exist');
const creationServerEnforcement = fs.readFileSync(new URL('../supabase/migrations/20260905213000_creation_access_server_enforcement.sql', import.meta.url), 'utf8');
assert.match(creationServerEnforcement, /private\.verify_portal_access_password[\s\S]*'creation'/, 'Server-side password verification must support creation access');
assert.match(creationServerEnforcement, /private\.has_portal_access[\s\S]*'creation'/, 'Server-side access assertion must support creation access');
assert.match(creationServerEnforcement, /Authorized users read creation projects[\s\S]*private\.has_portal_access\('creation'\)/, 'Creation project reads must require the dedicated creation unlock');
assert.match(creationServerEnforcement, /enforce_creation_access_on_project_mutation/, 'Creation project mutations must be server-enforced');
assert.match(creationServerEnforcement, /enforce_creation_access_on_output_mutation/, 'Generated output mutations must be server-enforced');
assert.match(creationServerEnforcement, /Website and template creation access required/, 'Server enforcement must reject creation access without the dedicated unlock');

console.log('creationAccessPassword.test.mjs: PASS');
