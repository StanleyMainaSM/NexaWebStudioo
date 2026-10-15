import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const manifest = JSON.parse(read('public/manifest.webmanifest'));
const vite = read('vite.config.ts');
const index = read('index.html');
const installService = read('src/lib/pwaInstall.ts');
const installUi = read('src/components/PwaInstallPrompt.tsx');
const main = read('src/main.tsx');
const packageJson = JSON.parse(read('package.json'));

assert.equal(manifest.name, 'Avelixa');
assert.equal(manifest.short_name, 'Avelixa');
assert.equal(manifest.start_url, '/login');
assert.equal(manifest.scope, '/');
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'));
assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'maskable'));
assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'));
assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'));
for (const icon of manifest.icons) {
  const iconPath = resolve(root, 'public', icon.src.replace(/^\//, ''));
  assert.ok(existsSync(iconPath), `manifest icon exists: ${icon.src}`);
  const bytes = readFileSync(iconPath);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${icon.src} is a PNG`);
  asse¶»§q«^