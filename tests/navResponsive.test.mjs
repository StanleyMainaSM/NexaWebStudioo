import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const nav = () => read('src/components/Nav.tsx');
const portalLayout = () => read('src/pages/portal/PortalLayout.tsx');

test('Public header keeps the existing navigation visible from tablet/desktop widths while preserving the mobile menu', () => {
  const source = nav();
  assert.match(source, /className="hidden md:flex[^\"]*items-center/);
  assert.match(source, /className="md:hidden[^\"]*p-2/);
  assert.match(source, /className="md:hidden absolute top-20/);
  assert.doesNotMatch(source, /hidden lg:flex[^\"]*items-center/);
  assert.doesNotMatch(source, /lg:hidden ml-auto shrink-0 p-2/);
});

test('Public header reserves non-shrinking space for the logo and actions', () => {
  const source = nav();
  assert.match(source, /shrink-0/);
  assert.match(source, /min-w-0/);
  assert.match(source, /whitespace-nowrap/);
});

test('Mobile menu remains keyboard/assistive-technology discoverable', () => {
  const source = nav();
  assert.match(source, /aria-label="Menu"/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-controls="avelixa-mobile-navigation"/);
});

test('Public header retains the existing navigation destinations and portal actions', () => {
  const source = nav();
  assert.match(source, /bg-ink-950\/80/);
  assert.match(source, /text-ink-600/);
  for (const route of ['/', '/services', '/work', '/pricing', '/reviews', '/connectors']) {
    assert.match(source, new RegExp(`to: '${route.replace('/', '\\/')}'`));
  }
  assert.match(source, /to="\/studio"/);
  assert.match(source, /to="\/login"/);
  assert.match(source, /whatsapp/);
});

test('Portal navigation keeps the existing dashboard, messages, projects, and authorized navigation structure', () => {
  const source = portalLayout();
  for (const item of [
    ["Dashboard", "/portal"],
    ["Projects", "/portal/projects"],
    ["Messages", "/portal/messages"],
    ["Settings", "/portal/settings"],
  ]) {
    assert.match(source, new RegExp(`name: '${item[0]}'.*path: '${item[1].replace('/', '\\/')}'`));
  }
  assert.match(source, /visibleNavItems = navItems\.filter/);
  assert.match(source, /roles\.includes\(currentWorkspaceKey\)/);
  assert.match(source, /hidden md:flex w-64/);
  assert.match(source, /md:hidden.*Open portal menu/);
});
