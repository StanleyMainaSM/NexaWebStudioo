import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Eye, Loader2, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { validateWebsiteSpecification } from '../lib/websiteCreation/generator';
import type { CreationProject, WebsiteSpecification } from '../lib/websiteCreation/types';
import WebsitePreviewRenderer from '../components/websiteCreation/WebsitePreviewRenderer';

type PreviewMode = 'desktop' | 'tablet' | 'mobile';

const widths: Record<PreviewMode, string> = {
  desktop: 'w-full',
  tablet: 'w-full max-w-[1024px]',
  mobile: 'w-full max-w-[430px]',
};

export default function CreationGeneratedPreview() {
  const { creationProjectId } = useParams<{ creationProjectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<CreationProject | null>(null);
  const [specification, setSpecification] = useState<WebsiteSpecification | null>(null);
  const [mode, setMode] = useState<PreviewMode>('desktop');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user?.id || !creationProjectId) {
        if (mounted) {
          setError('This generated website preview is unavailable.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');
      try {
        const projectResult = await supabase
          .from('creation_projects')
          .select('id,type,client_id,connector_id,operator_id,lead_id,project_id,business_id,title,business_info,requested_sections,selected_template_id,specification,attribution_enabled,public_preview_token,preview_enabled,status,created_at,updated_at,latest_generated_output_identity,latest_generated_output_version,latest_generated_at,generation_state,last_generation_error')
          .eq('id', creationProjectId)
          .eq('type', 'website')
          .maybeSingle();

        if (projectResult.error) throw projectResult.error;
        const loadedProject = projectResult.data as unknown as CreationProject | null;
        if (!loadedProject) throw new Error('This website project is unavailable or you do not have access to it.');
        if (!loadedProject.preview_enabled || loadedProject.generation_state !== 'current' || !loadedProject.latest_generated_output_identity) {
          throw new Error('This website does not have a current generated preview.');
        }

        const artifactResult = await supabase
          .from('creation_generated_website_outputs')
          .select('id,creation_project_id,output_identity,output_version,specification_identity,specification,template_id,generated_at,status,preview_path,created_at,updated_at')
          .eq('creation_project_id', loadedProject.id)
          .eq('id', loadedProject.latest_generated_output_identity)
          .maybeSingle();

        if (artifactResult.error) throw artifactResult.error;
        const artifact = artifactResult.data;
        if (!artifact || artifact.creation_project_id !== loadedProject.id || artifact.output_identity !== loadedProject.latest_generated_output_identity) {
          throw new Error('The current generated website artifact could not be found.');
        }
        if (!['generated', 'published'].includes(artifact.status)) {
          throw new Error('The current generated website artifact is unavailable.');
        }

        const persisted = artifact.specification as WebsiteSpecification;
        const validationErrors = validateWebsiteSpecification(persisted);
        if (validationErrors.length) throw new Error('The saved generated website contains invalid data and cannot be displayed.');
        if (persisted.template.id !== loadedProject.selected_template_id) {
          throw new Error('The saved generated website does not match the current project template.');
        }

        if (mounted) {
          setProject(loadedProject);
          setSpecification(persisted);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Unable to load the generated website preview.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, [creationProjectId, user?.id]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-accent-400" /></div>;
  }

  if (error || !project || !specification) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-6">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[.04] p-8 text-center">
          <AlertCircle className="mx-auto h-9 w-9 text-red-400" />
          <h1 className="mt-4 text-xl font-semibold text-white">Generated preview unavailable</h1>
          <p className="mt-2 text-sm text-gray-400">{error || 'This generated website is unavailable.'}</p>
          <button type="button" onClick={() => navigate('/portal/creation')} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-200 hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" /> Back to Website Projects
          </button>
        </div>
      </div>
    );
  }

  const publicPreviewUrl = project.public_preview_token && project.preview_enabled
    ? `/preview/${project.public_preview_token}/${project.latest_generated_output_identity}`
    : null;

  return (
    <div className="min-h-screen bg-slate-200">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => navigate('/portal/creation')} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" aria-label="Back to website projects">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-[.16em] text-slate-500">Generated website</p>
              <p className="truncate text-sm font-semibold text-slate-900">{specification.business.businessName}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="Preview viewport">
              <button type="button" onClick={() => setMode('desktop')} aria-label="Desktop preview" aria-pressed={mode === 'desktop'} className={`rounded-lg p-2 ${mode === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><Monitor className="h-4 w-4" /></button>
              <button type="button" onClick={() => setMode('tablet')} aria-label="Tablet preview" aria-pressed={mode === 'tablet'} className={`rounded-lg p-2 ${mode === 'tablet' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><Tablet className="h-4 w-4" /></button>
              <button type="button" onClick={() => setMode('mobile')} aria-label="Mobile preview" aria-pressed={mode === 'mobile'} className={`rounded-lg p-2 ${mode === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><Smartphone className="h-4 w-4" /></button>
            </div>
            {publicPreviewUrl && <a href={publicPreviewUrl} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"><Eye className="h-4 w-4" /> Public Preview</a>}
            <button type="button" onClick={() => navigate(`/portal/creation-studio/${project.id}`)} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:px-4">Return to Editor</button>
          </div>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-4rem)] justify-center p-0 sm:p-2 md:p-3">
        <div className={`${widths[mode]} min-h-[calc(100vh-4rem)] overflow-hidden bg-white shadow-2xl transition-[max-width] duration-200`}>
          <WebsitePreviewRenderer spec={specification} />
        </div>
      </main>
    </div>
  );
}
