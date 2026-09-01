import type { WebsiteGenerationPersistedState, WebsiteSpecification, WebsiteTemplate } from './types.ts';
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
  generation_state?: WebsiteGenerationPersistedState | null;
  last_generation_error?: string | null;
}

export function getWebsiteGenerationLifecycleState(
  specification: WebsiteSpecification | null | undefined,
  creationProjectId: string | null | undefined,
  selectedTemplate: WebsiteTemplate | null | undefined,
  metadata: WebsiteGenerationLifecycleMetadata | null | undefined,
): WebsiteGenerationLifecycleState {
  if (!metadata?.latest_generated_output_identity) return metadata?.generation_state === 'generation_failed' ? 'generation_failed' : 'never_generated';
  if (!specification || !creationProjectId || !selectedTemplate) return 'needs_regeneration';
  if (specification.template.id !== selectedTemplate.id || specification.template.slug !== selectedTemplate.slug) return 'needs_regeneration';

  const generated = generateWebsiteFromSpecification(specification, selectedTemplate);
  if (!generated.ok) return 'needs_regeneration';

  const identity = createWebsiteOutputIdentity(creationProjectId, generated.artifact);
  const version = createWebsiteOutputVersion(generated.artifact);
  if (identity !== metadata.latest_generated_output_identity || version !== metadata.latest_generated_output_version) return 'needs_regeneration';
  return metadata.generation_state === 'generation_failed' ? 'generation_failed' : 'current';
}

export function lifecycleStateLabel(state: WebsiteGenerationLifecycleState): string {
  switch (state) {
    case 'never_generated': return 'Never generated';
    case 'current': return 'Current';
    case 'needs_regeneration': return 'Needs regeneration';
    case 'generation_failed': return 'Generation failed';
  }
}
