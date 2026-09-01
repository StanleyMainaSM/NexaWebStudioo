import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createWebsiteOutputIdentity,
  createWebsiteOutputVersion,
  generateWebsiteFromCreationProject,
  generateWebsiteOutputFromCreationProject,
  generateWebsiteOutputFromSpecification,
} from '../src/lib/websiteCreation/generator.ts';

const template = {
  id: 'template-output',
  slug: 'output-template',
  name: 'Output Template',
  description: 'Output test template',
  categories: ['business'],
  visual_style: 'editorial-modern',
  sections: ['navbar', 'hero', 'services', 'gallery', 'contact', 'location', 'footer'],
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
  business: { businessName: 'Output Co', email: 'hello@output.test' },
  sections: ['navbar', 'hero', 'services', 'gallery', 'contact', 'location', 'footer'],
  theme: { primary: '#111827', secondary: '#334155', accent: '#7c3aed', surface: '#f8fafc', text: '#111827', muted: '#64748b', headingFont: 'modern-sans', bodyFont: 'clean-sans' },
  navigation: [
    { label: 'Services', section: 'services' },
    { label: 'Gallery', section: 'gallery' },
    { label: 'Contact', section: 'contact' },
    { label: 'Location', section: 'location' },
  ],
  content: {
    hero: { title: 'Output Co', subtitle: 'A generated output.' },
    services: { items: ['Consulting'] },
    gallery: { images: [] },
    contact: { phone: '', email: 'hello@output.test', whatsapp: '' },
    location: { address: '' },
    footer: { businessName: 'Output Co' },
  },
  attribution: { enabled: true, label: 'Made with Avelixa' },
};

const generated = generateWebsiteOutputFromSpecification(specification, template, 'creation-1', '2026-09-01T10:00:00.000Z', '/preview/token-1');
assert.equal(generated.ok, true);
if (generated.ok) {
  assert.equal(generated.output.creationProjectId, 'creation-1');
  assert.equal(generated.output.status, 'generated');
  assert.equal(generated.output.generatedAt, '2026-09-01T10:00:00.000Z');
  assert.equal(generated.output.previewPath, '/preview/token-1');
  assert.equal(generated.output.specification.business.businessName, 'Output Co');
  assert.equal(generated.output.template.id, template.id);
  assert.equal(generated.output.outputVersion, createWebsiteOutputVersion(generated.output.specification));
  assert.equal(generated.output.id, createWebsiteOutputIdentity('creation-1', generated.output.specification));
}

const repeat = generateWebsiteOutputFromSpecification(specification, template, 'creation-1', '2026-09-02T10:00:00.000Z', '/preview/token-1');
assert.equal(repeat.ok, true);
if (generated.ok && repeat.ok) {
  assert.equal(repeat.output.id, generated.output.id);
  assert.equal(repeat.output.outputVersion, generated.output.outputVersion);
  assert.deepEqual(repeat.output.specification, generated.output.specification);
}

const changed = { ...specification, content: { ...specification.content, hero: { title: 'Changed Output', subtitle: 'Updated output.' } } };
const changedResult = generateWebsiteOutputFromSpecification(changed, template, 'creation-1', '2026-09-01T10:00:00.000Z');
assert.equal(changedResult.ok, true);
if (generated.ok && changedResult.ok) {
  assert.notEqual(changedResult.output.id, generated.output.id);
  assert.notEqual(changedResult.output.outputVersion, generated.output.outputVersion);
  assert.equal(changedResult.output.specification.content.hero.title, 'Changed Output');
}

const invalid = { ...specification, sections: ['hero', 'hero', 'footer'] };
const invalidResult = generateWebsiteOutputFromSpecification(invalid, template, 'creation-1');
assert.equal(invalidResult.ok, false);
if (!invalidResult.ok) assert.equal(invalidResult.code, 'validation');

const project = {
  id: 'creation-1', type: 'website', client_id: 'client-1', connector_id: null, operator_id: null,
  lead_id: null, project_id: null, business_id: null, title: 'Output Website', business_info: specification.business,
  requested_sections: specification.sections, selected_template_id: template.id, specification,
  attribution_enabled: true, public_preview_token: 'public-token', preview_enabled: true, status: 'preview',
  created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
};
const projectOutput = generateWebsiteOutputFromCreationProject(project, [template], '2026-09-01T11:00:00.000Z');
assert.equal(projectOutput.ok, true);
if (projectOutput.ok) {
  assert.equal(projectOutput.output.creationProjectId, project.id);
  assert.equal(projectOutput.output.previewPath, '/preview/public-token');
  assert.equal(projectOutput.output.status, 'generated');
}

const noPublicPreview = generateWebsiteOutputFromCreationProject({ ...project, preview_enabled: false }, [template], '2026-09-01T11:00:00.000Z');
assert.equal(noPublicPreview.ok, true);
if (noPublicPreview.ok) assert.equal(noPublicPreview.output.previewPath, null);

const missingProjectId = generateWebsiteOutputFromSpecification(specification, template, '');
assert.equal(missingProjectId.ok, false);
if (!missingProjectId.ok) assert.equal(missingProjectId.code, 'validation');

const missingTemplate = generateWebsiteOutputFromCreationProject({ ...project, selected_template_id: 'missing' }, [template]);
assert.equal(missingTemplate.ok, false);
if (!missingTemplate.ok) assert.equal(missingTemplate.code, 'template');

const missingSpecification = generateWebsiteOutputFromCreationProject({ ...project, specification: null }, [template]);
assert.equal(missingSpecification.ok, false);
if (!missingSpecification.ok) assert.equal(missingSpecification.code, 'validation');

const source = fs.readFileSync('src/components/websiteCreation/WebsitePreviewRenderer.tsx', 'utf8');
const publicPreview = fs.readFileSync('src/pages/PublicCreationPreview.tsx', 'utf8');
assert.match(source, /WebsiteSpecification/);
assert.match(publicPreview, /generateWebsiteFromSpecification/);
assert.match(publicPreview, /GeneratedWebsitePreview/);
assert.doesNotMatch(publicPreview, /WebsiteGenerationOutput/);

const projectGeneration = generateWebsiteFromCreationProject(project, [template]);
assert.equal(projectGeneration.ok, true);
if (projectGeneration.ok && projectOutput.ok) assert.deepEqual(projectOutput.output.specification, projectGeneration.artifact);

console.log('websiteCreationOutput.test.mjs: PASS');
