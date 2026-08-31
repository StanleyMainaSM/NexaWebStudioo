import assert from 'node:assert/strict';
import { applyWebsiteSpecificationPatch } from '../src/lib/websiteCreation/editor.ts';

const base = {
  version: 1,
  template: { id: 't', slug: 'test', name: 'Test', visual_style: 'test' },
  business: { businessName: 'Acme' },
  sections: ['navbar', 'hero', 'services', 'contact', 'footer'],
  theme: { primary: '#111827', secondary: '#ffffff', accent: '#7c3aed', surface: '#ffffff', text: '#111827', muted: '#6b7280', headingFont: 'sans', bodyFont: 'sans' },
  navigation: [{ label: 'Services', section: 'services' }, { label: 'Contact', section: 'contact' }],
  content: { hero: { title: 'Old title', subtitle: 'Old subtitle', cta: 'Start' } },
  attribution: { enabled: true, label: 'Made with Avelixa' },
};

const hero = applyWebsiteSpecificationPatch(base, { kind: 'hero_text', field: 'title', value: 'New title' });
assert.equal(hero.content.hero.title, 'New title');
assert.equal(hero.content.hero.subtitle, 'Old subtitle');

const theme = applyWebsiteSpecificationPatch(hero, { kind: 'theme_color', field: 'accent', value: '#0f766e' });
assert.equal(theme.theme.accent, '#0f766e');

const hidden = applyWebsiteSpecificationPatch(theme, { kind: 'section_visibility', section: 'services', visible: false });
assert.ok(!hidden.sections.includes('services'));
assert.deepEqual(hidden.navigation, [{ label: 'Contact', section: 'contact' }]);

const shown = applyWebsiteSpecificationPatch(hidden, { kind: 'section_visibility', section: 'services', visible: true });
assert.ok(shown.sections.includes('services'));
assert.deepEqual(shown.navigation, [{ label: 'Services', section: 'services' }, { label: 'Contact', section: 'contact' }]);

const ordered = applyWebsiteSpecificationPatch(shown, { kind: 'section_order', sections: ['hero', 'contact'] });
assert.deepEqual(ordered.sections, ['hero', 'contact', 'navbar', 'footer', 'services']);
assert.deepEqual(ordered.navigation, [{ label: 'Contact', section: 'contact' }, { label: 'Services', section: 'services' }]);

console.log('websiteCreationEditor.test.mjs: PASS');
