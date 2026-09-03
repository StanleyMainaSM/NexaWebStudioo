import type { WebsiteSpecification } from './types';

export type WebsiteTemplateStyleKey = 'editorial-modern' | 'premium-minimal' | 'warm-commerce' | 'creative-bold' | 'trusted-community';
export interface WebsiteTemplatePresentation {
  styleKey: WebsiteTemplateStyleKey;
  label: string;
  density: 'airy' | 'balanced' | 'expressive';
  surface: string;
  radius: 'sharp' | 'soft' | 'rounded';
}

const PRESENTATIONS: Record<WebsiteTemplateStyleKey, WebsiteTemplatePresentation> = {
  'editorial-modern': { styleKey: 'editorial-modern', label: 'Modern Business', density: 'balanced', surface: 'editorial', radius: 'soft' },
  'premium-minimal': { styleKey: 'premium-minimal', label: 'Premium Minimal', density: 'airy', surface: 'paper', radius: 'sharp' },
  'warm-commerce': { styleKey: 'warm-commerce', label: 'Local Commerce', density: 'balanced', surface: 'warm', radius: 'rounded' },
  'creative-bold': { styleKey: 'creative-bold', label: 'Creative Studio', density: 'expressive', surface: 'dark', radius: 'rounded' },
  'trusted-community': { styleKey: 'trusted-community', label: 'Trusted Community', density: 'balanced', surface: 'calm', radius: 'soft' },
};

export function getWebsiteTemplatePresentation(spec: Pick<WebsiteSpecification, 'template'>): WebsiteTemplatePresentation {
  const style = spec.template.visual_style as WebsiteTemplateStyleKey;
  return PRESENTATIONS[style] || PRESENTATIONS['editorial-modern'];
}
