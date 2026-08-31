import type { WebsiteSpecification } from './types';

export interface WebsiteTemplatePresentation {
  styleKey: 'editorial-modern' | 'premium-minimal' | 'warm-commerce' | 'creative-bold' | 'trusted-community';
}

const PRESENTATIONS: Record<WebsiteTemplatePresentation['styleKey'], WebsiteTemplatePresentation> = {
  'editorial-modern': { styleKey: 'editorial-modern' },
  'premium-minimal': { styleKey: 'premium-minimal' },
  'warm-commerce': { styleKey: 'warm-commerce' },
  'creative-bold': { styleKey: 'creative-bold' },
  'trusted-community': { styleKey: 'trusted-community' },
};

export function getWebsiteTemplatePresentation(spec: WebsiteSpecification): WebsiteTemplatePresentation {
  const style = spec.template.visual_style as WebsiteTemplatePresentation['styleKey'];
  return PRESENTATIONS[style] || PRESENTATIONS['editorial-modern'];
}
