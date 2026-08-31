import type { WebsiteSectionId, WebsiteSpecification } from '../../lib/websiteCreation/types';
import { Navbar, Hero, About, Services, Products, Gallery, Testimonials, Pricing, FAQ, Contact, Location, Footer } from './WebsiteSections';

const sectionMap: Record<WebsiteSectionId, React.ComponentType<{ spec: WebsiteSpecification }>> = {
  navbar: Navbar,
  hero: Hero,
  about: About,
  services: Services,
  products: Products,
  gallery: Gallery,
  testimonials: Testimonials,
  pricing: Pricing,
  faq: FAQ,
  contact: Contact,
  location: Location,
  footer: Footer,
};

export default function WebsitePreviewRenderer({ spec }: { spec: WebsiteSpecification }) {
  return <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl" style={{ fontFamily: spec.theme.bodyFont }}>
    {spec.sections.map((section) => {
      const Component = sectionMap[section];
      return Component ? <Component key={section} spec={spec} /> : null;
    })}
  </div>;
}
