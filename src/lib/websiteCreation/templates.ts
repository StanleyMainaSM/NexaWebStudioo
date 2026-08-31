import type { WebsiteSectionId, WebsiteTemplate } from './types';

export const templateSections = (template: WebsiteTemplate, requested: WebsiteSectionId[]): WebsiteSectionId[] => {
  const allowed = new Set(template.sections);
  const selected = requested.filter((section, index, list) => allowed.has(section) && list.indexOf(section) === index);
  return selected.length ? selected : template.sections;
};
