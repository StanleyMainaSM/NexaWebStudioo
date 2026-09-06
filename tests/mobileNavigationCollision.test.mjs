import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const nav = () => fs.readFileSync(path.join(root, 'src/components/Nav.tsx'), 'utf8');

test('Mobile header reserves the existing theme-toggle space so the menu button remains accessible', () => {
  const source = nav();
  assert.match(
    source,
    /className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 md:pr-0 pr-20 flex items-center gap-4"/
  );
});
