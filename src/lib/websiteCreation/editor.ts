import type { WebsiteSectionId, WebsiteSpecification } from './types';

export type WebsiteSpecificationPatch =
  | { kind: 'hero_text'; field: 'title' | 'subtitle' | 'cta'; value: string }
  | { kind: 'theme_color'; field: 'primary' | 'secondary' | 'accent' | 'surface'; value: string }
  | { kind: 'section_visibility'; section: WebsiteSectionId; visible: boolean }
  | { kind: 'section_order'; sections: WebsiteSectionId[] };

const unique = <T,>(values: T[]) => values.filter((value, index) => values.indexOf(value) === index);
const structuralSections = new Set<WebsiteSectionId>(['navbar', 'hero', 'footer']);
const navigationLabels: Record<WebsiteSectionId, string> = { navbar: 'Home', hero: 'Home', about: 'About', services: 'Services', products: 'Products', gallery: 'Gallery', testimonials: 'Testimonials', pricing: 'Pricing', faq: 'FAQ', contact: 'Contact', location: 'Location', footer: 'Contact' };

function syncNavigation(spec: WebsiteSpecification, sections: WebsiteSectionId[]) {
  const existing = new Map(spec.navigation.map((item) => [item.section, item.label]));
  return {
    ...spec,
    sections,
    navigation: sections.filter((section) => !structuralSections.has(section)).map((section) => ({ label: existing.get(section) || navigationLabels[section], section })),
  };
}

export function updateWebsiteBusinessField<K extends keyof WebsiteSpecification['business']>(spec: WebsiteSpecification, field: K, value: WebsiteSpecification['business'][K]): WebsiteSpecification {
  return { ...spec, business: { ...spec.business, [field]: value } };
}

export function updateWebsiteNavigationItem(spec: WebsiteSpecification, section: WebsiteSectionId, value: { label: string; section: WebsiteSectionId }): WebsiteSpecification {
  if (!spec.sections.includes(section) || structuralSections.has(section) || !spec.sections.includes(value.section)) return spec;
  return { ...spec, navigation: spec.navigation.map((item) => item.section === section ? { label: value.label.trim() || navigationLabels[value.section], section: value.section } : item) };
}

export function updateWebsiteSectionContent(spec: WebsiteSpecification, section: WebsiteSectionId, field: string, value: unknown): WebsiteSpecification {
  if (!spec.sections.includes(section)) return spec;
  return { ...spec, content: { ...spec.content, [section]: { ...((spec.content[section] || {}) as Record<string, unknown>), [field]: value } } };
}

function defaultSectionContent(section: WebsiteSectionId, spec: WebsiteSpecification): Record<string, unknown> {
  const name = spec.business.businessName || 'Your business';
  const description = spec.business.businessDescription || `Discover what ${name} offers.`;
  switch (section) {
    case 'navbar': return {};
    case 'hero': return { eyebrow: spec.business.industry || '', title: name, subtitle: description, cta: 'Get in touch' };
    case 'about': return { title: `About ${name}`, body: description };
    case 'services': return { items: spec.business.services?.length ? spec.business.services : ['Professional service', 'Customer support', 'Tailored solutions'] };
    case 'products': return { items: spec.business.products?.length ? spec.business.products : ['Featured product'] };
    case 'gallery': return { images: spec.business.imagery || [] };
    case 'testimonials': return { items: [{ quote: 'A trusted local business experience.', author: 'Customer' }] };
    case 'pricing': return { items: [] };
    case 'faq': return { items: [{ question: 'How can I get started?', answer: 'Contact the business using the details below.' }] };
    case 'contact': return { phone: spec.business.phone || '', email: spec.business.email || '', whatsapp: spec.business.whatsapp || '' };
    case 'location': return { address: spec.business.location || '' };
    case 'footer': return { businessName: name };
  }
}

export function addWebsiteSection(spec: WebsiteSpecification, section: WebsiteSectionId): WebsiteSpecification {
  if (spec.sections.includes(section)) return spec;
  const sections = [...spec.sections.filter((item) => item !== 'footer'), section, ...spec.sections.filter((item) => item === 'footer')];
  return syncNavigation({ ...spec, content: { ...spec.content, [section]: defaultSectionContent(section, spec) } }, sections);
}

export function removeWebsiteSection(spec: WebsiteSpecification, section: WebsiteSectionId): WebsiteSpecification {
  if (structuralSections.has(section) || !spec.sections.includes(section)) return spec;
  const content = { ...spec.content };
  delete content[section];
  return syncNavigation({ ...spec, content }, spec.sections.filter((item) => item !== section));
}

export function applyWebsiteSpecificationPatch(spec: WebsiteSpecification, patch: WebsiteSpecificationPatch): WebsiteSpecification {
  switch (patch.kind) {
    case 'hero_text': return updateWebsiteSectionContent(spec, 'hero', patch.field, patch.value);
    case 'theme_color': return { ...spec, theme: { ...spec.theme, [patch.field]: patch.value } };
    case 'section_visibility': return patch.visible ? addWebsiteSection(spec, patch.section) : removeWebsiteSection(spec, patch.section);
    case 'section_order': {
      const allowed = new Set(spec.sections);
      const ordered = unique(patch.sections).filter((section) => allowed.has(section));
      const missing = spec.sections.filter((section) => !ordered.includes(section));
      return syncNavigation(spec, [...ordered, ...missing]);
    }
  }
}

export interface WebsiteSpecificationEditor { apply(spec: WebsiteSpecification, patch: WebsiteSpecificationPatch): WebsiteSpecification; }
export const deterministicWebsiteSpecificationEditor: WebsiteSpecificationEditor = { apply: applyWebsiteSpecificationPatch };
