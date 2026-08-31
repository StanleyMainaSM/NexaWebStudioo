import type { BusinessInformation, WebsiteSectionId, WebsiteSpecification, WebsiteTemplate, WebsiteTheme } from './types';
import { templateSections } from './templates.ts';

const clean = (value?: string) => value?.trim() || '';
const list = (values?: string[]) => (values || []).map((value) => value.trim()).filter(Boolean);

export function validateBusinessInformation(business: BusinessInformation): string[] {
  const errors: string[] = [];
  if (!clean(business.businessName)) errors.push('Business name is required.');
  if (business.email && !/^\S+@\S+\.\S+$/.test(business.email.trim())) errors.push('Email address is invalid.');
  return errors;
}

function themeFor(template: WebsiteTemplate, business: BusinessInformation): WebsiteTheme {
  const colors = business.brandColors || {};
  const direction = template.color_direction || {};
  return {
    primary: colors.primary || direction.primary || '#111827',
    secondary: colors.secondary || direction.secondary || '#334155',
    accent: colors.accent || direction.accent || '#7c3aed',
    surface: colors.surface || direction.surface || '#f8fafc',
    text: '#111827',
    muted: '#64748b',
    headingFont: template.typography?.heading || 'modern-sans',
    bodyFont: template.typography?.body || 'clean-sans',
  };
}

const navigationLabel: Record<WebsiteSectionId, string> = {
  navbar: 'Home', hero: 'Home', about: 'About', services: 'Services', products: 'Products',
  gallery: 'Gallery', testimonials: 'Testimonials', pricing: 'Pricing', faq: 'FAQ',
  contact: 'Contact', location: 'Location', footer: 'Contact',
};

export function generateWebsiteSpecification(
  business: BusinessInformation,
  template: WebsiteTemplate,
  requestedSections: WebsiteSectionId[] = [],
  attributionEnabled = true,
): WebsiteSpecification {
  const errors = validateBusinessInformation(business);
  if (errors.length) throw new Error(errors.join(' '));

  const sections = templateSections(template, requestedSections);
  const name = clean(business.businessName);
  const services = list(business.services);
  const products = list(business.products);
  const description = clean(business.businessDescription) || `${name} delivers quality ${clean(business.industry) || 'services'} for customers in ${clean(business.location) || 'your community'}.`;

  return {
    version: 1,
    template: { id: template.id, slug: template.slug, name: template.name, visual_style: template.visual_style },
    business: {
      ...business,
      businessName: name,
      industry: clean(business.industry),
      businessDescription: description,
      services,
      products,
      targetAudience: clean(business.targetAudience),
      location: clean(business.location),
      phone: clean(business.phone),
      email: clean(business.email),
      whatsapp: clean(business.whatsapp),
      specialRequirements: clean(business.specialRequirements),
    },
    sections,
    theme: themeFor(template, business),
    navigation: sections.filter((section) => !['navbar', 'footer', 'hero'].includes(section)).map((section) => ({ label: navigationLabel[section], section })),
    content: {
      hero: { eyebrow: clean(business.industry), title: name, subtitle: description, cta: 'Get in touch' },
      about: { title: `About ${name}`, body: description },
      services: { items: services.length ? services : ['Professional service', 'Customer support', 'Tailored solutions'] },
      products: { items: products.length ? products : ['Featured product'] },
      gallery: { images: business.imagery || [] },
      testimonials: { items: [{ quote: 'A trusted local business experience.', author: 'Customer' }] },
      pricing: { items: [] },
      faq: { items: [{ question: 'How can I get started?', answer: 'Contact the business using the details below.' }] },
      contact: { phone: business.phone || '', email: business.email || '', whatsapp: business.whatsapp || '' },
      location: { address: business.location || '' },
      footer: { businessName: name },
    },
    attribution: { enabled: attributionEnabled, label: 'Made with Avelixa' },
  };
}

export interface WebsiteGenerationAdapter {
  generate(input: Parameters<typeof generateWebsiteSpecification>): WebsiteSpecification | Promise<WebsiteSpecification>;
}

export const deterministicWebsiteGenerationAdapter: WebsiteGenerationAdapter = {
  generate: ([business, template, requestedSections, attributionEnabled]) =>
    generateWebsiteSpecification(business, template, requestedSections, attributionEnabled),
};
