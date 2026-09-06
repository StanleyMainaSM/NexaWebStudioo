import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const indexPath = resolve(root, 'index.html');
const publicDir = resolve(root, 'public');
const distDir = resolve(root, 'dist');

const indexHtml = readFileSync(indexPath, 'utf8');

function count(pattern) {
  return [...indexHtml.matchAll(pattern)].length;
}

function metaContent(nameOrProperty) {
  const escaped = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = indexHtml.match(
    new RegExp(`<meta\\s+(?:name|property)=["']${escaped}["']\\s+content=["']([^"']*)["']`, 'i'),
  );
  return match?.[1] ?? null;
}

assert.equal(count(/<link[^>]+rel=["']icon["'][^>]*>/gi), 1, 'index.html must have exactly one authoritative rel="icon" declaration');
assert.equal(count(/<link[^>]+rel=["']shortcut icon["'][^>]*>/gi), 0, 'legacy shortcut icon declarations must not compete with the authoritative favicon');
assert.match(indexHtml, /<link\s+rel=["']icon["'][^>]*type=["']image\/png["'][^>]*sizes=["']192x192["'][^>]*href=["']\/favicon\.png["'][^>]*>/i);
assert.match(indexHtml, /<link\s+rel=["']apple-touch-icon["'][^>]*href=["']\/pwa-192x192\.png["'][^>]*>/i);
assert.match(indexHtml, /<link\s+rel=["']manifest["'][^>]*href=["']\/manifest\.webmanifest["'][^>]*>/i);
assert.match(indexHtml, /<link\s+rel=["']canonical["'][^>]*href=["']https:\/\/www\.avelixa\.co\.ke\/["'][^>]*>/i);
assert.match(indexHtml, /<title>Avelixa — Web Design &amp; Development in Kenya<\/title>/i);
assert.match(indexHtml, /<meta\s+name=["']description["'][^>]+>/i);
assert.equal(metaContent('og:type'), 'website');
assert.equal(metaContent('og:site_name'), 'Avelixa');
assert.equal(metaContent('og:url'), 'https://www.avelixa.co.ke/');
assert.equal(metaContent('og:image'), 'https://www.avelixa.co.ke/og-image.jpg');
assert.equal(metaContent('twitter:card'), 'summary_large_image');
assert.equal(metaContent('twitter:image'), 'https://www.avelixa.co.ke/og-image.jpg');

const faviconPath = resolve(publicDir, 'favicon.png');
assert.ok(existsSync(faviconPath), 'public/favicon.png must exist');
const favicon = readFileSync(faviconPath);
assert.deepEqual([...favicon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'favicon.png must be a valid PNG');
assert.equal(favicon.readUInt32BE(16), 192, 'favicon.png must be 192px wide');
assert.equal(favicon.readUInt32BE(20), 192, 'favicon.png must be 192px tall');

const manifestPath = resolve(publicDir, 'manifest.webmanifest');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
assert.equal(manifest.short_name, 'Avelixa');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'manifest must retain PWA icon coverage');
assert.ok(manifest.icons.some((icon) => icon.src === '/pwa-192x192.png' && icon.sizes === '192x192'));
assert.ok(manifest.icons.some((icon) => icon.src === '/pwa-512x512.png' && icon.sizes === '512x512'));

if (existsSync(distDir)) {
  for (const asset of ['favicon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'manifest.webmanifest']) {
    assert.ok(existsSync(resolve(distDir, asset)), `production build must contain ${asset}`);
  }

  const builtIndex = readFileSync(resolve(distDir, 'index.html'), 'utf8');
  assert.match(builtIndex, /href=["']\/favicon\.png["']/i, 'production index must reference the favicon');
  assert.match(builtIndex, /href=["']\/manifest\.webmanifest["']/i, 'production index must reference the manifest');
}

console.log('Favicon and metadata contract passed.');
