import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FilePlus2, Globe2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import type { CreationProject, WebsiteTemplate } from '../../lib/websiteCreation/types';

const emptyBusiness = { businessName: '', industry: '', businessDescription: '' };

type ProjectRow = CreationProject & { template?: WebsiteTemplate | null };

function businessName(project: CreationProject) {
  return project.business_info?.businessName || project.title || 'Untitled website';
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export default function WebsiteCreationProjects() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [business, setBusiness] = useState(emptyBusiness);

  const normalizedRoles = useMemo(() => roles.map((role) => String(role).trim().toLowerCase()), [roles]);
  const canCreate = normalizedRoles.some((role) => ['owner', 'admin', 'client', 'connector'].includes(role));

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    const [projectResult, templateResult] = await Promise.all([
      supabase
        .from('creation_projects')
        .select('id,type,client_id,connector_id,operator_id,lead_id,project_id,business_id,title,business_info,requested_sections,selected_template_id,specification,attribution_enabled,public_preview_token,preview_enabled,status,created_at,updated_at')
        .eq('type', 'website')
        .order('updated_at', { ascending: false }),
      supabase
        .from('website_templates')
        .select('id,slug,name,description,categories,visual_style,sections,typography,color_direction,layout,preview,is_active,is_protected')
        .eq('is_active', true)
        .order('name'),
    ]);

    if (projectResult.error) {
      setError('Unable to load your website projects. Please refresh and try again.');
      setProjects([]);
    } else {
      const templateMap = new Map(((templateResult.data || []) as unknown as WebsiteTemplate[]).map((template) => [template.id, template]));
      setProjects(((projectResult.data || []) as unknown as CreationProject[]).map((project) => ({ ...project, template: project.selected_template_id ? templateMap.get(project.selected_template_id) || null : null })));
    }
    if (templateResult.error) setError('Unable to load website templates. Please refresh and try again.');
    else setTemplates((templateResult.data || []) as unknown as WebsiteTemplate[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [user?.id]);

  async function createProject() {
    if (!user?.id) return;
    const cleanBusinessName = business.businessName.trim();
    if (!cleanBusinessName) {
      setError('Enter the business name before creating the website project.');
      return;
    }
    setCreating(true);
    setError('');
    const connectorId = normalizedRoles.includes('connector') && !normalizedRoles.includes('client') ? user.id : null;
    const clientId = normalizedRoles.includes('client') && !normalizedRoles.includes('connector') ? user.id : null;
    const result = await supabase.rpc('create_creation_project', {
      p_type: 'website',
      p_title: title.trim() || `${cleanBusinessName} Website`,
      p_client_id: clientId,
      p_connector_id: connectorId,
      p_lead_id: null,
      p_business_id: null,
      p_project_id: null,
      p_business_info: { ...emptyBusiness, ...business, businessName: cleanBusinessName },
      p_requested_sections: [],
    });
    if (result.error) {
      setError(result.error.message || 'Unable to create the website project.');
      setCreating(false);
      return;
    }
    setCreating(false);
    setShowCreate(false);
    navigate(`/portal/creation-studio/${result.data}`);
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center text-gray-400"><Loader2 className="mr-3 h-6 w-6 animate-spin" />Loading Website Creation...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-accent-400"><Sparkles className="h-4 w-4" />Website Creation</div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Your website projects</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">Create, edit, preview, and return to saved website concepts from one workspace.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5"><RefreshCw className="h-4 w-4" />Refresh</button>
          {canCreate && <button type="button" onClick={() => { setError(''); setShowCreate(true); }} className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-ink-950 hover:bg-accent-400"><FilePlus2 className="h-4 w-4" />Create Website</button>}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
          <Globe2 className="mx-auto h-10 w-10 text-accent-400" />
          <h2 className="mt-4 text-xl font-semibold text-white">No website projects yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">Start a website concept and it will remain available here when you come back.</p>
          {canCreate && <button type="button" onClick={() => setShowCreate(true)} className="mt-6 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-accent-400">Create your first website</button>}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {projects.map((project) => (
            <article key={project.id} className="rounded-3xl border border-white/10 bg-white/[.03] p-6 transition hover:border-accent-500/20 hover:bg-white/[.04]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-400"><Globe2 className="h-4 w-4" />Website</div>
                  <h2 className="mt-3 truncate text-xl font-semibold text-white">{businessName(project)}</h2>
                  <p className="mt-1 truncate text-sm text-gray-500">{project.title}</p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold capitalize text-gray-300">{statusLabel(project.status)}</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/5 bg-black/10 p-3"><div className="text-[10px] uppercase tracking-widest text-gray-600">Template</div><div className="mt-1 truncate text-sm text-gray-300">{project.template?.name || 'Not selected'}</div></div>
                <div className="rounded-2xl border border-white/5 bg-black/10 p-3"><div className="text-[10px] uppercase tracking-widest text-gray-600">Preview</div><div className="mt-1 text-sm text-gray-300">{project.preview_enabled ? 'Available' : 'Not generated'}</div></div>
                <div className="rounded-2xl border border-white/5 bg-black/10 p-3"><div className="text-[10px] uppercase tracking-widest text-gray-600">Updated</div><div className="mt-1 text-sm text-gray-300">{new Date(project.updated_at).toLocaleDateString()}</div></div>
              </div>
              <button type="button" onClick={() => navigate(`/portal/creation-studio/${project.id}`)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-200 hover:border-accent-500/30 hover:bg-accent-500/5 hover:text-accent-300">Open in Template Studio <ArrowRight className="h-4 w-4" /></button>
            </article>
          ))}
        </div>
      )}

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-website-title">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-widest text-accent-400">New website</div><h2 id="create-website-title" className="mt-2 text-2xl font-semibold text-white">Start a website project</h2><p className="mt-2 text-sm text-gray-500">Only the minimum information is needed to create the saved workspace.</p></div><button type="button" onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-white">Close</button></div>
          <div className="mt-6 space-y-4">
            <label className="block text-sm"><span className="mb-1.5 block text-gray-400">Business name *</span><input autoFocus value={business.businessName} onChange={(event) => setBusiness((current) => ({ ...current, businessName: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white outline-none focus:border-accent-500/50" placeholder="e.g. Acme Studio" /></label>
            <label className="block text-sm"><span className="mb-1.5 block text-gray-400">Project title</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white outline-none focus:border-accent-500/50" placeholder="e.g. Acme Studio Website" /></label>
            <label className="block text-sm"><span className="mb-1.5 block text-gray-400">Industry</span><input value={business.industry} onChange={(event) => setBusiness((current) => ({ ...current, industry: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white outline-none focus:border-accent-500/50" placeholder="e.g. Professional services" /></label>
            <label className="block text-sm"><span className="mb-1.5 block text-gray-400">Short description</span><textarea rows={3} value={business.businessDescription} onChange={(event) => setBusiness((current) => ({ ...current, businessDescription: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-3 text-white outline-none focus:border-accent-500/50" placeholder="What does the business do?" /></label>
          </div>
          <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5">Cancel</button><button type="button" onClick={() => void createProject()} disabled={creating} className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-accent-400 disabled:opacity-50">{creating && <Loader2 className="h-4 w-4 animate-spin" />}{creating ? 'Creating…' : 'Create Website'}</button></div>
        </div>
      </div>}

      {templates.length === 0 && <p className="text-xs text-gray-600">Templates are currently unavailable. Existing saved projects can still be opened.</p>}
    </div>
  );
}
