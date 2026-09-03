import type { ComponentType } from 'react';
import type { WebsiteSectionId, WebsiteSpecification } from '../../lib/websiteCreation/types';
import { getWebsiteTemplatePresentation } from '../../lib/websiteCreation/presentation';
import { Navbar, Hero, About, Services, Products, Gallery, Testimonials, Pricing, FAQ, Contact, Location, Footer } from './WebsiteSections';

const sectionMap: Record<WebsiteSectionId, ComponentType<{ spec: WebsiteSpecification }>> = { navbar: Navbar, hero: Hero, about: About, services: Services, products: Products, gallery: Gallery, testimonials: Testimonials, pricing: Pricing, faq: FAQ, contact: Contact, location: Location, footer: Footer };

const templateStyles = `
[data-template-style] { min-width: 0; overflow-wrap: anywhere; }
[data-template-style] * { max-width: 100%; }
[data-template-style] img { display: block; }
[data-template-style="editorial-modern"] { background: #ffffff; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
[data-template-style="editorial-modern"] h1, [data-template-style="editorial-modern"] h2, [data-template-style="editorial-modern"] h3 { letter-spacing: -0.035em; }
[data-template-style="editorial-modern"] section { scroll-margin-top: 5rem; }
[data-template-style="editorial-modern"] article { transition: transform .2s ease, box-shadow .2s ease; }
[data-template-style="editorial-modern"] article:hover { transform: translateY(-2px); box-shadow: 0 18px 45px rgba(15,23,42,.08); }
[data-template-style="premium-minimal"] { background: #faf9f6; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
[data-template-style="premium-minimal"] h1, [data-template-style="premium-minimal"] h2 { letter-spacing: -0.045em; }
[data-template-style="premium-minimal"] section { scroll-margin-top: 5rem; }
[data-template-style="premium-minimal"] article { border-radius: .25rem; }
[data-template-style="premium-minimal"] header { background: rgba(250,249,246,.94); }
[data-template-style="warm-commerce"] { background: #fffaf4; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
[data-template-style="warm-commerce"] section { scroll-margin-top: 5rem; }
[data-template-style="warm-commerce"] h1, [data-template-style="warm-commerce"] h2, [data-template-style="warm-commerce"] h3 { letter-spacing: -0.025em; }
[data-template-style="warm-commerce"] article { transition: transform .2s ease; }
[data-template-style="warm-commerce"] article:hover { transform: translateY(-3px); }
[data-template-style="creative-bold"] { background: #0b1020; color: #f8fafc; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
[data-template-style="creative-bold"] section { scroll-margin-top: 5rem; }
[data-template-style="creative-bold"] h1, [data-template-style="creative-bold"] h2, [data-template-style="creative-bold"] h3 { letter-spacing: -0.05em; }
[data-template-style="creative-bold"] header { background: rgba(11,16,32,.92); border-color: rgba(255,255,255,.10); }
[data-template-style="trusted-community"] { background: #f4f8f7; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
[data-template-style="trusted-community"] section { scroll-margin-top: 5rem; }
[data-template-style="trusted-community"] article { transition: transform .2s ease, box-shadow .2s ease; }
[data-template-style="trusted-community"] article:hover { transform: translateY(-2px); box-shadow: 0 14px 35px rgba(23,50,77,.10); }
@media (max-width: 767px) {
  [data-template-style] section { scroll-margin-top: 4.5rem; }
  [data-template-style] h1 { word-break: normal; overflow-wrap: anywhere; }
}
`;

export default function WebsitePreviewRenderer({ spec }: { spec: WebsiteSpecification }) {
  const presentation = getWebsiteTemplatePresentation(spec);
  return <div data-template-style={presentation.styleKey} className="w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
    <style>{templateStyles}</style>
    {spec.sections.map((section) => { const Component = sectionMap[section]; return Component ? <Component key={section} spec={spec} /> : null; })}
  </div>;
}
