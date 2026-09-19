import { Template, Theme, Section } from '../types';
import { generateId } from './utils';
import { getTheme } from './color-generator';
import { industryContentMap } from './content-generator';
import { getImagesForIndustry } from './image-catalog';

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateTemplate = async (
  industry: string,
  style: string,
  color: string,
  pages: string[]
): Promise<Template> => {
  // Simulate AI latency
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Find exact or fallback industry content
  let contentKey = Object.keys(industryContentMap).find(k => k.toLowerCase() === industry.toLowerCase());
  if (!contentKey) contentKey = 'Corporate'; // Better default
  const contentBase = industryContentMap[contentKey] || industryContentMap['Corporate'];
  
  const theme = getTheme(industry, style, color);
  
  // Decide layout variants based on style
  let s = style.toLowerCase();
  
  if (s === 'auto' || s === 'ai choose') {
    const randomStyles = ['luxury', 'minimal', 'modern', 'cinematic', 'editorial'];
    s = pickRandom(randomStyles);
  }
  
  let heroVariant = 'split';
  let featuresVariant = 'grid';
  let galleryVariant = 'grid';
  let testimonialsVariant = 'cards';
  let ctaVariant = 'default';
  
  if (s.includes('luxury') || s.includes('editorial')) {
    heroVariant = 'editorial';
    featuresVariant = 'minimal';
    galleryVariant = 'masonry';
    testimonialsVariant = 'editorial';
  } else if (s.includes('minimal')) {
    heroVariant = 'minimal';
    featuresVariant = 'minimal';
  } else if (s.includes('modern') || s.includes('bold')) {
    heroVariant = 'split';
    featuresVariant = 'list';
    ctaVariant = 'split';
  } else if (s.includes('cinematic') || s.includes('dark')) {
    heroVariant = 'centered';
    galleryVariant = 'masonry';
  }

  const sections: Section[] = [];
  const getImgs = (count: number) => getImagesForIndustry(industry, count);
  
  // Build sections dynamically based on content base
  if (contentBase.hero) {
    sections.push({ 
      id: generateId(), 
      type: 'hero', 
      content: { ...contentBase.hero, images: getImgs(1) }, 
      styleVariant: 'default',
      layoutVariant: heroVariant
    });
  }
  
  if (contentBase.features) {
    sections.push({ 
      id: generateId(), 
      type: 'features', 
      content: { ...contentBase.features, images: getImgs(1) }, 
      styleVariant: s.includes('luxury') ? 'default' : 'muted',
      layoutVariant: featuresVariant
    });
  }
  
  if (contentBase.gallery) {
    sections.push({ 
      id: generateId(), 
      type: 'gallery', 
      content: { ...contentBase.gallery, items: contentBase.gallery.items.map((i: any, idx: number) => ({ ...i, src: getImgs(6)[idx]?.src || i.src })) }, 
      styleVariant: 'default',
      layoutVariant: galleryVariant
    });
  }
  
  if (contentBase.pricing) {
    sections.push({ 
      id: generateId(), 
      type: 'pricing', 
      content: contentBase.pricing, 
      styleVariant: 'default',
      layoutVariant: 'cards'
    });
  }
  
  if (contentBase.testimonials) {
    sections.push({ 
      id: generateId(), 
      type: 'testimonials', 
      content: contentBase.testimonials, 
      styleVariant: 'primary',
      layoutVariant: testimonialsVariant
    });
  }
  
  // Always add CTA and Footer
  sections.push({ 
    id: generateId(), 
    type: 'cta', 
    content: {
      headline: "Ready to get started?",
      subheadline: "Join thousands of satisfied customers today.",
      primaryCTA: { label: "Start Now", url: "#" }
    }, 
    styleVariant: 'dark',
    layoutVariant: ctaVariant
  });
  
  sections.push({ 
    id: generateId(), 
    type: 'footer', 
    content: {
      headline: `${industry} Business`,
      paragraph: `© ${new Date().getFullYear()} ${industry} Business. All rights reserved.`
    } 
  });

  return {
    id: generateId(),
    name: `${industry} - ${style} Edition`,
    industry,
    style,
    theme,
    sections,
    createdAt: Date.now()
  };
};
