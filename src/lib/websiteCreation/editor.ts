import type { WebsiteSectionId, WebsiteSpecification } from './types';

export type WebsiteSpecificationPatch =
  | { kind: 'hero_text'; field: 'title' | 'subtitle' | 'cta'; value: string }
  | { kind: 'theme_color'; field: 'primary' | 'secondary' | 'accent' | 'surface'; value: string }
  | { kind: 'section_visibility'; section: WebsiteSectionId; visible: boolean }
  | { kind: 'section_order'; sections: WebsiteSectionId[] };

const unique = <T,>(values: T[]) => values.filter((value, index) => values.indexOf(value) === index);

export function applyWebsiteSpecificationPatch(spec: WebsiteSpecification, patch: WebsiteSpecificationPatch): WebsiteSpecification {
  switch (patch.kind) {
    case 'hero_text':
      return {
        ...spec,
        content: {
          ...spec.content,
          hero: { ...((spec.content.hero || {}) as Record<string, unknown>), [patch.field]: patch.value },
        },
      };
    case 'theme_color':
      return { ...spec, theme: { ...spec.theme, [patch.field]: patch.value } };
    case 'section_visibility': {
      const sections = patch.visible
        ? unique([...spec.sections, patch.section])
        : spec.sections.filter((section) => section !== patch.section);
      return { ...spec, sections };
    }
    case 'section_order': {
      const allowed = new Set(spec.sections);
      const ordered = unique(patch.sections).filter((section) => allowed.has(section));
      const missing = spec.sections.filter((section) => !ordered.includes(section));
      return { ...spec, sections: [...ordered, ...missing] };
    }
  }
}

export interface WebsiteSpecificationEditor {
  apply(spec: WebsiteSpecification, patch: WebsiteSpecificationPatch): WebsiteSpecification;
}

export const deterministicWebsiteSpecificationEditor: WebsiteSpecificationEditor = {
  apply: applyWebsiteSpecificationPatch,
};
