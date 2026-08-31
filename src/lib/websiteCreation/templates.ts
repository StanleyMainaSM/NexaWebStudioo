import type { WebsiteSectionId, WebsiteTemplate } from './types';

export const DEFAULT_TEMPLATE_SECTIONS: Record<string, WebsiteSectionId[]> = {
  'modern-business': ['navbar', 'hero', 'about', 'services', 'testimonials', 'contact', 'footer'],
  'premium-minimal': ['navbar', 'hero', 'about', 'services', 'gallery', 'contact', 'footer'],
  'local-commerce': ['navbar', 'hero', 'products', 'services', 'gallery', 'location', 'contact', 'footer'],
  'creative-studio': ['navbar', 'hero', 'about', 'services', 'gallery', 'testimonials', 'contact', 'footer'],
  'trusted-community': ['navbar', 'hero', 'about', 'services', 'testimonials', 'faq', 'location', 'contact', 'footer'],
};

export const templateSections = (template: WebsiteTemplate, requested: WebsiteSectionId[]): WebsiteSectionId[] => {
  const allowed = new Set(template.sections);
  const selected = requested.filter((section, index, list) => allowed.has(section) && list.indexOf(section) === index);
  return selected.length ? selected : template.sections;
};
