import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createWebsiteOutputIdentity,
  createWebsiteOutputVersion,
  generateWebsiteOutputFromSpecification,
} from '../src/lib/websiteCreation/generator.ts';

const template = {
  id: 'artifact-template', slug: 'artifact-template', name: 'Artifact Template', description: null,
  categories: ['business'], visual_style: 'modern',
  sections: ['navbar', 'hero', 'services', 'gallery', 'contact', 'location', 'footer'],
  typography: { heading: 'modern-sans', body: 'clean-sans' },
  color_direction: { primary: '#111827', secondary: '#334155', accent: '#7c3aed', surface: '#f8fafc' },
  layout: {}, preview: {}, is_active: true, is_protected: true,
};

const specification = {
  version: 1,
  template: { id: template.id, slug: template.slug, name: template.name, visual_style: template.visual_style },
  business: { businessName: 'Artifact Co', email: 'hello@artifact.test' },
  sections: ['navbar', 'hero', 'services', 'gallery', 'contact', 'location', 'footer'],
  theme: { primary: '#111827', secondary: '#334155', accent: '#7c3aed', surface: '#f8fafc', text: '#111827', muted: '#64748b', headingFont: 'modern-sans', bodyFont: 'clean-sans' },
  navigation: [
    { label: 'Services', section: 'services' }, { label: 'Gallery', section: 'gallery' },
    { label: 'Contact', section: 'contact' }, { label: 'Location', section: 'location' },
  ],
  content: {
    hero: { title: 'Artifact Co', subtitle: 'Generated website.' },
    services: { items: ['Consulting'] }, gallery: { images: [] },
    contact: { phone: '', email: 'hello@artifact.test', whatsapp: '' },
    location: { address: '' }, footer: { businessName: 'Artifact Co' },
  },
  attribution: { enabled: true, label: 'Made with Avelixa' },
};

const first = generateWebsiteOutputFromSpecification(specification, template, 'creation-artifact', '2026-09-01T12:00:00.000Z');
assert.equal(first.ok, true);
assert.equal(first.ok && first.output.status, 'generated');
if (first.ok) {
  assert.equal(first.output.id, createWebsiteOutputIdentity('creation-artifact', first.output.specification));
  assert.equal(first.output.outputVersion, createWebsiteOutputVersion(first.output.specification));
}

const second = generateWebsiteOutputFromSpecification(specification, template, 'creation-artifact', '2026-09-01T13:00:00.000Z');
assert.equal(second.ok, true);
if (first.ok && second.ok) {
  assert.equal(second.output.id, first.output.id);
  assert.equal(second.output.outputVersion, first.output.outputVersion);
  assert.deepEqual(second.output.specification, first.output.specification);
}

const changed = {
  ...specification,
  content: { ...specification.content, hero: { title: 'Changed Artifact', subtitle: 'New generated version.' } },
};
const changedResult = generateWebsiteOutputFromSpecification(changed, template, 'creation-artifact');
assert.equal(changedResult.ok, true);
if (first.ok && changedResult.ok) assert.notEqual(changedResult.output.id, first.output.id);

const invalid = { ...specification, sections: ['hero', 'hero', 'footer'] };
const invalidResult = generateWebsiteOutputFromSpecification(invalid, template, 'creation-artifact');
assert.equal(invalidResult.ok, false);

const migration = fs.readFileSync('supabase/migrations/20260901120000_website_creation_generated_artifacts.sql', 'utf8');
const previewMigration = fs.readFileSync('supabase/migrations/20260901121000_website_creation_artifact_preview.sql', 'utf8');
const publicPreview = fs.readFileSync('src/pages/PublicCreationPreview.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.creation_generated_website_outputs/);
assert.match(migration, /REFERENCES public\.creation_projects\(id\)/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /WITH CHECK \(false\)/);
assert.match(migration, /status TEXT NOT NULL DEFAULT 'generated'/);
assert.match(previewMigration, /creation_generated_website_outputs/);
assert.match(previewMigration, /o\.id = cp\.latest_generated_output_identity/);
assert.match(previewMigration, /o\.id = p_output_identity/);
assert.match(publicPreview, /outputIdentity/);
assert.match(publicPreview, /p_output_identity/);
assert.match(publicPreview, /GeneratedWebsitePreview/);
assert.match(app, /\/preview\/:token\/:outputIdentity/);

console.log('websiteCreationArtifact.test.mjs: PASS');
