import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Mobile header places the theme toggle outside the hamburger hit area', () => {
  const nav = read('src/components/Nav.tsx');
  const css = read('src/index.css');

  assert.match(nav, /px-4 sm:px-6 lg:px-8 xl:px-12 pr-28 md:pr-0 flex items-center gap-4/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /\.theme-toggle \{ top: 5rem; right: 0\.75rem; width: 5\.75rem; justify-content: center; padding-inline: 0\.5rem; \}/);
  assert.doesNotMatch(css, /@media \(max-width: 767px\)[\s\S]*?\.theme-toggle \{[^}]*top: 1rem/);
});
