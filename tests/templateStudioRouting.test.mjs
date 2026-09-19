import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('public Create Website entry points target the integrated Template Studio route', () => {
  const nav = read('src/components/Nav.tsx');
  const home = read('src/pages/Home.tsx');
  const app = read('src/App.tsx');

  assert.match(nav, /<Link to="\/create"[^>]*>[sS]*Create a Website/);
  assert.match(home, /<Links+to="\/create"/);
  assert.match(app, /<Route path="\/create\/\*" element={<TemplateStudioApp publicShell />} />/);
  assert.doesNotMatch(nav, /Create a Website[sS]*to="\/studio"/);
});

test('portal Template Studio entry point targets the integrated Template Studio route', () => {
  const portal = read('src/pages/portal/PortalLayout.tsx');
  const app = read('src/App.tsx');

  assert.match(portal, /{ name: 'Template Studio', path: '/portal/template-studio'/);
  assert.match(app, /<Route path="\/template-studio\/\*" element={<ProtectedRoute requiredRoles={creationRoles} accessGate="creation" requiresConnectorTerms><TemplateStudioApp /><\/ProtectedRoute>} />/);
  assert.doesNotMatch(portal, /{ name: 'Template Studio', path: '/portal/creation-studio'/);
});

test('Template Studio nested route tree contains the public and authenticated wizard/preview destinations', () => {
  const studio = read('src/pages/TemplateStudioApp.tsx');

  for (const route of ['wizard', 'gallery', 'favorites', 'preview']) {
    assert.match(studio, new RegExp(`<Route path="${route}"`));
  }
  assert.match(studio, /<Route index element={<Home \/>} />/);
});

test('Template Studio generation keeps the single Avelixa persistence handoff', () => {
  const wizard = read('src/templateStudio/pages/Wizard.tsx');

  assert.match(wizard, /adaptTemplateStudioTemplateToWebsiteSpecification/);
  assert.match(wizard, /generateWebsiteOutputFromSpecification/);
  assert.match(wizard, /consume_creation_generation/);
  assert.match(wizard, /setCreationProjectId(projectId)/);
  assert.match(wizard, /navigate('../preview')/);
});
