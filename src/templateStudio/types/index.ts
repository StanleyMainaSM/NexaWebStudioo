export type TemplateIndustry = string;
export type TemplateStyle = string;
export type TemplateColor = string;

export interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  fontFamily: string;
  borderRadius: string;
}

export type SectionType = 'hero' | 'features' | 'testimonials' | 'pricing' | 'contact' | 'gallery' | 'footer' | 'cta';

export interface SectionContent {
  headline?: string;
  subheadline?: string;
  paragraph?: string;
  primaryCTA?: { label: string; url: string };
  secondaryCTA?: { label: string; url: string };
  images?: { src: string; alt: string }[];
  items?: any[]; // Reusable for features, testimonials, pricing plans
}

export interface Section {
  id: string;
  type: SectionType;
  content: SectionContent;
  styleVariant?: 'default' | 'muted' | 'primary' | 'dark';
  layoutVariant?: string;
}

export interface Template {
  id: string;
  name: string;
  industry: string;
  style: string;
  theme: Theme;
  sections: Section[];
  createdAt: number;
}
