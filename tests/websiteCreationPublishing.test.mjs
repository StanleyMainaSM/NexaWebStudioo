import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createWebsiteOutputIdentity,
  createWebsiteOutputVersion,
  generateWebsiteOutputFromSpecification,
} from '../src/lib/websiteCreation/generator.ts';

const template = {
  id: 'publishing-template',
  slug: 'publishing-template',
  name: 'Publishing Template',
  description: 'Publishing test template',
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
  business: { businessName: 'Publishing Co', email: 'hello@publishing.test' },
  sections: ['navbar', 'hero', 'services', 'contact', 'footer'],
  theme: { primary: '#111827', secondary: '#334155', accent: '#7c3aed', surface: '#f8fafc', text: '#111827', muted: '#64748b', headingFont: 'modern-sans', bodyFont: 'clean-sans' },
  navigation: [{ label: 'Services', section: 'services' }, { label: 'Contact', section: 'contact' }],
  content: { hero: { title: 'Publishing Co', subtitle: 'Generated website.' }, services: { items: ['Consulting'] }, contact: { phone: '', email: 'hello@publishing.test', whatsapp: '' }, footer: { businessName: 'Publishing Co' } },
  attribution: { enabled: true, label: 'Made with Avelixa' },
};

const projectId = 'creation-publishing-1';
const generated = generateWebsiteOutputFromSpecification(specification, template, projectId, '2026-09-01T12:00:00.000Z');
assert.equal(generated.ok, true);
if (!generated.ok) throw new Error('Expected publishing fixture generation to succeed.');

assert.equal(generated.output.status, 'generated');
assert.equal(generated.output.id, createWebsiteOutputIdentity(projectId, generated.output.specification));
assert.equal(generated.output.outputVersion, createWebsiteOutputVersion(generated.output.specification));

const changed = { ...specification, content: { ...specification.content, hero: { title: 'Changed Publishing Co', subtitle: 'Changed website.' } } };
const changedGenerated = generateWebsiteOutputFromSpecification(changed, template, projectId);
assert.equal(changedGenerated.ok, true);
if (changedGenerated.ok) assert.notEqual(changedGenerated.output.id, generated.output.id);

const migration = fs.readFileSync('supabase/migrations/20260901130000_website_creation_publishing.sql', 'utf8');
const studio = fs.readFileSync('src/pages/WebsiteCreationStudio.tsx', 'utf8');
const types = fs.readFileSync('src/lib/websiteCreation/types.ts', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/avelixa-build.yml', 'utf8');

assert.match(migration, /published_at/);
assert.match(migration, /publish_creation_generated_output/);
assert.match(migration, /Authentication required/);
assert.match(migration, /Creation publishing access denied/);
assert.match(migration, /status\s*=\s*'generated'/);
assert.match(migration, /status\s*=\s*'published'/);
assert.match(migration, /latest_generated_output_identity/);
assert.match(migration, /latest_generated_output_version/);
assert.match(migration, /UNIQUE.*creation_project_id|CREATE UNIQUE INDEX.*creation_generated_website_outputs/si);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.publish_creation_generated_output/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.publish_creation_generated_output.*authenticated/);
assert.doesNotMatch(migration, /GRANT EXECUTE ON FUNCTION public\.publish_creation_generated_output.*anon/);
assert.match(studio, /publish_creation_generated_output/);
assert.match(studio, /Publish Website/);
assert.match(studio, /publishing/);
assert.match(studio, /WebsitePreviewRenderer/);
assert.doesNotMatch(studio, /PublishedWebsiteRenderer/);
assert.match(types, /publishedAt|published_at/);
assert.equal(packageJson.scripts['test:website-creation-publishing'], 'node --experimental-strip-types tests/websiteCreationPublishing.test.mjs');
assert.match(workflow, /test:website-creation-publishing/);

console.log('websiteCreationPublishing.test.mjs: PASS');
