import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Mobile header keeps the three-line hamburger above the theme toggle hit area', () => {
  const nav = read('src/components/Nav.tsx');
  const css = read('src/index.css');

  assert.match(nav, /px-4 sm:px-6 lg:px-8 xl:px-12 pr-28 md:pr-0 flex items-center gap-4/);
  assert.match(nav, /className="md:hidden ml-auto shrink-0 relative z-\[70\] p-2 text-white"/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /\.theme-toggle \{ right: 0\.75rem; width: 5\.75rem; justify-content: center; padding-inline: 0\.5rem; \}/);
});
