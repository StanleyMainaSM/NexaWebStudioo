import type { WebsiteSpecification, WebsiteTemplate } from './types.ts';
import {
  createWebsiteOutputIdentity,
  createWebsiteOutputVersion,
  generateWebsiteFromSpecification,
} from './generator.ts';

export const WEBSITE_GENERATION_LIFECYCLE_STATES = [
  'never_generated',
  'current',
  'needs_regeneration',
  'generation_failed',
] as const;

export type WebsiteGenerationLifecycleState = (typeof WEBSITE_GENERATION_LIFECYCLE_STATES)[number];

export interface WebsiteGenerationLifecycleMetadata {
  latest_generated_output_identity?: string | null;
  latest_generated_output_version?: string | null;
  latest_generated_at?: string | null;
  generation_state?: 'never_generated' | 'current' | 'generation_failed' | null;
  last_generation_error?: string | null;
}

export function getWebsiteGenerationLifecycleState(
  specification: WebsiteSpecification | null | undefined,
  creationProjectId: string | null | undefined,
  selectedTemplate: WebsiteTemplate | null | undefined,
  metadata: WebsiteGenerationLifecycleMetadata | null | undefined,
): WebsiteGenerationLifecycleState {
  if (metadata?.generation_state === 'generation_failed') return 'generation_failed';
  if (!specification || !creationProjectId || !selectedTemplate) return metadata?.latest_generated_output_identity ? 'needs_regeneration' : 'never_generated';
  if (specification.template.id !== selectedTemplate.id || specification.template.slug !== selectedTemplate.slug) return 'needs_regeneration';
  if (!metadata?.latest_generated_output_identity) return 'never_generated';

  const generated = generateWebsiteFromSpecification(specification, selectedTemplate);
  if (!generated.ok) return 'needs_regeneration';

  const identity = createWebsiteOutputIdentity(creationProjectId, generated.artifact);
  const version = createWebsiteOutputVersion(generated.artifact);
  return identity === metadata.latest_generated_output_identity && version === metadata.latest_generated_output_version
    ? 'current'
    : 'needs_regeneration';
}

export function lifecycleStateLabel(state: WebsiteGenerationLifecycleState): string {
  switch (state) {
    case 'never_generated': return 'Never generated';
    case 'current': return 'Current';
    case 'needs_regeneration': return 'Needs regeneration';
    case 'generation_failed': return 'Generation failed';
  }
}
