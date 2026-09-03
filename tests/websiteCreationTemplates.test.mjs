import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getWebsiteTemplatePresentation } from '../src/lib/websiteCreation/presentation.ts';

const styles = ['editorial-modern', 'premium-minimal', 'warm-commerce', 'creative-bold', 'trusted-community'];
for (const visual_style of styles) {
  const spec = { template: { visual_style } };
  assert.equal(getWebsiteTemplatePresentation(spec).styleKey, visual_style);
}
assert.equal(getWebsiteTemplatePresentation({ template: { visual_style: 'unknown' } }).styleKey, 'editorial-modern');

const renderer = fs.readFileSync('src/components/websiteCreation/WebsitePreviewRenderer.tsx', 'utf8');
const sections = fs.readFileSync('src/components/websiteCreation/WebsiteSections.tsx', 'utf8');
const foundation = fs.readFileSync('supabase/migrations/20260831100000_website_creation_foundation.sql', 'utf8');
for (const style of styles) assert.match(renderer, new RegExp(`data-template-style=\\\"${style}\\\"`));
assert.match(renderer, /data-template-style=\{presentation\.styleKey\}/);
for (const style of styles) assert.match(sections, new RegExp(style.replace('-', '\\-')));
assert.match(sections, /<details className=.*Menu/);
assert.doesNotMatch(sections, /A polished digital presence\./);
assert.doesNotMatch(sections, /A tailored solution designed around your business goals\./);
assert.doesNotMatch(sections, /A trusted local business experience\./);
assert.doesNotMatch(sections, /Featured product/);
assert.doesNotMatch(sections, /Customer support/);

const templateRows = [...foundation.matchAll(/\('([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'[\s\S]*?'(editorial-modern|premium-minimal|warm-commerce|creative-bold|trusted-community)'/g)];
assert.equal(templateRows.length, 5);
assert.deepEqual(templateRows.map((row) => row[1]), ['modern-business', 'premium-minimal', 'local-commerce', 'creative-studio', 'trusted-community']);
assert.equal(new Set(templateRows.map((row) => row[4])).size, 5);

console.log('websiteCreationTemplates.test.mjs: PASS');
