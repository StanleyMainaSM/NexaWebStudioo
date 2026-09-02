import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createWebsiteOutputIdentity,
  createWebsiteOutputVersion,
  generateWebsiteOutputFromSpecification,
} from '../src/lib/websiteCreation/generator.ts';

const template = {
  id: 'public-delivery-template',
  slug: 'public-delivery-template',
  name: 'Public Delivery Template',
  description: 'Public delivery test template',
  categories: ['business'],
  visual_style: 'editorial-modern',
  sections: ['navbar', 'hero', 'services', 'contact', 'footer'],
  typography: { heading: 'modern-sans', body: 'clean-sans' },
  color_direction: { primary: '#111827', secondary: '#334155', accent: '#7c3aed', surface: '#f8fafc' },
  layout: { container: 'wide' },
  preview: {},
  is_active: true,
  is_protected: true,
};

const specification = {
  version: 1,
  template: { id: template.id, slug: template.slug, name: template.name, visual_style: template.visual_style },
  business: { businessName: 'Public Delivery Co', email: 'hello@delivery.test' },
  sections: ['navbar', 'hero', 'services', 'contact', 'footer'],
  theme: { primary: '#111827', secondary: '#334155', accent: '#7c3aed', surface: '#f8fafc', text: '#111827', muted: '#64748b', headingFont: 'modern-sans', bodyFont: 'clean-sans' },
  navigation: [{ label: 'Services', section: 'services' }, { label: 'Contact', section: 'contact' }],
  content: { hero: { title: 'Public Delivery Co', subtitle: 'Published website.' }, services: { items: ['Consulting'] }, contact: { phone: '', email: 'hello@delivery.test', whatsapp: '' }, footer: { businessName: 'Public Delivery Co' } },
  attribution: { enabled: true, label: 'Made with Avelixa' },
};

const projectId = 'creation-public-delivery-1';
const generated = generateWebsiteOutputFromSpecification(specification, template, projectId, '2026-09-02T06:00:00.000Z');
assert.equal(generated.ok, true);
if (!generated.ok) throw new Error('Expected public delivery fixture generation to succeed.');

const outputIdentity = createWebsiteOutputIdentity(projectId, generated.output.specification);
const outputVersion = createWebsiteOutputVersion(generated.output.specification);
assert.equal(generated.output.id, outputIdentity);
assert.equal(generated.output.outputVersion, outputVersion);
assert.equal(generated.output.status, 'generated');

const changed = { ...specification, content: { ...specification.content, hero: { title: 'Changed Public Delivery Co', subtitle: 'Changed published website.' } } };
const changedGenerated = generateWebsiteOutputFromSpecification(changed, template, projectId);
assert.equal(changedGenerated.ok, true);
if (changedGenerated.ok) assert.notEqual(changedGenerated.output.id, outputIdentity);

const migration = fs.readFileSync('supabase/migrations/20260901121000_website_creation_artifact_preview.sql', 'utf8');
const publishingMigration = fs.readFileSync('supabase/migrations/20260901130000_website_creation_publishing.sql', 'utf8');
const studio = fs.readFileSync('src/pages/WebsiteCreationStudio.tsx', 'utf8');
const previewPage = fs.readFileSync('src/pages/PublicCreationPreview.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const generatedPreview = fs.readFileSync('src/components/websiteCreation/GeneratedWebsitePreview.tsx', 'utf8');
const renderer = fs.readFileSync('src/components/websiteCreation/WebsitePreviewRenderer.tsx', 'utf8');
const sections = fs.readFileSync('src/components/websiteCreation/WebsiteSections.tsx', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/avelixa-build.yml', 'utf8');

assert.match(migration, /creation_generated_website_outputs/);
assert.match(migration, /get_public_creation_preview/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_public_creation_preview/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_public_creation_preview.*anon, authenticated/);
assert.match(publishingMigration, /status = 'published'/);
assert.match(previewPage, /get_public_creation_preview/);
assert.match(previewPage, /publishedOnly|p_published_only/);
assert.match(previewPage, /Published website|published website/i);
assert.match(app, /\/website\/:token/);
assert.match(app, /PublicCreationPreview/);
assert.match(studio, /Publish Website/);
assert.match(generatedPreview, /WebsitePreviewRenderer/);
assert.match(renderer, /WebsiteSections/);
assert.doesNotMatch(previewPage, /PublishedWebsiteRenderer/);
assert.doesNotMatch(previewPage, /PublishedWebsiteSpecification/);
assert.doesNotMatch(previewPage, /PublishedWebsiteSections/);
assert.doesNotMatch(app, /PublishedWebsiteRenderer/);
assert.equal(packageJson.scripts['test:website-creation-public-delivery'], 'node --experimental-strip-types tests/websiteCreationPublicDelivery.test.mjs');
assert.match(workflow, /test:website-creation-public-delivery/);

console.log('websiteCreationPublicDelivery.test.mjs: PASS');
