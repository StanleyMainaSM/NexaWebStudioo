import assert from 'node:assert/strict';
import {
  generateWebsiteFromCreationProject,
  generateWebsiteFromSpecification,
  generateWebsiteSpecification,
  normalizeWebsiteSpecification,
  resolveWebsiteTemplate,
  validateWebsiteSpecification,
} from '../src/lib/websiteCreation/generator.ts';

const template = {
  id: 'template-1',
  slug: 'modern-business',
  name: 'Modern Business',
  description: 'Business template',
  categories: ['business'],
  visual_style: 'editorial-modern',
  sections: ['hero', 'about', 'services', 'contact', 'footer'],
  typography: { heading: 'bold-sans', body: 'clean-sans' },
  color_direction: { primary: '#111827', accent: '#7c3aed', surface: '#f8fafc' },
  layout: { container: 'wide' },
  preview: { label: 'Modern Business', image: 'gradient-business' },
  is_active: true,
  is_protected: true,
};

const business = {
  businessName: '  Acme Group  ',
  industry: 'Consulting',
  businessDescription: '  Practical consulting for growing businesses. ',
  services: [' Strategy ', 'Implementation', ''],
  products: [],
  targetAudience: 'SMEs',
  location: 'Nairobi',
  phone: '0700000000',
  email: 'hello@acme.test',
  whatsapp: '0700000000',
  socialLinks: { instagram: ' https://instagram.test/acme ', facebook: '' },
  logoUrl: '',
  brandColors: { primary: '#101010', accent: '#ff5500' },
  imagery: [],
  websiteType: 'Business website',
  specialRequirements: '',
};

const generated = generateWebsiteSpecification(business, template, ['hero', 'services', 'contact', 'footer'], true);
assert.equal(generated.business.businessName, 'Acme Group');
assert.deepEqual(generated.business.services, ['Strategy', 'Implementation']);
assert.deepEqual(generated.sections, ['hero', 'services', 'contact', 'footer']);
assert.equal(generated.content.hero.title, 'Acme Group');
assert.equal(generated.content.services.items[0], 'Strategy');

const result = generateWebsiteFromSpecification(generated, template);
assert.equal(result.ok, true);
if (result.ok) {
  assert.equal(result.artifact.template.id, template.id);
  assert.equal(result.artifact.business.businessName, 'Acme Group');
  assert.deepEqual(result.artifact.sections, ['hero', 'services', 'contact', 'footer']);
  assert.deepEqual(result.artifact.navigation, [
    { label: 'Services', section: 'services' },
    { label: 'Contact', section: 'contact' },
  ]);
}

const twice = generateWebsiteFromSpecification(generated, template);
assert.deepEqual(twice, result);

const invalid = { ...generated, sections: ['hero', 'hero', 'footer'] };
const invalidResult = generateWebsiteFromSpecification(invalid, template);
assert.equal(invalidResult.ok, false);
if (!invalidResult.ok) assert.equal(invalidResult.code, 'validation');

const missingTemplate = resolveWebsiteTemplate('missing', [template]);
assert.equal(missingTemplate, null);
const inactive = { ...template, is_active: false };
assert.equal(resolveWebsiteTemplate(template.id, [inactive]), null);

const unsupported = { ...generated, sections: [...generated.sections, 'pricing'] };
const unsupportedResult = generateWebsiteFromSpecification(unsupported, template);
assert.equal(unsupportedResult.ok, false);
if (!unsupportedResult.ok) assert.equal(unsupportedResult.code, 'validation');

const normalized = normalizeWebsiteSpecification({
  ...generated,
  navigation: [{ label: ' Services ', section: 'services' }, { label: 'Contact', section: 'contact' }],
  attribution: { enabled: true, label: '  ' },
}, template);
assert.deepEqual(normalized.navigation, [
  { label: 'Services', section: 'services' },
  { label: 'Contact', section: 'contact' },
]);
assert.equal(normalized.attribution.label, 'Made with Avelixa');

const projectResult = generateWebsiteFromCreationProject({
  id: 'project-1',
  type: 'website',
  client_id: 'client-1',
  connector_id: null,
  operator_id: null,
  lead_id: null,
  project_id: null,
  business_id: null,
  title: 'Acme Website',
  business_info: generated.business,
  requested_sections: generated.sections,
  selected_template_id: template.id,
  specification: generated,
  attribution_enabled: true,
  status: 'preview',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
}, [template]);
assert.equal(projectResult.ok, true);

const missingSpecification = generateWebsiteFromCreationProject({
  id: 'project-2',
  type: 'website',
  client_id: null,
  connector_id: null,
  operator_id: null,
  lead_id: null,
  project_id: null,
  business_id: null,
  title: 'Empty Website',
  business_info: business,
  requested_sections: [],
  selected_template_id: template.id,
  specification: null,
  attribution_enabled: true,
  status: 'draft',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
}, [template]);
assert.equal(missingSpecification.ok, false);
if (!missingSpecification.ok) assert.equal(missingSpecification.code, 'validation');

console.log('websiteCreationGeneration.test.mjs: PASS');
