import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useState } from 'react';
import type { WebsiteSpecification } from '../../lib/websiteCreation/types';
import WebsitePreviewRenderer from './WebsitePreviewRenderer';

type PreviewMode = 'desktop' | 'tablet' | 'mobile';

const widths: Record<PreviewMode, string> = {
  desktop: 'w-full',
  tablet: 'w-full max-w-[768px]',
  mobile: 'w-full max-w-[390px]',
};

export default function GeneratedWebsitePreview({ specification, published = false }: { specification: WebsiteSpecification; published?: boolean }) {
  const [mode, setMode] = useState<PreviewMode>('desktop');

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="sticky top-0 z-20 border-b border-black/10 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">{published ? 'Published website' : 'Generated website'}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{specification.business.businessName}</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="Preview viewport">
            <button type="button" onClick={() => setMode('desktop')} aria-label="Desktop preview" aria-pressed={mode === 'desktop'} className={`rounded-lg p-2 ${mode === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Monitor className="h-4 w-4" /></button>
            <button type="button" onClick={() => setMode('tablet')} aria-label="Tablet preview" aria-pressed={mode === 'tablet'} className={`rounded-lg p-2 ${mode === 'tablet' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Tablet className="h-4 w-4" /></button>
            <button type="button" onClick={() => setMode('mobile')} aria-label="Mobile preview" aria-pressed={mode === 'mobile'} className={`rounded-lg p-2 ${mode === 'mobile' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><Smartphone className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
      <main className="mx-auto flex max-w-7xl justify-center px-3 py-5 md:px-6 md:py-8">
        <div className={`${widths[mode]} overflow-hidden rounded-[2rem] shadow-2xl transition-[max-width] duration-200`}>
          <WebsitePreviewRenderer spec={specification} />
        </div>
      </main>
    </div>
  );
}
