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
for (const style of styles) assert.match(renderer, new RegExp(`data-template-style=\\\"${style}\\\"`));
assert.match(renderer, /data-template-style=\{presentation\.styleKey\}/);
console.log('websiteCreationTemplates.test.mjs: PASS');
