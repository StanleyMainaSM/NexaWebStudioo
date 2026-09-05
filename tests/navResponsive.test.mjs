import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const nav = () => read('src/components/Nav.tsx');

test('Public header keeps the full desktop navigation out of tablet/mobile widths', () => {
  const source = nav();
  assert.match(source, /className="hidden lg:flex[^\"]*items-center/);
  assert.match(source, /className="lg:hidden[^\"]*p-2/);
  assert.match(source, /className="lg:hidden absolute top-20/);
  assert.doesNotMatch(source, /hidden md:flex items-center gap-6/);
  assert.doesNotMatch(source, /md:hidden p-2/);
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

test('Header retains theme-aware Avelixa styling and the existing navigation destinations', () => {
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
