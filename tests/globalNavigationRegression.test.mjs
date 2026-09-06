import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Public navigation exposes the existing Login/Portal route in the mobile menu', () => {
  const source = read('src/components/Nav.tsx');
  assert.match(source, /aria-label="Menu"/);
  assert.match(source, /aria-controls="avelixa-mobile-navigation"/);
  assert.match(source, /to="\/login"/);
  assert.match(source, /Portal Login/);
  for (const route of ['/services', '/work', '/pricing', '/reviews', '/connectors']) {
    assert.match(source, new RegExp(`to: '${route.replace('/', '\\/')}'`));
  }
});

test('Portal navigation keeps the existing hamburger menu and role-filtered items', () => {
  const source = read('src/pages/portal/PortalLayout.tsx');
  assert.match(source, /aria-label="Open portal menu"/);
  assert.match(source, /aria-label="Close portal menu"/);
  assert.match(source, /const visibleNavItems = navItems\.filter/);
  assert.match(source, /item\.roles\.includes\(currentWorkspaceKey\)/);
  assert.match(source, /onClick=\{mobile \? \(\) => setSidebarOpen\(false\) : undefined\}/);
});

test('Owner User Management restores an explicit authorized back route without changing its auth flow', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /to="\/portal\/owner"/);
  assert.match(source, /Back to Owner Dashboard/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /signInWithPassword/);
});

test('Settings restores a workspace-aware back route without changing authentication', () => {
  const source = read('src/pages/portal/SettingsV2.tsx');
  assert.match(source, /activeWorkspace/);
  assert.match(source, /backPath=activeWorkspace==='owner'\?'\/portal\/owner'/);
  assert.match(source, /Back to \{activeWorkspace/);
  assert.match(source, /supabase\.auth\.signInWithPassword/);
});

test('Existing detail-page back controls remain intact', () => {
  for (const file of ['src/pages/portal/ProjectDetails.tsx', 'src/pages/portal/ClientDetails.tsx', 'src/pages/portal/Login.tsx']) {
    const source = read(file);
    assert.match(source, /ArrowLeft/);
  }
});
