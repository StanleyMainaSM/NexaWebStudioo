import type { Template, Section } from '../types';
import type { BusinessInformation, WebsiteSectionId, WebsiteSpecification, WebsiteTemplate } from '../../lib/websiteCreation/types';
import { generateWebsiteFromSpecification } from '../../lib/websiteCreation/generator';

const styleAliases: Record<string, string[]> = {
  'creative-bold': ['bold', 'futuristic', 'creative', 'playful'],
  'premium-minimal': ['minimal', 'luxury', 'elegant'],
  'warm-commerce': ['local commerce'],
  'trusted-community': ['community'],
  'editorial-modern': ['modern', 'editorial'],
};

const normalize = (value: string) => value.trim().toLowerCase();

function styleScore(templateStyle: string, sourceStyle: string): number {
  const normalizedTemplate = normalize(templateStyle);
  const normalizedSource = normalize(sourceStyle);
  if (normalizedTemplate === normalizedSource) return 100;
  if (styleAliases[normalizedTemplate]?.some((alias) => normalizedSource.includes(alias))) return 90;
  return 0;
}

function industryScore(template: WebsiteTemplate, industry: string): number {
  const normalizedIndustry = normalize(industry);
  return template.categories.some((category) => normalizedIndustry.includes(normalize(category)) || normalize(category).includes(normalizedIndustry)) ? 20 : 0;
}

function mappedSectionType(section: Section): WebsiteSectionId | null {
  switch (section.type) {
    case 'hero': return 'hero';
    case 'features': return 'services';
    case 'gallery': return 'gallery';
    case 'pricing': return 'pricing';
    case 'testimonials': return 'testimonials';
    case 'cta': return 'finalCta';
    case 'contact': return 'contact';
    case 'footer': return 'footer';
    default: return null;
  }
}

function mapSectionContent(section: Section, businessName: string, industry: string): Record<string, unknown> {
  const content = section.content || {};
  switch (section.type) {
    case 'hero':
      return {
        eyebrow: industry,
        title: content.headline || businessName,
        subtitle: content.subheadline || content.paragraph || '',
        cta: content.primaryCTA?.label || 'Get in touch',
        secondaryCTA: content.secondaryCTA || null,
      };
    case 'features':
      return {
        headline: content.headline || '',
        subheadline: content.subheadline || '',
        items: Array.isArray(content.items) ? content.items.map((item) => typeof item === 'string' ? { title: item } : item) : [],
      };
    case 'gallery':
      return {
        headline: content.headline || '',
        images: Array.isArray(content.items) ? content.items.map((item) => typeof item === 'string' ? item : item?.src).filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [],
      };
    case 'pricing':
      return {
        headline: content.headline || '',
        items: Array.isArray(content.items) ? content.items.map((item) => typeof item === 'string' ? { name: item } : { name: item?.title || item?.name, price: item?.price, description: item?.description }) : [],
      };
    case 'testimonials':
      return {
        headline: content.headline || '',
        items: Array.isArray(content.items) ? content.items.map((item) => typeof item === 'string' ? { quote: item } : { quote: item?.quote || '', author: item?.role ? [item?.author, item.role].filter(Boolean).join(' — ') : item?.author || '' }) : [],
      };
    case 'cta':
      return { title: content.headline || 'Ready to get started?', body: content.subheadline || content.paragraph || '', cta: content.primaryCTA?.label || 'Get started' };
    case 'contact':
      return { phone: '', email: '', whatsapp: '' };
    case 'footer':
      return { businessName };
    default:
      return {};
  }
}

export function selectAvelixaTemplateForTemplateStudio(source: Template, templates: readonly WebsiteTemplate[]): WebsiteTemplate {
  const active = templates.filter((template) => template.is_active);
  const selected = [...active].sort((a, b) => {
    const score = (template: WebsiteTemplate) => styleScore(template.visual_style, source.style) * 100 + industryScore(template, source.industry) * 10 + source.sections.filter((section) => {
      const mapped = mappedSectionType(section);
      return Boolean(mapped && template.sections.includes(mapped));
    }).length;
    return score(b) - score(a) || a.name.localeCompare(b.name);
  })[0];
  if (!selected) throw new Error('No active Avelixa website templates are currently available.');
  return selected;
}

export function adaptTemplateStudioTemplateToWebsiteSpecification(
  source: Template,
  targetTemplate: WebsiteTemplate,
  websiteType: string,
  attributionEnabled = true,
): WebsiteSpecification {
  const businessName = ${source.industry || 'Business'} Business;
  const business: BusinessInformation = {
    businessName,
    industry: source.industry,
    businessDescription: source.sections.find((section) => section.type === 'hero')?.content.subheadline || '',
    websiteType,
    services: [],
    products: [],
    imagery: [],
  };

  const sections: WebsiteSectionId[] = [];
  const content: Record<string, unknown> = {};
  for (const sourceSection of source.sections) {
    const targetSection = mappedSectionType(sourceSection);
    if (!targetSection || !targetTemplate.sections.includes(targetSection) || sections.includes(targetSection)) continue;
    sections.push(targetSection);
    content[targetSection] = mapSectionContent(sourceSection, businessName, source.industry);
    if (targetSection === 'hero') {
      const heroImages = sourceSection.content.images?.map((image) => image.src).filter(Boolean) || [];
      business.imagery = heroImages.length ? heroImages : business.imagery;
    }
    if (targetSection === 'gallery') {
      const galleryImages = sourceSection.content.items?.map((item: any) => item?.src).filter((value): value is string => typeof value === 'string' && Boolean(value.trim())) || [];
      business.imagery = [...(business.imagery || []), ...galleryImages];
    }
  }

  if (!sections.includes('hero')) throw new Error('The Template Studio result does not contain a supported hero section.');
  if (!sections.includes('footer') && targetTemplate.sections.includes('footer')) {
    sections.push('footer');
    content.footer = { businessName };
  }

  const theme = {
    primary: source.theme.primary,
    secondary: source.theme.secondary,
    accent: source.theme.accent,
    surface: source.theme.background,
    text: source.theme.text,
    muted: source.theme.secondary,
    headingFont: source.theme.fontFamily,
    bodyFont: source.theme.fontFamily,
  };
  const specification: WebsiteSpecification = {
    version: 1,
    template: { id: targetTemplate.id, slug: targetTemplate.slug, name: targetTemplate.name, visual_style: targetTemplate.visual_style },
    business,
    sections,
    theme,
    navigation: sections.filter((section) => !['hero', 'footer'].includes(section)).map((section) => ({ label: section.charAt(0).toUpperCase() + section.slice(1), section })),
    content,
    attribution: { enabled: attributionEnabled, label: 'Made with Avelixa' },
  };
  const result = generateWebsiteFromSpecification(specification, targetTemplate);
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.artifact;
}
