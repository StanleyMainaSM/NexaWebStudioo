import type { ComponentType } from 'react';
import type { WebsiteSectionId, WebsiteSpecification } from '../../lib/websiteCreation/types';
import { getWebsiteTemplatePresentation } from '../../lib/websiteCreation/presentation';
import { Navbar, Hero, About, Services, Products, Gallery, Testimonials, Pricing, FAQ, Contact, Location, Footer } from './WebsiteSections';

const sectionMap: Record<WebsiteSectionId, ComponentType<{ spec: WebsiteSpecification }>> = { navbar: Navbar, hero: Hero, about: About, services: Services, products: Products, gallery: Gallery, testimonials: Testimonials, pricing: Pricing, faq: FAQ, contact: Contact, location: Location, footer: Footer };

const templateStyles = `
[data-template-style="premium-minimal"] { background: #faf9f6; }
[data-template-style="premium-minimal"] h1, [data-template-style="premium-minimal"] h2 { letter-spacing: -0.025em; }
[data-template-style="premium-minimal"] section { padding-top: 5.5rem; padding-bottom: 5.5rem; }
[data-template-style="premium-minimal"] article, [data-template-style="premium-minimal"] blockquote, [data-template-style="premium-minimal"] details { border-radius: 1rem; box-shadow: none; }
[data-template-style="premium-minimal"] header { background: rgba(250,249,246,.92); }
[data-template-style="warm-commerce"] { background: #fffaf4; }
[data-template-style="warm-commerce"] section { padding-top: 4.5rem; padding-bottom: 4.5rem; }
[data-template-style="warm-commerce"] article, [data-template-style="warm-commerce"] blockquote, [data-template-style="warm-commerce"] details { border-radius: 1.5rem; }
[data-template-style="warm-commerce"] header { background: rgba(255,250,244,.94); }
[data-template-style="warm-commerce"] h2 { letter-spacing: -.015em; }
[data-template-style="creative-bold"] { background: #0b1020; color: #f8fafc; }
[data-template-style="creative-bold"] section { padding-top: 5rem; padding-bottom: 5rem; }
[data-template-style="creative-bold"] section.bg-slate-50 { background: #111827; }
[data-template-style="creative-bold"] h1, [data-template-style="creative-bold"] h2, [data-template-style="creative-bold"] h3 { color: #f8fafc; }
[data-template-style="creative-bold"] p, [data-template-style="creative-bold"] .text-slate-600, [data-template-style="creative-bold"] .text-slate-500 { color: #cbd5e1; }
[data-template-style="creative-bold"] article, [data-template-style="creative-bold"] blockquote, [data-template-style="creative-bold"] details { border-color: rgba(255,255,255,.12); background: rgba(255,255,255,.06); border-radius: 1.5rem; backdrop-filter: blur(12px); }
[data-template-style="creative-bold"] header { background: rgba(11,16,32,.9); border-color: rgba(255,255,255,.12); }
[data-template-style="creative-bold"] header span, [data-template-style="creative-bold"] header a { color: #e2e8f0; }
[data-template-style="trusted-community"] { background: #f4f8f7; }
[data-template-style="trusted-community"] section { padding-top: 4rem; padding-bottom: 4rem; }
[data-template-style="trusted-community"] article, [data-template-style="trusted-community"] blockquote, [data-template-style="trusted-community"] details { border-radius: 1.25rem; }
[data-template-style="trusted-community"] header { background: rgba(244,248,247,.94); }
[data-template-style="editorial-modern"] section { padding-top: 5rem; padding-bottom: 5rem; }
`;

export default function WebsitePreviewRenderer({ spec }: { spec: WebsiteSpecification }) {
  const presentation = getWebsiteTemplatePresentation(spec);
  return <div data-template-style={presentation.styleKey} className="overflow-hidden rounded-[2rem] bg-white shadow-2xl" style={{ fontFamily: spec.theme.bodyFont }}>
    <style>{templateStyles}</style>
    {spec.sections.map((section) => { const Component = sectionMap[section]; return Component ? <Component key={section} spec={spec} /> : null; })}
  </div>;
}
