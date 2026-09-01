import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createWebsiteOutputIdentity,
  createWebsiteOutputVersion,
  generateWebsiteFromSpecification,
  generateWebsiteOutputFromSpecification,
} from '../src/lib/websiteCreation/generator.ts';
import {
  getWebsiteGenerationLifecycleState,
  lifecycleStateLabel,
} from '../src/lib/websiteCreation/lifecycle.ts';

const template = {
  id: 'template-lifecycle',
  slug: 'lifecycle-template',
  name: 'Lifecycle Template',
  description: 'Lifecycle test template',
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

const secondTemplate = { ...template, id: 'template-lifecycle-2', slug: 'lifecycle-template-2', name: 'Lifecycle Template 2' };

const specification = {
  version: 1,
  template: { id: template.id, slug: template.slug, name: template.name, visual_style: template.visual_style },
  business: { businessName: 'Lifecycle Co', email: 'hello@lifecycle.test' },
  sections: ['navbar', 'hero', 'services', 'contact', 'footer'],
  theme: { primary: '#111827', secondary: '#334155', accent: '#7c3aed', surface: '#f8fafc', text: '#111827', muted: '#64748b', headingFont: 'modern-sans', bodyFont: 'clean-sans' },
  navigation: [
    { label: 'Services', section: 'services' },
    { label: 'Contact', section: 'contact' },
  ],
  content: {
    hero: { title: 'Lifecycle Co', subtitle: 'Current specification.' },
    services: { items: ['Consulting'] },
    contact: { phone: '', email: 'hello@lifecycle.test', whatsapp: '' },
    footer: { businessName: 'Lifecycle Co' },
  },
  attribution: { enabled: true, label: 'Made with Avelixa' },
};

const projectId = 'creation-lifecycle-1';
const generated = generateWebsiteOutputFromSpecification(specification, template, projectId, '2026-09-01T12:00:00.000Z');
assert.equal(generated.ok, true);
if (!generated.ok) throw new Error('Expected lifecycle fixture generation to succeed.');

const metadata = {
  latest_generated_output_identity: generated.output.id,
  latest_generated_output_version: generated.output.outputVersion,
  latest_generated_at: generated.output.generatedAt,
  generation_state: 'current',
  last_generation_error: null,
};

assert.equal(getWebsiteGenerationLifecycleState(null, projectId, template, null), 'never_generated');
assert.equal(getWebsiteGenerationLifecycleState(specification, projectId, template, null), 'never_generated');
assert.equal(getWebsiteGenerationLifecycleState(specification, projectId, template, metadata), 'current');
assert.equal(lifecycleStateLabel('current'), 'Current');

const changedSpecification = {
  ...specification,
  content: { ...specification.content, hero: { title: 'Changed Lifecycle Co', subtitle: 'Changed specification.' } },
};
assert.equal(getWebsiteGenerationLifecycleState(changedSpecification, projectId, template, metadata), 'needs_regeneration');

const changedOutput = generateWebsiteOutputFromSpecification(changedSpecification, template, projectId, '2026-09-01T13:00:00.000Z');
assert.equal(changedOutput.ok, true);
if (changedOutput.ok) {
  assert.notEqual(changedOutput.output.id, generated.output.id);
  assert.notEqual(changedOutput.output.outputVersion, generated.output.outputVersion);
}

const failedMetadata = { ...metadata, generation_state: 'generation_failed', last_generation_error: 'Generation failed safely.' };
assert.equal(getWebsiteGenerationLifecycleState(specification, projectId, template, failedMetadata), 'generation_failed');
assert.equal(getWebsiteGenerationLifecycleState(changedSpecification, projectId, template, failedMetadata), 'needs_regeneration');
assert.equal(failedMetadata.latest_generated_output_identity, generated.output.id);
assert.equal(failedMetadata.latest_generated_output_version, generated.output.outputVersion);

assert.equal(getWebsiteGenerationLifecycleState(specification, projectId, secondTemplate, metadata), 'needs_regeneration');

const reconstructedMetadata = JSON.parse(JSON.stringify(metadata));
assert.equal(getWebsiteGenerationLifecycleState(specification, projectId, template, reconstructedMetadata), 'current');

const repeat = generateWebsiteOutputFromSpecification(specification, template, projectId, '2026-09-02T12:00:00.000Z');
assert.equal(repeat.ok, true);
if (repeat.ok) {
  assert.equal(repeat.output.id, createWebsiteOutputIdentity(projectId, repeat.output.specification));
  assert.equal(repeat.output.outputVersion, createWebsiteOutputVersion(repeat.output.specification));
  assert.equal(repeat.output.id, generated.output.id);
}

const invalid = { ...specification, sections: ['hero', 'hero', 'footer'] };
const invalidGeneration = generateWebsiteFromSpecification(invalid, template);
assert.equal(invalidGeneration.ok, false);
assert.equal(getWebsiteGenerationLifecycleState(invalid, projectId, template, metadata), 'needs_regeneration');

const studio = fs.readFileSync('src/pages/WebsiteCreationStudio.tsx', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260901110000_website_creation_generated_lifecycle.sql', 'utf8');
const types = fs.readFileSync('src/lib/websiteCreation/types.ts', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

assert.match(studio, /consume_creation_generation/);
assert.match(studio, /p_output_identity/);
assert.match(studio, /p_output_version/);
assert.match(studio, /p_generated_at/);
assert.match(studio, /mark_creation_generation_failed/);
assert.match(studio, /getWebsiteGenerationLifecycleState/);
assert.match(studio, /WebsitePreviewRenderer/);
assert.doesNotMatch(studio, /GeneratedWebsiteRenderer/);
assert.match(migration, /latest_generated_output_identity/);
assert.match(migration, /latest_generated_output_version/);
assert.match(migration, /latest_generated_at/);
assert.match(migration, /generation_state/);
assert.match(migration, /mark_creation_generation_failed/);
assert.match(migration, /Creation generation access denied/);
assert.match(migration, /creation_operator_access/);
assert.match(types, /latest_generated_output_identity/);
assert.match(types, /latest_generated_output_version/);
assert.match(types, /latest_generated_at/);
assert.equal(packageJson.scripts['test:website-creation-lifecycle'], 'node --experimental-strip-types tests/websiteCreationLifecycle.test.mjs');

console.log('websiteCreationLifecycle.test.mjs: PASS');
