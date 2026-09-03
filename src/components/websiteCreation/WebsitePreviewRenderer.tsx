import type { ComponentType } from 'react';
import type { WebsiteSectionId, WebsiteSpecification } from '../../lib/websiteCreation/types';
import { getWebsiteTemplatePresentation } from '../../lib/websiteCreation/presentation';
import { Navbar, Hero, About, Stats, Story, Values, Process, Services, Offers, Products, Gallery, Portfolio, Team, Testimonials, Pricing, FAQ, Hours, Location, Social, FinalCta, Contact, Footer } from './WebsiteSections';

const sectionMap: Record<WebsiteSectionId, ComponentType<{ spec: WebsiteSpecification }>> = {
  navbar: Navbar, hero: Hero, about: About, services: Services, products: Products, gallery: Gallery,
  stats: Stats, story: Story, values: Values, process: Process, portfolio: Portfolio, team: Team, offers: Offers,
  testimonials: Testimonials, pricing: Pricing, faq: FAQ, hours: Hours, location: Location, social: Social,
  finalCta: FinalCta, contact: Contact, footer: Footer,
};

const templateStyles = `
[data-template-style] { min-width:0; overflow-wrap:anywhere; }
[data-template-style] * { max-width:100%; }
[data-template-style] img { display:block; }
[data-template-style] a, [data-template-style] button, [data-template-style] summary { outline-offset:4px; }
[data-template-style] a:focus-visible, [data-template-style] button:focus-visible, [data-template-style] summary:focus-visible { outline:2px solid currentColor; }
[data-template-style] section { scroll-margin-top:5rem; }
[data-template-style="editorial-modern"] { background:#fff; color:#0f172a; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
[data-template-style="editorial-modern"] h1,[data-template-style="editorial-modern"] h2,[data-template-style="editorial-modern"] h3 { letter-spacing:-.045em; }
[data-template-style="editorial-modern"] article { transition:transform .22s ease,box-shadow .22s ease; }
[data-template-style="editorial-modern"] article:hover { transform:translateY(-3px); box-shadow:0 20px 55px rgba(15,23,42,.09); }
[data-template-style="premium-minimal"] { background:#f7f5f0; color:#171717; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
[data-template-style="premium-minimal"] h1,[data-template-style="premium-minimal"] h2,[data-template-style="premium-minimal"] h3 { letter-spacing:-.055em; font-family:Georgia,'Times New Roman',serif; }
[data-template-style="premium-minimal"] article { transition:opacity .22s ease,transform .22s ease; }
[data-template-style="premium-minimal"] article:hover { transform:translateY(-2px); }
[data-template-style="warm-commerce"] { background:#fff8ef; color:#18301f; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
[data-template-style="warm-commerce"] h1,[data-template-style="warm-commerce"] h2,[data-template-style="warm-commerce"] h3 { letter-spacing:-.035em; }
[data-template-style="warm-commerce"] article { transition:transform .22s ease,box-shadow .22s ease; }
[data-template-style="warm-commerce"] article:hover { transform:translateY(-4px); box-shadow:0 18px 42px rgba(88,52,24,.10); }
[data-template-style="creative-bold"] { background:#070a14; color:#f8fafc; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
[data-template-style="creative-bold"] h1,[data-template-style="creative-bold"] h2,[data-template-style="creative-bold"] h3 { letter-spacing:-.06em; }
[data-template-style="creative-bold"] article { transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .25s ease; }
[data-template-style="creative-bold"] article:hover { transform:translateY(-5px); }
[data-template-style="trusted-community"] { background:#edf5f2; color:#17324d; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
[data-template-style="trusted-community"] h1,[data-template-style="trusted-community"] h2,[data-template-style="trusted-community"] h3 { letter-spacing:-.04em; }
[data-template-style="trusted-community"] article { transition:transform .22s ease,box-shadow .22s ease; }
[data-template-style="trusted-community"] article:hover { transform:translateY(-2px); box-shadow:0 16px 38px rgba(23,50,77,.10); }
@media (max-width:767px) { [data-template-style] section { scroll-margin-top:4.5rem; } [data-template-style] h1 { overflow-wrap:anywhere; } }
`;

export default function WebsitePreviewRenderer({ spec }: { spec: WebsiteSpecification }) {
  const presentation = getWebsiteTemplatePresentation(spec);
  return <div data-template-style={presentation.styleKey} className="w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl" style={{fontFamily:'Inter,ui-sans-serif,system-ui,sans-serif'}}><style>{templateStyles}</style>{spec.sections.map((section) => { const Component = sectionMap[section]; return Component ? <Component key={section} spec={spec}/> : null; })}</div>;
}
