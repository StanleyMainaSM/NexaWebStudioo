import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Mobile header keeps the three-line hamburger clear of the theme toggle', () => {
  const nav = read('src/components/Nav.tsx');
  const toggle = read('src/components/ThemeToggle.tsx');

  assert.match(nav, /px-4 sm:px-6 lg:px-8 xl:px-12 pr-28 md:pr-0 flex items-center gap-4/);
  assert.match(nav, /className="md:hidden ml-auto shrink-0 relative z-\[70\] p-2 text-white"/);
  assert.match(toggle, /top-\[5rem\] right-3 w-\[5\.75rem\] justify-center/);
  assert.match(toggle, /md:top-4 md:right-4 md:w-auto md:justify-start/);
});
