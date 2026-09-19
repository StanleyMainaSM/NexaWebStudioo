import { Template } from '../types';
import { generateId } from './utils';
import { getTheme } from './color-generator';
import { industryContentMap } from './content-generator';

const createPrebuiltTemplate = (
  name: string,
  industry: string,
  style: string,
  color: string,
  heroVariant: string,
  featuresVariant: string,
  galleryVariant: string,
  testimonialsVariant: string,
  ctaVariant: string,
  imagesPool: string[]
): Template => {
  const theme = getTheme(industry, style, color);
  
  // Find matching industry in the map
  const contentKey = Object.keys(industryContentMap).find(k => k.toLowerCase() === industry.toLowerCase()) || 'Corporate';
  const contentBase = industryContentMap[contentKey] || industryContentMap['Corporate'];
  
  const sections: any[] = [];
  
  if (contentBase.hero) {
    sections.push({
      id: generateId(),
      type: 'hero',
      layoutVariant: heroVariant,
      styleVariant: 'default',
      content: {
        ...contentBase.hero,
        images: [{ src: imagesPool[0], alt: "Hero image" }]
      }
    });
  }
  
  if (contentBase.features) {
    sections.push({
      id: generateId(),
      type: 'features',
      layoutVariant: featuresVariant,
      styleVariant: style.includes('Luxury') ? 'default' : 'muted',
      content: {
        ...contentBase.features,
        images: [{ src: imagesPool[1], alt: "Features image" }]
      }
    });
  }
  
  if (contentBase.gallery) {
    sections.push({
      id: generateId(),
      type: 'gallery',
      layoutVariant: galleryVariant,
      styleVariant: 'default',
      content: {
        ...contentBase.gallery,
        items: contentBase.gallery.items.map((item: any, i: number) => ({
          ...item,
          src: imagesPool[(i % (imagesPool.length - 2)) + 2] || imagesPool[2]
        }))
      }
    });
  }
  
  if (contentBase.pricing) {
    sections.push({
      id: generateId(),
      type: 'pricing',
      layoutVariant: 'cards',
      styleVariant: 'default',
      content: contentBase.pricing
    });
  }
  
  if (contentBase.testimonials) {
    sections.push({
      id: generateId(),
      type: 'testimonials',
      layoutVariant: testimonialsVariant,
      styleVariant: 'primary',
      content: contentBase.testimonials
    });
  }
  
  sections.push({
    id: generateId(),
    type: 'cta',
    layoutVariant: ctaVariant,
    styleVariant: 'dark',
    content: {
      headline: `Ready to elevate your ${industry.toLowerCase()} brand?`,
      subheadline: "Join our roster of successful clients.",
      primaryCTA: { label: "Contact Us Today", url: "#" }
    }
  });
  
  sections.push({
    id: generateId(),
    type: 'footer',
    layoutVariant: 'default',
    styleVariant: 'default',
    content: {
      headline: name,
      paragraph: `© ${new Date().getFullYear()} ${name}. All rights reserved.`
    }
  });

  return {
    id: generateId(),
    name,
    industry,
    style,
    theme,
    createdAt: Date.now() - Math.random() * 1000000000,
    sections
  };
};

// Stable image pools
const saasImgs = [
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015',
  'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=2076',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070',
  'https://images.unsplash.com/photo-1618761714954-0b8cd0026356?q=80&w=2070'
];

const restImgs = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2070',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070',
  'https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974'
];

const hotelImgs = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1925',
  'https://images.unsplash.com/photo-1542314831-c6a4d140e628?q=80&w=2070',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1949',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2070'
];

const archImgs = [
  'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?q=80&w=2071',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070',
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1931',
  'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=2070',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069'
];

const fashImgs = [
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2071',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070',
  'https://images.unsplash.com/photo-1550614000-4b95d466f911?q=80&w=2070'
];

const lawImgs = [
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2024',
  'https://images.unsplash.com/photo-1505664159811-213c32fc34db?q=80&w=2070',
  'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=2070',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=2071',
  'https://images.unsplash.com/photo-1618044733300-9472054094ee?q=80&w=2071'
];

const realEstateImgs = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070',
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070',
  'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?q=80&w=2070'
];

const fitImgs = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070',
  'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2070',
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070',
  'https://images.unsplash.com/photo-1594882645126-14020914d58d?q=80&w=2085'
];

