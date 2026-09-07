import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Mobile header keeps the three-line hamburger in the header while the theme toggle is physically below it', () => {
  const nav = read('src/components/Nav.tsx');
  const toggle = read('src/components/ThemeToggle.tsx');

  assert.match(nav, /className="md:hidden ml-auto shrink-0 relative z-\[70\] p-2 text-white"/);
  assert.match(nav, /aria-label="Menu"/);
  assert.match(nav, /id="avelixa-mobile-navigation"/);
  assert.match(toggle, /top-\[5\.5rem\] right-3/);
  assert.match(toggle, /md:top-4 md:right-4/);
  assert.match(toggle, /md:w-auto md:justify-start/);
});
