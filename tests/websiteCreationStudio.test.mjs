import assert from 'node:assert/strict';
import { addWebsiteSection, applyWebsiteSpecificationPatch, updateWebsiteBusinessField, updateWebsiteSectionContent } from '../src/lib/websiteCreation/editor.ts';

const spec = {
  version: 1,
  template: { id: 't', slug: 'test', name: 'Studio', visual_style: 'editorial-modern' },
  business: { businessName: 'Studio Co', email: 'hello@studio.test' },
  sections: ['navbar', 'hero', 'about', 'services', 'contact', 'footer'],
  theme: { primary: '#111827', secondary: '#334155', accent: '#7c3aed', surface: '#fff', text: '#111827', muted: '#64748b', headingFont: 'modern-sans', bodyFont: 'clean-sans' },
  navigation: [{ label: 'About', section: 'about' }, { label: 'Services', section: 'services' }, { label: 'Contact', section: 'contact' }],
  content: {
    hero: { eyebrow: 'Design', title: 'Studio Co', subtitle: 'A studio for modern brands.', cta: 'Contact us' },
    about: { title: 'About Studio Co', body: 'About text' },
    services: { items: ['Branding'] },
    contact: { phone: '', email: 'hello@studio.test', whatsapp: '' },
  },
  attribution: { enabled: true, label: 'Made with Avelixa' },
};

const identity = updateWebsiteBusinessField(spec, 'businessName', 'Studio Co Kenya');
assert.equal(identity.business.businessName, 'Studio Co Kenya');

const hero = updateWebsiteSectionContent(identity, 'hero', 'subtitle', 'A new supporting message.');
assert.equal(hero.content.hero.subtitle, 'A new supporting message.');

const reordered = applyWebsiteSpecificationPatch(hero, { kind: 'section_order', sections: ['hero', 'services', 'about'] });
assert.deepEqual(reordered.sections, ['hero', 'services', 'about', 'navbar', 'contact', 'footer']);
assert.deepEqual(reordered.navigation.map((item) => item.section), ['services', 'about', 'contact']);

const added = addWebsiteSection(reordered, 'faq');
assert.ok(added.sections.includes('faq'));
assert.ok(added.content.faq);
assert.ok(added.navigation.some((item) => item.section === 'faq'));

console.log('websiteCreationStudio.test.mjs: PASS');
