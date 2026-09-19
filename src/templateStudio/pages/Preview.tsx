import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { TemplateRenderer } from '../components/template-engine/TemplateRenderer';
import EditorSidebar from '../components/editor/EditorSidebar';
import { Monitor, Tablet, Smartphone, Download, RefreshCw, ChevronLeft, Heart, Wand2 } from 'lucide-react';

type Viewport = 'desktop' | 'tablet' | 'mobile';

export default function Preview() {
  const navigate = useNavigate();
  const { currentTemplate, toggleFavorite, favorites, creationProjectId } = useAppStore();
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [isExporting, setIsExporting] = useState(false);

  if (!currentTemplate) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 flex-col gap-6">
        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
          <Wand2 className="h-10 w-10 text-brand-400" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No template selected</h2>
          <p className="text-slate-500 mb-6">You haven't generated or selected a template to preview yet.</p>
          <button 
            onClick={() => navigate('../wizard')} 
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
          >
            Create New Template <Wand2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const isFavorite = favorites.includes(currentTemplate.id);

  const getViewportWidth = () => {
    switch (viewport) {
      case 'mobile': return 'w-[375px]';
      case 'tablet': return 'w-[768px]';
      case 'desktop': return 'w-full';
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentTemplate, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${currentTemplate.name.replace(/\s+/g, '-').toLowerCase()}-export.json`);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-100 overflow-hidden font-sans">
      {/* Top Toolbar */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="mr-1 h-5 w-5" /> Back
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <span className="text-base font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg">{currentTemplate.name}</span>
        </div>
        
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-inner">
          <button onClick={() => setViewport('desktop')} className={`rounded-lg p-2 transition-all ${viewport === 'desktop' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-900'}`}>
            <Monitor className="h-5 w-5" />
          </button>
          <button onClick={() => setViewport('tablet')} className={`rounded-lg p-2 transition-all ${viewport === 'tablet' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-900'}`}>
            <Tablet className="h-5 w-5" />
          </button>
          <button onClick={() => setViewport('mobile')} className={`rounded-lg p-2 transition-all ${viewport === 'mobile' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-900'}`}>
            <Smartphone className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => toggleFavorite(currentTemplate.id)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${isFavorite ? 'border-red-200 bg-red-50 text-red-600 ring-1 ring-red-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-600' : ''}`} /> {isFavorite ? 'Saved' : 'Save'}
          </button>
          {creationProjectId && <button onClick={() => navigate('/portal/creation-studio/' + creationProjectId)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">Open Avelixa Editor</button>}
          <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-500/20 disabled:opacity-50">
            {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export JSON
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-[#e2e8f0] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          <div 
            className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${getViewportWidth()} bg-white shadow-2xl overflow-hidden ring-1 ring-slate-900/5 ${viewport !== 'desktop' ? 'rounded-[2rem] my-4 max-h-full border-8 border-slate-900' : ''}`} 
            style={{ minHeight: viewport === 'desktop' ? '100%' : 'auto' }}
          >
            {viewport !== 'desktop' && (
               <div className="h-6 w-full bg-slate-900 flex justify-center items-center">
                 <div className="w-16 h-4 bg-slate-800 rounded-b-xl"></div>
               </div>
            )}
            <div className={`overflow-y-auto h-full ${viewport !== 'desktop' ? 'pb-6' : ''}`}>
               <TemplateRenderer template={currentTemplate} />
            </div>
          </div>
        </div>

        {/* Editor Sidebar */}
        <EditorSidebar />

      </div>
    </div>
  );
}
