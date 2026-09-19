import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { Heart, ArrowRight } from 'lucide-react';

export default function Favorites() {
  const navigate = useNavigate();
  const { templates, favorites, setCurrentTemplate, toggleFavorite } = useAppStore();

  const favoriteTemplates = templates.filter(t => favorites.includes(t.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 min-h-[80vh]">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Favorites</h1>
        <p className="text-lg text-slate-500">Your saved AI-generated templates.</p>
      </div>

      {favoriteTemplates.length === 0 ? (
        <div className="text-center py-32 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
          <Heart className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No favorites yet</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">Templates you save will appear here for easy access later.</p>
          <button onClick={() => navigate('../gallery')} className="inline-flex h-12 items-center justify-center rounded-full bg-brand-600 px-8 font-bold text-white transition-all hover:bg-brand-700 hover:scale-105 shadow-lg shadow-brand-500/20">
            Browse Gallery
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {favoriteTemplates.map(template => (
            <div key={template.id} className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 relative shadow-sm">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFavorite(template.id); }}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur hover:bg-white transition-colors"
              >
                <Heart className="h-5 w-5 fill-red-500 text-red-500" />
              </button>
              
              {/* Thumbnail generator */}
              <div 
                className="h-56 w-full p-6 relative overflow-hidden flex flex-col cursor-pointer"
                style={{ backgroundColor: template.theme.background }}
                onClick={() => {
                  setCurrentTemplate(template);
                  navigate('../preview');
                }}
              >
                {/* Simulated UI content */}
                <div className="w-full flex justify-between items-center mb-8">
                  <div className="w-8 h-8 rounded-full opacity-80" style={{ backgroundColor: template.theme.primary }} />
                  <div className="flex gap-2">
                    <div className="w-8 h-2 rounded-full opacity-20" style={{ backgroundColor: template.theme.text }} />
                    <div className="w-8 h-2 rounded-full opacity-20" style={{ backgroundColor: template.theme.text }} />
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-center max-w-[80%]">
                   <div className="w-full h-4 rounded-full opacity-80 mb-3" style={{ backgroundColor: template.theme.text }} />
                   <div className="w-3/4 h-4 rounded-full opacity-80 mb-6" style={{ backgroundColor: template.theme.text }} />
                   <div className="w-24 h-8 rounded-full opacity-90 shadow-sm" style={{ backgroundColor: template.theme.primary }} />
                </div>
                
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 bg-white text-slate-900 px-6 py-2.5 rounded-full font-bold shadow-xl flex items-center gap-2">
                    Open Editor <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-3 truncate">{template.name}</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold tracking-wide uppercase">{template.industry}</span>
                  <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold tracking-wide uppercase">{template.style}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
