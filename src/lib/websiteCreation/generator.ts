import type { BusinessInformation, CreationProject, WebsiteGenerationOutput, WebsiteSectionId, WebsiteSpecification, WebsiteTemplate, WebsiteTheme } from './types.ts';
import { WEBSITE_SECTIONS } from './types.ts';
import { templateSections } from './templates.ts';

const clean = (value?: string | null) => value?.trim() || '';
const list = (values?: string[]) => (values || []).map((value) => value.trim()).filter(Boolean);
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export type WebsiteGenerationFailureCode = 'validation' | 'template' | 'generation' | 'rendering';
export interface WebsiteGenerationSuccess { ok: true; artifact: WebsiteSpecification; template: WebsiteTemplate; }
export interface WebsiteGenerationFailure { ok: false; code: WebsiteGenerationFailureCode; errors: string[]; }
export type WebsiteGenerationResult = WebsiteGenerationSuccess | WebsiteGenerationFailure;
export interface WebsiteOutputGenerationSuccess { ok: true; output: WebsiteGenerationOutput; }
export interface WebsiteOutputGenerationFailure { ok: false; code: WebsiteGenerationFailureCode; errors: string[]; }
export type WebsiteOutputGenerationResult = WebsiteOutputGenerationSuccess | WebsiteOutputGenerationFailure;

export function validateBusinessInformation(business: BusinessInformation): string[] {
  const errors: string[] = [];
  if (!business || !isRecord(business)) return ['Business information is required.'];
  if (!clean(business.businessName)) errors.push('Business name is required.');
  if (business.email && !/^\S+@\S+\.\S+$/.test(business.email.trim())) errors.push('Email address is invalid.');
  return errors;
}
function isWebsiteSectionId(value: unknown): value is WebsiteSectionId { return typeof value === 'string' && (WEBSITE_SECTIONS as readonly string[]).includes(value); }
function validThemeValue(value: unknown, field: string, errors: string[]) { if (typeof value !== 'string' || !value.trim()) errors.push(`Theme ${field} is invalid.`); }

export function validateWebsiteSpecification(specification: WebsiteSpecification, template?: WebsiteTemplate | null): string[] {
  const errors: string[] = [];
  if (!specification || !isRecord(specification)) return ['Website specification is required.'];
  if (specification.version !== 1) errors.push('Unsupported WebsiteSpecification version.');
  errors.push(...validateBusinessInformation(specification.business));
  if (!isRecord(specification.template) || !clean(specification.template.id) || !clean(specification.template.slug)) errors.push('Website template reference is invalid.');
  if (!Array.isArray(specification.sections) || specification.sections.length === 0) errors.push('Website sections are required.');
  else { const seen = new Set<string>(); for (const section of specification.sections) { if (!isWebsiteSectionId(section)) errors.push(`Unsupported website section: ${String(section)}.`); else if (seen.has(section)) errors.push(`Duplicate website section: ${section}.`); else seen.add(section); } }
  if (!Array.isArray(specification.navigation)) errors.push('Website navigation is invalid.');
  else { const seen = new Set<string>(); for (const item of specification.navigation) { if (!isRecord(item) || !clean(String(item.label || '')) || !isWebsiteSectionId(item.section)) { errors.push('Website navigation contains an invalid item.'); continue; } if (!specification.sections.includes(item.section)) errors.push(`Navigation target is not enabled: ${item.section}.`); if (seen.has(item.section)) errors.push(`Duplicate navigation target: ${item.section}.`); seen.add(item.section); } }
  if (!isRecord(specification.theme)) errors.push('Website theme is invalid.');
  else for (const field of ['primary', 'secondary', 'accent', 'surface', 'text', 'muted', 'headingFont', 'bodyFont']) validThemeValue(specification.theme[field as keyof WebsiteTheme], field, errors);
  if (!isRecord(specification.content)) errors.push('Website content is invalid.');
  else for (const key of Object.keys(specification.content)) if (!isWebsiteSectionId(key)) errors.push(`Unsupported website content section: ${key}.`);
  if (!isRecord(specification.attribution) || typeof specification.attribution.enabled !== 'boolean') errors.push('Website attribution configuration is invalid.');
  if (template) { if (specification.template.id !== template.id || specification.template.slug !== template.slug) errors.push('Website specification template does not match the selected template.'); const allowed = new Set(template.sections); for (const section of specification.sections) if (!allowed.has(section)) errors.push(`Section ${section} is not supported by template ${template.slug}.`); }
  return errors;
}

