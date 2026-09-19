import React from 'react';
import { Template } from '../../types';
import { 
  HeroSection, 
  FeaturesSection, 
  TestimonialsSection, 
  PricingSection, 
  GallerySection, 
  CTASection, 
  FooterSection 
} from './sections';

interface TemplateRendererProps {
  template: Template;
  isPreview?: boolean;
}

export function TemplateRenderer({ template, isPreview }: TemplateRendererProps) {
  return (
    <div className={`w-full min-h-screen ${isPreview ? 'pointer-events-none' : ''}`} style={{ backgroundColor: template.theme.background, fontFamily: template.theme.fontFamily }}>
      {template.sections.map(section => {
        switch (section.type) {
          case 'hero': return <HeroSection key={section.id} section={section} theme={template.theme} />;
          case 'features': return <FeaturesSection key={section.id} section={section} theme={template.theme} />;
          case 'testimonials': return <TestimonialsSection key={section.id} section={section} theme={template.theme} />;
          case 'pricing': return <PricingSection key={section.id} section={section} theme={template.theme} />;
          case 'gallery': return <GallerySection key={section.id} section={section} theme={template.theme} />;
          case 'cta': return <CTASection key={section.id} section={section} theme={template.theme} />;
          case 'footer': return <FooterSection key={section.id} section={section} theme={template.theme} />;
          default: return null;
        }
      })}
    </div>
  );
}
