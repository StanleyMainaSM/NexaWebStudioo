import { useState } from 'react';
import { useAppStore } from '../../store';
import { Settings2, Type, Palette, Layout, AlignLeft, ChevronDown, ChevronRight } from 'lucide-react';
import type { Theme } from '../../types';

export default function EditorSidebar() {
  const { currentTemplate, updateTemplateTheme, updateSectionContent } = useAppStore();
  const [activeTab, setActiveTab] = useState<'theme' | 'typography' | 'content'>('theme');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!currentTemplate) return null;
  const { theme } = currentTemplate;

  const handleThemeChange = (key: keyof Theme, value: string) => {
    updateTemplateTheme({ [key]: value });
  };

  const handleContentChange = (sectionId: string, field: string, value: string) => {
    const section = currentTemplate.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    // Deep clone content to update
    const newContent = JSON.parse(JSON.stringify(section.content));
    
    // Handle nested fields like primaryCTA.label
    if (field.includes('.')) {
      const parts = field.split('.');
      if (parts.length === 2 && newContent[parts[0]]) {
        newContent[parts[0]][parts[1]] = value;
      }
    } else {
      newContent[field] = value;
    }
    
    updateSectionContent(sectionId, newContent);
  };

  return (
    <div className="w-80 bg-white border-l border-zinc-200 h-full flex flex-col shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20">
      <div className="p-4 border-b border-zinc-200 shrink-0">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Settings2 className="h-5 w-5" /> Editor
        </h3>
      </div>
      
      <div className="flex border-b border-zinc-200 shrink-0 bg-slate-50/50">
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'theme' ? 'border-brand-600 text-brand-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <span className="flex items-center justify-center gap-2"><Palette className="h-4 w-4" /> Colors</span>
        </button>
        <button
          onClick={() => setActiveTab('typography')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'typography' ? 'border-brand-600 text-brand-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <span className="flex items-center justify-center gap-2"><Type className="h-4 w-4" /> Type</span>
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'content' ? 'border-brand-600 text-brand-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <span className="flex items-center justify-center gap-2"><AlignLeft className="h-4 w-4" /> Content</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {activeTab === 'theme' && (
          <div className="space-y-5">
            {[
              { label: 'Primary Color', key: 'primary' },
              { label: 'Secondary Color', key: 'secondary' },
              { label: 'Accent Color', key: 'accent' },
              { label: 'Background Color', key: 'background' },
              { label: 'Text Color', key: 'text' }
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
                <div className="flex gap-2">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0">
                    <input type="color" value={theme[key as keyof Theme]} onChange={(e) => handleThemeChange(key as keyof Theme, e.target.value)} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                  </div>
                  <input type="text" value={theme[key as keyof Theme]} onChange={(e) => handleThemeChange(key as keyof Theme, e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 text-sm uppercase font-mono focus:ring-1 focus:ring-brand-500 focus:border-brand-500" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Type className="h-4 w-4 text-slate-400" /> Font Family
              </label>
              <select
                value={theme.fontFamily}
                onChange={(e) => handleThemeChange('fontFamily', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value='"Inter", sans-serif'>Inter (Modern)</option>
                <option value='"Playfair Display", serif'>Playfair Display (Luxury)</option>
                <option value='"Space Grotesk", sans-serif'>Space Grotesk (Minimal)</option>
                <option value='"Outfit", sans-serif'>Outfit (Bold)</option>
                <option value='"Cormorant Garamond", serif'>Cormorant (Editorial)</option>
                <option value='"Quicksand", sans-serif'>Quicksand (Playful)</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Layout className="h-4 w-4 text-slate-400" /> Border Radius
              </label>
              <select
                value={theme.borderRadius}
                onChange={(e) => handleThemeChange('borderRadius', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
              >
                <option value="0px">Sharp (0px)</option>
                <option value="0.125rem">Minimal (2px)</option>
                <option value="0.25rem">Small (4px)</option>
                <option value="0.5rem">Medium (8px)</option>
                <option value="0.75rem">Large (12px)</option>
                <option value="1rem">X-Large (16px)</option>
                <option value="2rem">Massive (32px)</option>
                <option value="9999px">Pill</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-4">
            {currentTemplate.sections.map(section => (
              <div key={section.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <span className="font-bold text-sm text-slate-800 capitalize">{section.type} Section</span>
                  {expandedSection === section.id ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                </button>
                
                {expandedSection === section.id && (
                  <div className="p-4 space-y-4 border-t border-slate-100">
                    {section.content.headline !== undefined && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Headline</label>
                        <input 
                          type="text" 
                          value={section.content.headline} 
                          onChange={(e) => handleContentChange(section.id, 'headline', e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    )}
                    {section.content.subheadline !== undefined && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Subheadline</label>
                        <textarea 
                          value={section.content.subheadline} 
                          onChange={(e) => handleContentChange(section.id, 'subheadline', e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 min-h-[60px] resize-none"
                        />
                      </div>
                    )}
                    {section.content.paragraph !== undefined && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Paragraph</label>
                        <textarea 
                          value={section.content.paragraph} 
                          onChange={(e) => handleContentChange(section.id, 'paragraph', e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500 min-h-[60px] resize-none"
                        />
                      </div>
                    )}
                    {section.content.primaryCTA !== undefined && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Primary Button</label>
                        <input 
                          type="text" 
                          value={section.content.primaryCTA.label} 
                          onChange={(e) => handleContentChange(section.id, 'primaryCTA.label', e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    )}
                    {section.content.secondaryCTA !== undefined && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Secondary Button</label>
                        <input 
                          type="text" 
                          value={section.content.secondaryCTA.label} 
                          onChange={(e) => handleContentChange(section.id, 'secondaryCTA.label', e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
