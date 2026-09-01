import assert from 'node:assert/strict';
import {
  addWebsiteSection,
  applyWebsiteSpecificationPatch,
  removeWebsiteSection,
  updateWebsiteBusinessField,
  updateWebsiteNavigationItem,
  updateWebsiteSectionContent,
} from '../src/lib/websiteCreation/editor.ts';

const base = {
  version: 1,
  template: { id: 't', slug: 'test', name: 'Test', visual_style: 'editorial-modern' },
  business: { businessName: 'Acme', email: 'hello@acme.test', phone: '0700000000' },
  sections: ['navbar', 'hero', 'services', 'contact', 'footer'],
  theme: { primary: '#111827', secondary: '#ffffff', accent: '#7c3aed', surface: '#ffffff', text: '#111827', muted: '#6b7280', headingFont: 'sans', bodyFont: 'sans' },
  navigation: [{ label: 'Services', section: 'services' }, { label: 'Contact', section: 'contact' }],
  content: {
    hero: { title: 'Old title', subtitle: 'Old subtitle', cta: 'Start' },
    services: { items: ['Design'] },
    contact: { phone: '0700000000', email: 'hello@acme.test', whatsapp: '' },
  },
  attribution: { enabled: true, label: 'Made with Avelixa' },
};

const business = updateWebsiteBusinessField(base, 'businessName', 'Acme Group');
assert.equal(business.business.businessName, 'Acme Group');

const hero = applyWebsiteSpecificationPatch(business, { kind: 'hero_text', field: 'title', value: 'New title' });
assert.equal(hero.content.hero.title, 'New title');
assert.equal(hero.content.hero.subtitle, 'Old subtitle');

const heroCta = updateWebsiteSectionContent(hero, 'hero', 'cta', 'Book a consultation');
assert.equal(heroCta.content.hero.cta, 'Book a consultation');

const services = updateWebsiteSectionContent(heroCta, 'services', 'items', ['Design', 'Development']);
assert.deepEqual(services.content.services.items, ['Design', 'Development']);

const nav = updateWebsiteNavigationItem(services, 'services', { label: 'What we do', section: 'services' });
assert.deepEqual(nav.navigation[0], { label: 'What we do', section: 'services' });

const theme = applyWebsiteSpecificationPatch(nav, { kind: 'theme_color', field: 'accent', value: '#0f766e' });
assert.equal(theme.theme.accent, '#0f766e');

const hidden = applyWebsiteSpecificationPatch(theme, { kind: 'section_visibility', section: 'services', visible: false });
assert.ok(!hidden.sections.includes('services'));
assert.deepEqual(hidden.navigation, [{ label: 'Contact', section: 'contact' }]);

const shown = applyWebsiteSpecificationPatch(hidden, { kind: 'section_visibility', section: 'services', visible: true });
assert.ok(shown.sections.includes('services'));
assert.deepEqual(shown.navigation, [{ label: 'Contact', section: 'contact' }, { label: 'Services', section: 'services' }]);

const ordered = applyWebsiteSpecificationPatch(shown, { kind: 'section_order', sections: ['hero', 'contact'] });
assert.deepEqual(ordered.sections, ['hero', 'contact', 'navbar', 'footer', 'services']);
assert.deepEqual(ordered.navigation, [{ label: 'Contact', section: 'contact' }, { label: 'Services', section: 'services' }]);

const added = addWebsiteSection(ordered, 'faq');
assert.deepEqual(added.sections, ['hero', 'contact', 'navbar', 'services', 'faq', 'footer']);
assert.ok(Array.isArray(added.content.faq.items));
assert.ok(added.navigation.some((item) => item.section === 'faq'));

const removed = removeWebsiteSection(added, 'faq');
assert.ok(!removed.sections.includes('faq'));
assert.ok(!removed.navigation.some((item) => item.section === 'faq'));

console.log('websiteCreationEditor.test.mjs: PASS');