function normalizeBusiness(business: BusinessInformation): BusinessInformation {
  const socialLinks = Object.fromEntries(Object.entries(business.socialLinks || {}).map(([key, value]) => [key.trim(), String(value).trim()] as const).filter(([key, value]) => key && value).sort(([a], [b]) => a.localeCompare(b)));
  return { ...business, businessName: clean(business.businessName), industry: clean(business.industry), businessDescription: clean(business.businessDescription), services: list(business.services), products: list(business.products), targetAudience: clean(business.targetAudience), location: clean(business.location), phone: clean(business.phone), email: clean(business.email), whatsapp: clean(business.whatsapp), socialLinks, logoUrl: clean(business.logoUrl), imagery: list(business.imagery), websiteType: clean(business.websiteType), specialRequirements: clean(business.specialRequirements) };
}
export function normalizeWebsiteSpecification(specification: WebsiteSpecification, template: WebsiteTemplate): WebsiteSpecification {
  const normalized = clone(specification); const sections = [...new Set(normalized.sections)]; const existingLabels = new Map(normalized.navigation.map((item) => [item.section, clean(item.label)])); const structural = new Set<WebsiteSectionId>(['navbar', 'hero', 'footer']);
  normalized.template = { id: template.id, slug: template.slug, name: template.name, visual_style: template.visual_style }; normalized.business = normalizeBusiness(normalized.business); normalized.sections = sections;
  normalized.navigation = sections.filter((section) => !structural.has(section)).map((section) => ({ label: existingLabels.get(section) || section.charAt(0).toUpperCase() + section.slice(1), section }));
  normalized.theme = { primary: clean(normalized.theme.primary), secondary: clean(normalized.theme.secondary), accent: clean(normalized.theme.accent), surface: clean(normalized.theme.surface), text: clean(normalized.theme.text), muted: clean(normalized.theme.muted), headingFont: clean(normalized.theme.headingFont), bodyFont: clean(normalized.theme.bodyFont) };
  normalized.attribution = { enabled: normalized.attribution.enabled, label: clean(normalized.attribution.label) || 'Made with Avelixa' }; return normalized;
}
export function resolveWebsiteTemplate(templateId: string, templates: readonly WebsiteTemplate[]): WebsiteTemplate | null { return templates.find((template) => template.id === templateId && template.is_active) || null; }
export function generateWebsiteFromSpecification(specification: WebsiteSpecification, template: WebsiteTemplate): WebsiteGenerationResult { const validationErrors = validateWebsiteSpecification(specification, template); if (validationErrors.length) return { ok: false, code: 'validation', errors: validationErrors }; try { return { ok: true, artifact: normalizeWebsiteSpecification(specification, template), template }; } catch { return { ok: false, code: 'generation', errors: ['The website could not be generated from the supplied specification.'] }; } }
export function generateWebsiteFromCreationProject(project: CreationProject, templates: readonly WebsiteTemplate[]): WebsiteGenerationResult { if (!project || !project.id) return { ok: false, code: 'validation', errors: ['Creation project is invalid.'] }; if (!project.specification) return { ok: false, code: 'validation', errors: ['This creation project does not have a saved website specification.'] }; if (!project.selected_template_id) return { ok: false, code: 'template', errors: ['This creation project does not have a selected template.'] }; const template = resolveWebsiteTemplate(project.selected_template_id, templates); if (!template) return { ok: false, code: 'template', errors: ['The selected website template is unavailable.'] }; return generateWebsiteFromSpecification(project.specification, template); }
function canonicalize(value: unknown): unknown { if (Array.isArray(value)) return value.map(canonicalize); if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])); return value; }
function stableSerialize(value: unknown): string { return JSON.stringify(canonicalize(value)); }
function hashString(value: string): string { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(16).padStart(8, '0'); }
export function createWebsiteOutputVersion(specification: WebsiteSpecification): string { return hashString(stableSerialize(specification)); }
export function createWebsiteOutputIdentity(creationProjectId: string, specification: WebsiteSpecification): string { return `website-${hashString(`${creationProjectId}:${stableSerialize(specification)}`)}`; }
export function generateWebsiteOutputFromSpecification(specification: WebsiteSpecification, template: WebsiteTemplate, creationProjectId: string, generatedAt = new Date().toISOString(), previewPath: string | null = null): WebsiteOutputGenerationResult { if (!clean(creationProjectId)) return { ok: false, code: 'validation', errors: ['Creation project is invalid.'] }; const generated = generateWebsiteFromSpecification(specification, template); if (!generated.ok) return generated; const outputVersion = createWebsiteOutputVersion(generated.artifact); return { ok: true, output: { id: createWebsiteOutputIdentity(creationProjectId, generated.artifact), creationProjectId, specification: generated.artifact, template: generated.template, status: 'generated', generatedAt, outputVersion, previewPath } }; }
export function generateWebsiteOutputFromCreationProject(project: CreationProject, templates: readonly WebsiteTemplate[], generatedAt = new Date().toISOString()): WebsiteOutputGenerationResult { if (!project || !clean(project.id)) return { ok: false, code: 'validation', errors: ['Creation project is invalid.'] }; const generated = generateWebsiteFromCreationProject(project, templates); if (!generated.ok) return generated; const previewPath = project.public_preview_token && project.preview_enabled ? `/preview/${encodeURIComponent(project.public_preview_token)}` : null; return generateWebsiteOutputFromSpecification(generated.artifact, generated.template, project.id, generatedAt, previewPath); }
function themeFor(template: WebsiteTemplate, business: BusinessInformation): WebsiteTheme { const colors = business.brandColors || {}; const direction = template.color_direction || {}; return { primary: colors.primary || direction.primary || '#111827', secondary: colors.secondary || direction.secondary || '#334155', accent: colors.accent || direction.accent || '#7c3aed', surface: colors.surface || direction.surface || '#f8fafc', text: '#111827', muted: '#64748b', headingFont: template.typography?.heading || 'modern-sans', bodyFont: template.typography?.body || 'clean-sans' }; }
const navigationLabel: Record<WebsiteSectionId, string> = { navbar: 'Home', hero: 'Home', about: 'About', services: 'Services', products: 'Products', gallery: 'Gallery', testimonials: 'Testimonials', pricing: 'Pricing', faq: 'FAQ', contact: 'Contact', location: 'Location', footer: 'Contact' };
export function generateWebsiteSpecification(business: BusinessInformation, template: WebsiteTemplate, requestedSections: WebsiteSectionId[] = [], attributionEnabled = true): WebsiteSpecification {
  const errors = validateBusinessInformation(business); if (errors.length) throw new Error(errors.join(' ')); const sections = templateSections(template, requestedSections); const name = clean(business.businessName); const services = list(business.services); const products = list(business.products);
  const description = clean(business.businessDescription) || `${name}${clean(business.industry) ? ` is a ${clean(business.industry).toLowerCase()}` : ''}${clean(business.location) ? ` serving ${clean(business.location)}` : ''}.`;
  const candidate: WebsiteSpecification = { version: 1, template: { id: template.id, slug: template.slug, name: template.name, visual_style: template.visual_style }, business: { ...business, businessName: name, industry: clean(business.industry), businessDescription: description, services, products, targetAudience: clean(business.targetAudience), location: clean(business.location), phone: clean(business.phone), email: clean(business.email), whatsapp: clean(business.whatsapp), specialRequirements: clean(business.specialRequirements) }, sections, theme: themeFor(template, business), navigation: sections.filter((section) => !['navbar', 'hero', 'footer'].includes(section)).map((section) => ({ label: navigationLabel[section], section })), content: { hero: { eyebrow: clean(business.industry), title: name, subtitle: description, cta: 'Get in touch' }, about: { title: `About ${name}`, body: description }, services: { items: services }, products: { items: products }, gallery: { images: business.imagery || [] }, testimonials: { items: [] }, pricing: { items: [] }, faq: { items: [] }, contact: { phone: business.phone || '', email: business.email || '', whatsapp: business.whatsapp || '' }, location: { address: business.location || '' }, footer: { businessName: name } }, attribution: { enabled: attributionEnabled, label: 'Made with Avelixa' } };
  const result = generateWebsiteFromSpecification(candidate, template); if (!result.ok) throw new Error(result.errors.join(' ')); return result.artifact;
}
export interface WebsiteGenerationAdapter { generate(input: Parameters<typeof generateWebsiteSpecification>): WebsiteSpecification | Promise<WebsiteSpecification>; }
export const deterministicWebsiteGenerationAdapter: WebsiteGenerationAdapter = { generate: ([business, template, requestedSections, attributionEnabled]) => generateWebsiteSpecification(business, template, requestedSections, attributionEnabled) };
