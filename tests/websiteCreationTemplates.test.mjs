import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getWebsiteTemplatePresentation } from '../src/lib/websiteCreation/presentation.ts';
import { generateWebsiteDemoSpecification } from '../src/lib/websiteCreation/generator.ts';

const styles = ['editorial-modern', 'premium-minimal', 'warm-commerce', 'creative-bold', 'trusted-community'];
const slugs = ['modern-business', 'premium-minimal', 'local-commerce', 'creative-studio', 'trusted-community'];
const newSections = ['stats','story','values','process','portfolio','team','offers','hours','social','finalCta'];
const migrationSections = newSections.filter((id) => id !== 'social');
const styleToSlug = { 'editorial-modern':'modern-business', 'premium-minimal':'premium-minimal', 'warm-commerce':'local-commerce', 'creative-bold':'creative-studio', 'trusted-community':'trusted-community' };
const templateFor = (visual_style) => ({ id:`demo-${visual_style}`, slug:styleToSlug[visual_style], name:visual_style, description:'demo', categories:[], visual_style, sections:['navbar','hero','about','services','products','gallery','stats','story','values','process','portfolio','team','offers','testimonials','pricing','faq','hours','location','social','finalCta','contact','footer'], typography:{heading:'display',body:'sans'}, color_direction:{primary:'#111827',secondary:'#334155',accent:'#7c3aed',surface:'#f8fafc'}, layout:{}, preview:{}, is_active:true, is_protected:true });

// The five identities are the stable public template vocabulary.
// Keep this source-level contract deterministic so CI can verify every template without a browser.
for (const visual_style of styles) assert.equal(getWebsiteTemplatePresentation({ template: { visual_style } }).styleKey, visual_style);
assert.equal(getWebsiteTemplatePresentation({ template: { visual_style: 'unknown' } }).styleKey, 'editorial-modern');

const renderer = fs.readFileSync('src/components/websiteCreation/WebsitePreviewRenderer.tsx', 'utf8');
const sections = fs.readFileSync('src/components/websiteCreation/WebsiteSections.tsx', 'utf8');
const foundation = fs.readFileSync('supabase/migrations/20260831100000_website_creation_foundation.sql', 'utf8');
const upgrade = fs.readFileSync('supabase/migrations/20260903170000_website_template_library_presentation_upgrade.sql', 'utf8');
for (const style of styles) assert.match(renderer, new RegExp(`data-template-style=\\\"${style}\\\"`));
assert.match(renderer, /data-template-style=\{presentation\.styleKey\}/);
for (const style of styles.slice(1)) assert.match(sections, new RegExp(style));
for (const id of ['Navbar','Hero','About','Stats','Story','Values','Process','Services','Offers','Products','Gallery','Portfolio','Team','Testimonials','Pricing','FAQ','Hours','Location','Social','FinalCta','Contact','Footer']) assert.match(sections, new RegExp(`export function ${id}`));
for (const id of newSections) assert.match(renderer, new RegExp(`\\b${id}:`));
assert.doesNotMatch(sections, /A polished digital presence\./);
assert.doesNotMatch(sections, /A tailored solution designed around your business goals\./);
assert.doesNotMatch(sections, /A trusted local business experience\./);
assert.doesNotMatch(sections, /Featured product/);
assert.doesNotMatch(sections, /Customer support/);
for (const slug of slugs) assert.match(foundation, new RegExp(`'${slug}'`));
for (const style of styles) assert.match(foundation, new RegExp(`'${style}'`));
assert.equal((foundation.match(/INSERT INTO public\.website_templates/g) || []).length, 1);
for (const id of migrationSections) assert.match(upgrade, new RegExp(id));
for (const slug of slugs) assert.match(upgrade, new RegExp(`WHEN '${slug}'`));

for (const style of styles) {
  const template = templateFor(style);
  const first = generateWebsiteDemoSpecification(template);
  const second = generateWebsiteDemoSpecification(template);
  assert.deepEqual(first, second, `${style} demo specification must be deterministic`);
  assert.ok(first.sections.length >= 9, `${style} demo should be a complete composition`);
  assert.equal(first.template.slug, template.slug);
  assert.equal(first.business.imagery?.[0]?.startsWith('/images/template-'), true);
  const serialized = JSON.stringify(first.content).toLowerCase();
  for (const phrase of ['lorem ipsum','add your content','your business name','featured product','customer support']) assert.equal(serialized.includes(phrase), false, `${style} contains placeholder copy: ${phrase}`);
  assert.ok(first.content.hero);
}

console.log('websiteCreationTemplates.test.mjs: PASS');