export const initialTemplates: Template[] = [
  createPrebuiltTemplate("Nexus SaaS", "SaaS", "Modern", "Blue", "split", "list", "grid", "cards", "split", saasImgs),
  createPrebuiltTemplate("Elegance Resort", "Hotel", "Luxury", "Gold", "editorial", "minimal", "masonry", "editorial", "default", hotelImgs),
  createPrebuiltTemplate("Culinary Arts", "Restaurant", "Cinematic", "Red", "centered", "grid", "masonry", "editorial", "split", restImgs),
  createPrebuiltTemplate("Oculus Studio", "Architecture", "Minimal", "Monochrome", "minimal", "minimal", "grid", "cards", "default", archImgs),
  createPrebuiltTemplate("Vogue Label", "Fashion", "Editorial", "Rose", "editorial", "list", "masonry", "editorial", "split", fashImgs),
  createPrebuiltTemplate("Justice Partners", "Law", "Corporate", "Navy", "split", "grid", "grid", "cards", "default", lawImgs),
  createPrebuiltTemplate("Apex Fitness", "Fitness", "Bold", "Green", "centered", "list", "masonry", "cards", "split", fitImgs),
  createPrebuiltTemplate("Horizon Homes", "Real Estate", "Luxury", "Blue", "editorial", "minimal", "grid", "editorial", "default", realEstateImgs),
  
  createPrebuiltTemplate("DataFlow AI", "Technology", "Modern", "Purple", "split", "grid", "masonry", "cards", "split", saasImgs),
  createPrebuiltTemplate("The Brasserie", "Restaurant", "Luxury", "Gold", "editorial", "minimal", "masonry", "editorial", "default", restImgs),
  createPrebuiltTemplate("Haven Spa", "Hotel", "Minimal", "Green", "minimal", "list", "grid", "editorial", "split", hotelImgs),
  createPrebuiltTemplate("BuildCorp", "Construction", "Bold", "Orange", "centered", "grid", "grid", "cards", "default", archImgs),
  createPrebuiltTemplate("Avant Garde", "Fashion", "Cinematic", "Monochrome", "centered", "minimal", "masonry", "editorial", "split", fashImgs),
  createPrebuiltTemplate("Equinox Law", "Law Firm", "Minimal", "Blue", "minimal", "grid", "grid", "cards", "default", lawImgs),
  createPrebuiltTemplate("Prime Estates", "Real Estate", "Corporate", "Navy", "split", "list", "masonry", "cards", "split", realEstateImgs),
  createPrebuiltTemplate("Iron Gym", "Gym", "Dark", "Red", "centered", "grid", "masonry", "editorial", "default", fitImgs),
  
  createPrebuiltTemplate("CloudSync", "Software", "Minimal", "Teal", "minimal", "list", "grid", "cards", "split", saasImgs),
  createPrebuiltTemplate("Bistro Noir", "Restaurant", "Dark", "Orange", "centered", "grid", "masonry", "editorial", "default", restImgs),
  createPrebuiltTemplate("Alpine Lodge", "Travel", "Cinematic", "Blue", "editorial", "list", "masonry", "editorial", "split", hotelImgs),
  createPrebuiltTemplate("Structure", "Interior Design", "Editorial", "Monochrome", "editorial", "minimal", "grid", "editorial", "default", archImgs),
  createPrebuiltTemplate("Lumina", "Beauty", "Luxury", "Rose", "split", "grid", "masonry", "cards", "split", fashImgs),
  createPrebuiltTemplate("Shield Legal", "Corporate", "Modern", "Navy", "split", "list", "grid", "cards", "default", lawImgs),
  createPrebuiltTemplate("Velocity", "Logistics", "Bold", "Blue", "centered", "grid", "grid", "editorial", "split", archImgs),
  createPrebuiltTemplate("Zenith Health", "Healthcare", "Minimal", "Teal", "minimal", "list", "grid", "cards", "default", saasImgs),
  
  createPrebuiltTemplate("MetricsPro", "Finance", "Corporate", "Blue", "split", "grid", "grid", "cards", "split", saasImgs),
  createPrebuiltTemplate("Taste Studio", "Events", "Editorial", "Rose", "editorial", "minimal", "masonry", "editorial", "default", restImgs),
  createPrebuiltTemplate("Oasis Booking", "Travel", "Modern", "Teal", "split", "list", "grid", "cards", "split", hotelImgs),
  createPrebuiltTemplate("Monumental", "Consulting", "Bold", "Navy", "centered", "grid", "masonry", "editorial", "default", archImgs),
  createPrebuiltTemplate("Thread & Co", "E-commerce", "Minimal", "Monochrome", "minimal", "grid", "grid", "cards", "default", fashImgs),
  createPrebuiltTemplate("Capital Partners", "Accounting", "Luxury", "Gold", "editorial", "minimal", "grid", "editorial", "split", lawImgs)
];
