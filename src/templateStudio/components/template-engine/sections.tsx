import React, { useState } from 'react';
import { Section, Theme } from '../../types';

interface SectionProps {
  key?: React.Key;
  section: Section;
  theme: Theme;
}

// Check if background is dark
const isDark = (bg: string) => {
  return bg === '#09090b' || bg === '#000000' || bg === '#0f172a' || bg === '#020617' || bg === '#18181b';
};

// Safe Image Component to prevent broken image icons
function SafeImage({ src, alt, className, style }: { src: string, alt: string, className?: string, style?: React.CSSProperties }) {
  const [error, setError] = useState(false);
  
  if (error || !src) {
    return (
      <div 
        className={`flex items-center justify-center bg-slate-100 ${className || ''}`} 
        style={{ ...style, minHeight: '200px' }}
      >
        <span className="text-slate-400 font-medium text-sm tracking-widest uppercase opacity-50 px-4 text-center">
          {alt || 'Image'}
        </span>
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      style={style} 
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

export function HeroSection({ section, theme }: SectionProps) {
  const { headline, subheadline, primaryCTA, secondaryCTA, images } = section.content;
  const variant = section.layoutVariant || 'default';
  
  // Minimal variant (no images, purely typographic)
  if (variant === 'minimal') {
    return (
      <section className="relative min-h-[70vh] flex flex-col justify-center items-center text-center px-4 py-24 sm:px-6 lg:px-8" style={{ backgroundColor: theme.background }}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]" style={{ color: theme.text, fontFamily: theme.fontFamily }}>
            {headline}
          </h1>
          <p className="text-xl sm:text-2xl mb-12 opacity-80 leading-relaxed max-w-2xl mx-auto" style={{ color: theme.text }}>
            {subheadline}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-5">
            {primaryCTA && (
              <a href={primaryCTA.url} className="px-10 py-4 font-bold transition-transform hover:-translate-y-1" style={{ backgroundColor: theme.primary, color: '#fff', borderRadius: theme.borderRadius }}>
                {primaryCTA.label}
              </a>
            )}
            {secondaryCTA && (
              <a href={secondaryCTA.url} className="px-10 py-4 font-bold transition-transform hover:-translate-y-1" style={{ backgroundColor: 'transparent', color: theme.text, border: `2px solid ${theme.text}`, borderRadius: theme.borderRadius }}>
                {secondaryCTA.label}
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Editorial variant (Asymmetric, bold)
  if (variant === 'editorial') {
    return (
      <section className="relative min-h-[90vh] flex flex-col justify-center px-4 py-24 sm:px-6 lg:px-12 overflow-hidden" style={{ backgroundColor: theme.background }}>
        <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 z-10">
            <h1 className="text-6xl sm:text-8xl font-black uppercase tracking-tighter mb-6 leading-[0.9]" style={{ color: theme.text, fontFamily: theme.fontFamily }}>
              {headline}
            </h1>
            <div className="pl-0 md:pl-12 border-l-4 mt-8" style={{ borderColor: theme.primary }}>
              <p className="text-xl sm:text-2xl mb-10 opacity-90 leading-relaxed max-w-xl" style={{ color: theme.text }}>
                {subheadline}
              </p>
              <div className="flex flex-col sm:flex-row gap-5">
                {primaryCTA && (
                  <a href={primaryCTA.url} className="px-10 py-5 font-bold transition-colors shadow-xl inline-flex items-center justify-center" style={{ backgroundColor: theme.primary, color: '#fff', borderRadius: theme.borderRadius }}>
                    {primaryCTA.label}
                  </a>
                )}
              </div>
            </div>
          </div>
          {images && images.length > 0 && (
            <div className="md:col-span-5 relative mt-12 md:mt-0">
               <div className="absolute inset-0 translate-x-4 translate-y-4" style={{ backgroundColor: theme.primary, borderRadius: theme.borderRadius }}></div>
               <SafeImage src={images[0].src} alt={images[0].alt} className="relative z-10 w-full h-[600px] object-cover grayscale hover:grayscale-0 transition-all duration-700 shadow-2xl" style={{ borderRadius: theme.borderRadius }} />
            </div>
          )}
        </div>
      </section>
    );
  }

  // Centered/Full bleed variant
  if (variant === 'centered' && images && images.length > 0) {
    return (
      <section className="relative min-h-[90vh] flex items-center justify-center text-center overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <SafeImage src={images[0].src} alt={images[0].alt} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-32 sm:px-6 lg:px-8">
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 text-white leading-tight drop-shadow-lg" style={{ fontFamily: theme.fontFamily }}>
            {headline}
          </h1>
          <p className="text-xl sm:text-2xl mb-10 text-white/90 max-w-2xl mx-auto font-medium drop-shadow-md">
            {subheadline}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-5">
            {primaryCTA && (
              <a href={primaryCTA.url} className="px-10 py-5 font-bold transition-all hover:bg-white hover:text-black shadow-2xl" style={{ backgroundColor: theme.primary, color: '#fff', borderRadius: theme.borderRadius }}>
                {primaryCTA.label}
              </a>
            )}
            {secondaryCTA && (
              <a href={secondaryCTA.url} className="px-10 py-5 font-bold transition-colors bg-white/10 hover:bg-white/20 text-white backdrop-blur-md shadow-2xl" style={{ border: `1px solid rgba(255,255,255,0.3)`, borderRadius: theme.borderRadius }}>
                {secondaryCTA.label}
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Default Split Variant
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ backgroundColor: theme.background }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-32 pb-20 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-left">
          <h1 
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]" 
            style={{ color: theme.text, fontFamily: theme.fontFamily }}
          >
            {headline}
          </h1>
          <p className="text-xl sm:text-2xl mb-10 opacity-80 leading-relaxed max-w-2xl" style={{ color: theme.text }}>
            {subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-5">
            {primaryCTA && (
              <a href={primaryCTA.url} className="px-10 py-5 font-bold transition-transform hover:scale-105 text-center shadow-2xl flex items-center justify-center gap-2" style={{ backgroundColor: theme.primary, color: '#fff', borderRadius: theme.borderRadius }}>
                {primaryCTA.label}
              </a>
            )}
            {secondaryCTA && (
              <a href={secondaryCTA.url} className="px-10 py-5 font-bold transition-colors hover:opacity-80 text-center flex items-center justify-center" style={{ backgroundColor: 'transparent', color: theme.text, border: `2px solid ${theme.text}`, borderRadius: theme.borderRadius }}>
                {secondaryCTA.label}
              </a>
            )}
          </div>
        </div>
        
        {images && images.length > 0 && (
          <div className="flex-1 hidden lg:block relative w-full h-[600px]">
             <div className="absolute inset-0 -ml-8 mt-8 bg-opacity-20 rounded-3xl" style={{ backgroundColor: theme.secondary }}></div>
             <SafeImage src={images[0].src} alt={images[0].alt} className="absolute inset-0 w-full h-full object-cover shadow-2xl" style={{ borderRadius: theme.borderRadius }} />
          </div>
        )}
      </div>
    </section>
  );
}

export function FeaturesSection({ section, theme }: SectionProps) {
  const { headline, subheadline, items, images } = section.content;
  const variant = section.layoutVariant || 'grid';
  
  const bg = section.styleVariant === 'muted' ? theme.secondary : theme.background;
  const isDarkBg = isDark(bg);
  const textColor = isDarkBg ? '#fff' : theme.text;
  const cardBg = section.styleVariant === 'muted' 
    ? (isDarkBg ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') 
    : (isDarkBg ? '#18181b' : '#ffffff');

  // List Variant (Side by side)
  if (variant === 'list' && images && images.length > 0) {
    return (
      <section className="py-24 sm:py-32 overflow-hidden" style={{ backgroundColor: bg }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {subheadline && <span className="inline-block py-1 px-3 rounded-full text-sm font-bold tracking-wider uppercase mb-6" style={{ backgroundColor: `${theme.accent}33`, color: theme.accent }}>{subheadline}</span>}
              <h2 className="text-4xl sm:text-5xl font-bold mb-12 leading-tight" style={{ color: textColor, fontFamily: theme.fontFamily }}>{headline}</h2>
              
              <div className="space-y-10">
                {items?.map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${theme.primary}22`, color: theme.primary }}>
                       <span className="text-xl font-bold font-mono">0{i+1}</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2" style={{ color: textColor, fontFamily: theme.fontFamily }}>{item.title}</h3>
                      <p className="text-lg opacity-80 leading-relaxed" style={{ color: textColor }}>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr opacity-20 blur-3xl rounded-full" style={{ from: theme.primary, to: theme.accent } as any} />
              <SafeImage src={images[0].src} alt="Features" className="relative z-10 w-full h-[700px] object-cover shadow-2xl" style={{ borderRadius: theme.borderRadius }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Minimal Variant
  if (variant === 'minimal') {
    return (
      <section className="py-24 sm:py-32" style={{ backgroundColor: bg }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-20">
            <h2 className="text-4xl sm:text-6xl font-bold mb-6 leading-tight" style={{ color: textColor, fontFamily: theme.fontFamily }}>{headline}</h2>
            {subheadline && <p className="text-xl opacity-80 max-w-2xl" style={{ color: textColor }}>{subheadline}</p>}
          </div>
          
          <div className="space-y-0 border-t" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
            {items?.map((item, i) => (
              <div key={i} className="py-12 border-b flex flex-col md:flex-row gap-6 md:gap-16 group transition-colors hover:bg-black/5" style={{ borderColor: isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <div className="w-12 text-2xl font-light opacity-50" style={{ color: textColor }}>0{i+1}</div>
                <div className="flex-1">
                  <h3 className="text-3xl font-bold mb-4" style={{ color: textColor, fontFamily: theme.fontFamily }}>{item.title}</h3>
                </div>
                <div className="flex-1">
                  <p className="text-lg opacity-80 leading-relaxed" style={{ color: textColor }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default Grid Variant
  return (
    <section className="py-24 sm:py-32" style={{ backgroundColor: bg }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          {subheadline && <span className="inline-block py-1 px-3 rounded-full text-sm font-bold tracking-wider uppercase mb-6" style={{ backgroundColor: `${theme.accent}33`, color: theme.accent }}>{subheadline}</span>}
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight" style={{ color: textColor, fontFamily: theme.fontFamily }}>{headline}</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {items?.map((item, i) => (
            <div key={i} className="p-10 transition-transform hover:-translate-y-2 duration-300" style={{ backgroundColor: cardBg, borderRadius: theme.borderRadius, border: section.styleVariant === 'muted' ? 'none' : `1px solid ${isDarkBg ? '#27272a' : '#e5e7eb'}`, boxShadow: section.styleVariant === 'muted' ? 'none' : '0 20px 40px -15px rgba(0,0,0,0.05)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8" style={{ backgroundColor: `${theme.primary}22`, color: theme.primary }}>
                 <span className="text-2xl font-bold font-mono">0{i+1}</span>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{ color: textColor, fontFamily: theme.fontFamily }}>{item.title}</h3>
              <p className="text-lg opacity-80 leading-relaxed" style={{ color: textColor }}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GallerySection({ section, theme }: SectionProps) {
  const { headline, items } = section.content;
  const variant = section.layoutVariant || 'grid';
  
  if (variant === 'masonry') {
    return (
      <section className="py-24 sm:py-32" style={{ backgroundColor: theme.background }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-black mb-16 text-center uppercase tracking-tight" style={{ color: theme.text, fontFamily: theme.fontFamily }}>{headline}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {items?.map((item, i) => (
              <div key={i} className={`group relative overflow-hidden ${i === 0 || i === 3 ? 'md:col-span-2 aspect-[21/9]' : 'aspect-square'}`} style={{ borderRadius: theme.borderRadius }}>
                <SafeImage src={item.src} alt={item.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                  <h3 className="text-3xl font-bold text-white tracking-widest uppercase">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default Grid
  return (
    <section className="py-24 sm:py-32" style={{ backgroundColor: theme.secondary }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <h2 className="text-4xl sm:text-5xl font-bold" style={{ color: theme.text, fontFamily: theme.fontFamily }}>{headline}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items?.map((item, i) => (
            <div key={i} className="group relative overflow-hidden aspect-[4/5] shadow-xl" style={{ borderRadius: theme.borderRadius }}>
              <SafeImage src={item.src} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection({ section, theme }: SectionProps) {
  const { headline, items } = section.content;
  const variant = section.layoutVariant || 'cards';
  
  if (variant === 'editorial') {
    return (
      <section className="py-32" style={{ backgroundColor: theme.background }}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-sm font-bold tracking-widest uppercase mb-16 opacity-50" style={{ color: theme.text }}>{headline}</h2>
          <div className="space-y-32">
            {items?.map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-16 text-9xl opacity-5" style={{ color: theme.text }}>"</div>
                <p className="text-3xl sm:text-5xl font-medium mb-12 leading-tight" style={{ color: theme.text, fontFamily: theme.fontFamily }}>{item.quote}</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-12 opacity-30" style={{ backgroundColor: theme.text }}></div>
                  <div>
                    <p className="font-bold text-lg uppercase tracking-wide" style={{ color: theme.text }}>{item.author}</p>
                    <p className="opacity-60 text-sm" style={{ color: theme.text }}>{item.role}</p>
                  </div>
                  <div className="h-px w-12 opacity-30" style={{ backgroundColor: theme.text }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default Cards
  return (
    <section className="py-32 relative overflow-hidden" style={{ backgroundColor: theme.primary }}>
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: theme.accent }}></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: theme.secondary }}></div>
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <h2 className="text-4xl sm:text-5xl font-bold text-center mb-20" style={{ color: '#fff', fontFamily: theme.fontFamily }}>{headline}</h2>
        <div className="grid md:grid-cols-2 gap-12">
          {items?.map((item, i) => (
            <div key={i} className="p-12 bg-white/10 backdrop-blur-xl border border-white/20" style={{ borderRadius: theme.borderRadius }}>
              <div className="text-5xl text-white/20 font-serif mb-6 leading-none">"</div>
              <p className="text-2xl sm:text-3xl text-white font-medium mb-10 leading-snug" style={{ fontFamily: theme.fontFamily }}>{item.quote}</p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">{item.author.charAt(0)}</div>
                <div>
                  <p className="text-white font-bold text-lg">{item.author}</p>
                  <p className="text-white/70">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingSection({ section, theme }: SectionProps) {
  const { headline, items } = section.content;
  return (
    <section className="py-24 sm:py-32" style={{ backgroundColor: theme.background }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl sm:text-5xl font-bold text-center mb-20" style={{ color: theme.text, fontFamily: theme.fontFamily }}>{headline}</h2>
        <div className="grid md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
          {items?.map((item, i) => {
            const isFeatured = i === 1; // Middle item is featured
            return (
              <div key={i} className={`p-10 flex flex-col ${isFeatured ? 'py-14 shadow-2xl scale-105 z-10 border-2' : 'shadow-xl border border-black/5'}`} style={{ 
                backgroundColor: isFeatured ? theme.background : (isDark(theme.background) ? '#18181b' : '#ffffff'), 
                borderColor: isFeatured ? theme.primary : 'transparent',
                borderRadius: theme.borderRadius,
                color: theme.text
              }}>
                <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: theme.fontFamily }}>{item.title}</h3>
                <div className="mb-6">
                  <span className="text-5xl font-extrabold">{item.price}</span>
                  {item.price !== 'Custom' && <span className="opacity-70">/month</span>}
                </div>
                <p className="opacity-80 mb-8 min-h-[3rem]">{item.description}</p>
                <div className="flex-1 space-y-4 mb-10">
                  {item.features?.map((f: string, fi: number) => (
                    <div key={fi} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${theme.primary}33`, color: theme.primary }}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                      </div>
                      <span className="opacity-90">{f}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full py-4 font-bold transition-transform hover:-translate-y-1" style={{ 
                  backgroundColor: isFeatured ? theme.primary : theme.secondary, 
                  color: isFeatured ? '#fff' : theme.text,
                  borderRadius: theme.borderRadius 
                }}>
                  Get Started
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CTASection({ section, theme }: SectionProps) {
  const { headline, subheadline, primaryCTA } = section.content;
  const variant = section.layoutVariant || 'default';
  
  if (variant === 'split') {
     return (
      <section className="py-24" style={{ backgroundColor: theme.primary }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6" style={{ fontFamily: theme.fontFamily }}>{headline}</h2>
            <p className="text-xl text-white/80 max-w-xl mx-auto md:mx-0">{subheadline}</p>
          </div>
          <div className="shrink-0">
            {primaryCTA && (
              <a href={primaryCTA.url} className="inline-block px-12 py-6 font-bold bg-white text-lg transition-transform hover:scale-105 shadow-xl" style={{ color: theme.primary, borderRadius: theme.borderRadius }}>
                {primaryCTA.label}
              </a>
            )}
          </div>
        </div>
      </section>
     );
  }
  
  return (
    <section className="py-32" style={{ backgroundColor: theme.background }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="p-16 sm:p-24 text-center shadow-2xl relative overflow-hidden" style={{ backgroundColor: theme.primary, borderRadius: theme.borderRadius }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <h2 className="text-4xl sm:text-6xl font-bold text-white mb-6 relative z-10 leading-tight" style={{ fontFamily: theme.fontFamily }}>{headline}</h2>
          <p className="text-xl sm:text-2xl text-white/80 mb-12 relative z-10 max-w-2xl mx-auto">{subheadline}</p>
          {primaryCTA && (
            <a href={primaryCTA.url} className="inline-block px-12 py-5 font-bold bg-white text-lg transition-transform hover:scale-105 relative z-10 shadow-xl" style={{ color: theme.primary, borderRadius: theme.borderRadius }}>
              {primaryCTA.label}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function FooterSection({ section, theme }: SectionProps) {
  const { headline, paragraph } = section.content;
  const isDarkBg = isDark(theme.background);
  const borderColor = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  
  return (
    <footer className="py-16 sm:py-24 border-t" style={{ backgroundColor: theme.background, borderColor }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-12 text-center md:text-left">
        <div className="md:col-span-2">
          <span className="text-3xl font-extrabold tracking-tight mb-6 block" style={{ color: theme.text, fontFamily: theme.fontFamily }}>{headline}</span>
          <p className="opacity-60 text-lg max-w-md mx-auto md:mx-0 leading-relaxed" style={{ color: theme.text }}>{paragraph}</p>
        </div>
        <div>
          <h4 className="font-bold mb-6 tracking-wider uppercase text-sm" style={{ color: theme.text }}>Company</h4>
          <ul className="space-y-4">
            <li><a href="#" className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: theme.text }}>About Us</a></li>
            <li><a href="#" className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: theme.text }}>Careers</a></li>
            <li><a href="#" className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: theme.text }}>News</a></li>
            <li><a href="#" className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: theme.text }}>Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-6 tracking-wider uppercase text-sm" style={{ color: theme.text }}>Legal</h4>
          <ul className="space-y-4">
            <li><a href="#" className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: theme.text }}>Privacy Policy</a></li>
            <li><a href="#" className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: theme.text }}>Terms of Service</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
