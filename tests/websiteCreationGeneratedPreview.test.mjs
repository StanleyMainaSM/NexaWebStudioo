import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateWebsiteFromSpecification } from '../src/lib/websiteCreation/generator.ts';

const preview = fs.readFileSync('src/components/websiteCreation/GeneratedWebsitePreview.tsx', 'utf8');
const publicPreview = fs.readFileSync('src/pages/PublicCreationPreview.tsx', 'utf8');
const renderer = fs.readFileSync('src/components/websiteCreation/WebsitePreviewRenderer.tsx', 'utf8');

const template = {
  id: 'template-preview', slug: 'preview-template', name: 'Preview Template', description: 'Preview', categories: ['business'],
  visual_style: 'editorial-modern', sections: ['navbar', 'hero', 'services', 'contact', 'footer'],
  typography: { heading: 'modern-sans', body: 'clean-sans' },
  color_direction: { primary: '#111827', secondary: '#334155', accent: '#7c3aed', surface: '#f8fafc' },
  layout: { container: 'wide' }, preview: {}, is_active: true, is_protected: true,
};
const specification = {
  version: 1,
  template: { id: template.id, slug: template.slug, name: template.name, visual_style: template.visual_style },
  business: { businessName: 'Preview Co', email: 'hello@preview.test' },
  sections: ['navbar', 'hero', 'services', 'contact', 'footer'],
  theme: { primary: '#111827', secondary: '#334155', accent: '#7c3aed', surface: '#f8fafc', text: '#111827', muted: '#64748b', headingFont: 'modern-sans', bodyFont: 'clean-sans' },
  navigation: [{ label: 'Services', section: 'services' }, { label: 'Contact', section: 'contact' }],
  content: {
    hero: { eyebrow: 'Consulting', title: 'Preview Co', subtitle: 'A generated website.', cta: 'Contact us' },
    services: { items: ['Strategy'] },
    contact: { phone: '', email: 'hello@preview.test', whatsapp: '' },
    footer: { businessName: 'Preview Co' },
  },
  attribution: { enabled: true, label: 'Made with Avelixa' },
};

const generated = generateWebsiteFromSpecification(specification, template);
assert.equal(generated.ok, true);
if (generated.ok) {
  assert.equal(generated.artifact.business.businessName, 'Preview Co');
  assert.deepEqual(generated.artifact.sections, specification.sections);
  assert.equal(generated.artifact.content.hero.title, 'Preview Co');
  assert.equal(generated.artifact.content.hero.cta, 'Contact us');
}

assert.match(preview, /WebsitePreviewRenderer/);
assert.match(preview, /Desktop preview/);
assert.match(preview, /Tablet preview/);
assert.match(preview, /Mobile preview/);
assert.match(preview, /aria-pressed/);
assert.match(publicPreview, /generateWebsiteFromSpecification/);
assert.match(publicPreview, /GeneratedWebsitePreview/);
assert.match(renderer, /sectionMap/);

console.log('websiteCreationGeneratedPreview.test.mjs: PASS');
