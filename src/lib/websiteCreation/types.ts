export const CREATION_PROJECT_TYPES = ['website', 'web_app', 'mobile_app', 'custom_software'] as const;
export type CreationProjectType = (typeof CREATION_PROJECT_TYPES)[number];

export const WEBSITE_SECTIONS = [
  'navbar', 'hero', 'about', 'services', 'products', 'gallery',
  'testimonials', 'pricing', 'faq', 'contact', 'location', 'footer',
] as const;
export type WebsiteSectionId = (typeof WEBSITE_SECTIONS)[number];

export interface BusinessInformation {
  businessName: string;
  industry?: string;
  businessDescription?: string;
  services?: string[];
  products?: string[];
  targetAudience?: string;
  location?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  socialLinks?: Record<string, string>;
  logoUrl?: string;
  brandColors?: { primary?: string; secondary?: string; accent?: string; surface?: string };
  imagery?: string[];
  websiteType?: string;
  specialRequirements?: string;
}

export interface WebsiteTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categories: string[];
  visual_style: string;
  sections: WebsiteSectionId[];
  typography: Record<string, string>;
  color_direction: Record<string, string>;
  layout: Record<string, string>;
  preview: Record<string, string>;
  is_active: boolean;
  is_protected: boolean;
}

export interface WebsiteTheme {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  text: string;
  muted: string;
  headingFont: string;
  bodyFont: string;
}

export interface WebsiteSpecification {
  version: 1;
  template: Pick<WebsiteTemplate, 'id' | 'slug' | 'name' | 'visual_style'>;
  business: BusinessInformation;
  sections: WebsiteSectionId[];
  theme: WebsiteTheme;
  navigation: { label: string; section: WebsiteSectionId }[];
  content: Record<string, unknown>;
  attribution: { enabled: boolean; label: string };
}

export type WebsiteOutputStatus = 'draft' | 'generated' | 'published';

export interface WebsiteGenerationOutput {
  id: string;
  creationProjectId: string;
  specification: WebsiteSpecification;
  template: WebsiteTemplate;
  status: WebsiteOutputStatus;
  generatedAt: string;
  outputVersion: string;
  previewPath: string | null;
}

export interface PersistedGeneratedWebsiteArtifact {
  id: string;
  creationProjectId: string;
  outputIdentity: string;
  outputVersion: string;
  specificationIdentity: string;
  specification: WebsiteSpecification;
  templateId: string;
  generatedAt: string;
  status: WebsiteOutputStatus;
  publishedAt?: string | null;
  previewPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WebsiteGenerationPersistedState = 'never_generated' | 'current' | 'needs_regeneration' | 'generation_failed';

export interface CreationProject {
  id: string;
  type: CreationProjectType;
  client_id: string | null;
  connector_id: string | null;
  operator_id: string | null;
  lead_id: string | null;
  project_id: string | null;
  business_id: string | null;
  title: string;
  business_info: BusinessInformation;
  requested_sections: WebsiteSectionId[];
  selected_template_id: string | null;
  specification: WebsiteSpecification | null;
  attribution_enabled: boolean;
  public_preview_token?: string | null;
  preview_enabled?: boolean;
  latest_generated_output_identity?: string | null;
  latest_generated_output_version?: string | null;
  latest_generated_at?: string | null;
  generation_state?: WebsiteGenerationPersistedState | null;
  last_generation_error?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GenerationStatus {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
}
