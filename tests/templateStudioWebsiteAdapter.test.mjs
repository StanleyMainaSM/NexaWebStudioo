import assert from 'node:assert/strict';
import {
  adaptTemplateStudioTemplateToWebsiteSpecification,
  selectAvelixaTemplateForTemplateStudio,
} from '../src/templateStudio/lib/website-spec-adapter.ts';

const templates = [
  {
    id: 'modern', slug: 'modern-business', name: 'Modern Business', description: null,
    categories: ['Business'], visual_style: 'editorial-modern',
    sections: ['hero', 'about', 'services', 'testimonials', 'contact', 'footer'],
    typography: { heading: 'bold-sans', body: 'clean-sans' },
    color_direction: { primary: '#111827', accent: '#7c3aed', surface: '#f8fafc' },
    layout: {}, preview: {}, is_active: true, is_protected: true,
  },
  {
    id: 'creative', slug: 'creative-studio', name: 'Creative Studio', description: null,
    categories: ['Creative'], visual_style: 'creative-bold',
    sections: ['navbar', 'hero', 'about', 'services', 'gallery', 'testimonials', 'finalCta', 'contact', 'footer'],
    typography: { heading: 'display-sans', body: 'geometric-sans' },
    color_direction: { primary: '#0b1020', accent: '#22d3ee', surface: '#111827' },
    layout: {}, preview: {}, is_active: true, is_protected: true,
  },
];

const source = {
  id: 'studio-generated',
  name: 'Technology - Bold Edition',
  industry: 'Technology',
  style: 'Bold',
  theme: {
    primary: '#2563eb',
    secondary: '#eff6ff',
    accent: '#3b82f6',
    background: '#ffffff',
    text: '#09090b',
    fontFamily: '"Outfit", sans-serif',
    borderRadius: '1rem',
  },
  sections: [
    {
      id: 'hero-1', type: 'hero', layoutVariant: 'split', content: {
        headline: 'Innovating Tomorrow',
        subheadline: 'Pioneering technological solutions.',
        primaryCTA: { label: 'Explore Solutions', url: '#' },
        images: [{ src: 'https://example.test/hero.jpg', alt: 'Hero' }],
      },
    },
    {
      id: 'features-1', type: 'features', layoutVariant: 'list', content: {
        headline: 'Core Capabilities',
        items: [{ title: 'Artificial Intelligence', description: 'Automation.' }],
      },
    },
    {
      id: 'gallery-1', type: 'gallery', layoutVariant: 'masonry', content: {
        headline: 'Selected Work',
        items: [{ title: 'One', src: 'https://example.test/one.jpg', alt: 'One' }],
      },
    },
    {
      id: 'pricing-1', type: 'pricing', content: {
        headline: 'Plans',
        items: [{ title: 'Pro', price: '$49', description: 'Teams.' }],
      },
    },
    {
      id: 'testimonials-1', type: 'testimonials', content: {
        headline: 'Partners',
        items: [{ quote: 'Excellent.', author: 'Amina', role: 'Founder' }],
      },
    },
    {
      id: 'cta-1', type: 'cta', content: {
        headline: 'Start a project', subheadline: 'Let us build.', primaryCTA: { label: 'Start', url: '#' },
      },
    },
    { id: 'footer-1', type: 'footer', content: { headline: 'Technology Business' } },
  ],
  createdAt: Date.now(),
};

const selected = selectAvelixaTemplateForTemplateStudio(source, templates);
assert.equal(selected.id, 'creative');

const spec = adaptTemplateStudioTemplateToWebsiteSpecification(source, selected, 'Business Website', true);
assert.deepEqual(spec.sections, ['hero', 'services', 'gallery', 'testimonials', 'finalCta', 'footer']);
assert.equal(spec.content.hero.title, 'Innovating Tomorrow');
assert.equal(spec.content.hero.subtitle, 'Pioneering technological solutions.');
assert.equal(spec.content.services.items[0].title, 'Artificial Intelligence');
assert.equal(spec.content.gallery.images[0], 'https://example.test/one.jpg');
assert.equal(spec.content.testimonials.items[0].author, 'Amina — Founder');
assert.equal(spec.content.finalCta.title, 'Start a project');
assert.equal(spec.business.imagery[0], 'https://example.test/hero.jpg');
assert.equal(spec.theme.primary, source.theme.primary);
assert.equal(spec.theme.accent, source.theme.accent);
assert.equal(spec.attribution.enabled, true);
assert.equal(spec.template.id, selected.id);

console.log('templateStudioWebsiteAdapter.test.mjs: PASS');
